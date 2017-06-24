'use strict';
const assert = require('assert');
const { getRandomPort } = require('../util');

describe('util', () => {

  it('getRandomPort', async () => {
    const port = await getRandomPort();
    assert.ok(Number.isInteger(port) && port > 0 && port <= 0xFFFF, 'Verify generated port number is valid integer');
  });
});
