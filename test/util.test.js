'use strict';
const assert = require('assert');
const { getRandomPort, isPortOpen } = require('../lib/util');

describe('util', () => {

  it('getRandomPort', async () => {
    const port = await getRandomPort();
    assert.ok(Number.isInteger(port) && port > 0 && port <= 0xFFFF, 'Verify generated port number is valid integer');
  });

  it('isPortOpen', async () => {
    const open = await isPortOpen(1111);
    assert.equal(open, false);
  });
});
