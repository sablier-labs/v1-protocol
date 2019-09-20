/* eslint-disable func-names */
/* global afterEach, beforeEach, describe */
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");

const devConstants = require("./constants");

const { STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA } = devConstants;

function contextForStreamDidStartButNotEnd(functions) {
  const now = new BigNumber(dayjs().unix());

  describe("when the stream did start but not end", function() {
    beforeEach(async function() {
      await traveler.advanceBlockAndSetTime(
        now
          .plus(STANDARD_TIME_OFFSET)
          .plus(5)
          .toNumber(),
      );
    });

    functions();

    afterEach(async function() {
      await traveler.advanceBlockAndSetTime(now.toNumber());
    });
  });
}

function contextForStreamDidEnd(functions) {
  const now = new BigNumber(dayjs().unix());

  describe("when the stream did end", function() {
    beforeEach(async function() {
      await traveler.advanceBlockAndSetTime(
        now
          .plus(STANDARD_TIME_OFFSET)
          .plus(STANDARD_TIME_DELTA)
          .plus(5)
          .toNumber(),
      );
    });

    functions();

    afterEach(async function() {
      await traveler.advanceBlockAndSetTime(now.toNumber());
    });
  });
}

module.exports = {
  contextForStreamDidStartButNotEnd,
  contextForStreamDidEnd,
};
