/**!
 *
 * Copyright (c) 2015-2016 Cisco Systems, Inc. See LICENSE file.
 */

import {Call} from '../..';
import sinon from '@ciscospark/test-helper-sinon';

beforeEach(() => {
  sinon.spy(Call, `make`);
});

afterEach(function() {
  this.timeout(60000);
  const promises = Call.make.returnValues.map((c) => c.hangup()
    .catch((reason) => console.warn(reason)));

  Call.make.restore();

  return Promise.all(promises);
});
