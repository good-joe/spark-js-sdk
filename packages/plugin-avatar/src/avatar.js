/**!
 *
 * Copyright (c) 2015-2016 Cisco Systems, Inc. See LICENSE file.
 * @private
 */

import AvatarUrlBatcher from './avatar-url-batcher';
import AvatarUrlStore from './avatar-url-store';
import {SparkPlugin} from '@ciscospark/spark-core';
import {defaults} from 'lodash';

const Avatar = SparkPlugin.extend({
  namespace: `Avatar`,

  children: {
    batcher: AvatarUrlBatcher
  },

  session: {
    store: {
      default() {
        return new AvatarUrlStore();
      },
      type: `any`
    }
  },

  /**
   * @private
   * Requests an avatar URL from the api
   * @param {string} uuid
   * @param {Object} options
   * @param {integer} options.size
   * @param {integer} options.cacheControl
   * @returns {Promise<Object>}
   */
  _fetchAvatarUrl(uuid, options) {
    return this.store.get(uuid, options.size)
      .catch(() =>
        this.batcher.request(Object.assign({}, {uuid, size: options.size}))
          .then((item) =>
            this.store.add(defaults(item, {cacheControl: options.cacheControl, url: item.response.url}))));
  },

  /**
   * Retrieves an Avatar from a cache or the api on misses.
   *
   * @param {UserObject|string} user The user, Spark user uuid, or email
   * @param {Object} [options]
   * @param {integer} [options.size] In {1600, 640, 192, 135, 110, 80, 50, 40}
   *                                 Defaults to 80 if falsy
   * @returns {Promise<string>} A promise that resolves to the avatar
   */
  retrieveAvatarUrl(user, options) {
    if (!user) {
      return Promise.reject(new Error(`\`user\` is required parameter`));
    }

    options = defaults(options, {size: this.config.defaultAvatarSize,
                                 cacheControl: this.config.cacheExpiration});

    return this.spark.user.asUUID(user)
      .then((uuid) =>
        this._fetchAvatarUrl(uuid, options)
          .then((res) => res.url)
          .catch(() => Promise.reject(new Error(`Could not retrieve avatar`))));
  },

  /**
   * Upload a new avatar for the current user
   *
   * @param {Blob|File|Buffer} file The new avatar
   * @returns {Promise} Resolves with the URL of the full-sized avatar
   */
  setAvatar(file) {
    return this.upload({
      api: `avatar`,
      resource: `profile`,
      file,
      phases: {
        upload: {
          $uri: function $uri(session) {
            return session.url;
          }
        },
        finalize: {
          method: `PUT`,
          api: `avatar`,
          // eslint-disable-next-line no-unused-vars
          $resource: function $resource(session) {
            return `profile$(session.id)`;
          },
          $body: function $body(session) {
            return session;
          }
        }
      }
    })
      .then((res) => {
        // invalidate user's cached avatar
        this.store.remove(this.spark.device.userId);
        return res.url;
      });
  }
});

export default Avatar;

