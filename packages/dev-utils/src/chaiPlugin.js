/* eslint-disable func-names, no-else-return, no-param-reassign */
const BigNumber = require("bignumber.js");

const devConstants = require("./constants");

module.exports = (chai, _utils) => {
  // See https://twitter.com/nicksdjohnson/status/1132394932361023488
  const convert = value => {
    let number;

    if (typeof value === "string" || typeof value === "number") {
      number = new BigNumber(value);
    } else if (BigNumber.isBigNumber(value)) {
      number = value;
    } else {
      new chai.Assertion(value).assert(false, `expected ${value} to be an instance of string, number or BigNumber`);
    }

    return number;
  };

  /**
   * Performs a boundary check instead of an equality check. In real life circumstances, it can take up to 14 seconds
   * for a block to be broadcast on the Ethereum network, so we have to account for this.
   *
   * Note that we make two assumptions:
   *
   * 1. The payment rate is 1 token/ second, which is true for all tests in this repo.
   * 2. By default, the token has 18 decimals
   */
  chai.Assertion.addMethod("tolerateTheBlockTimeVariation", function(
    expected,
    scale = devConstants.STANDARD_SCALE,
    tolerateByAddition = true,
  ) {
    const actual = convert(this._obj);
    expected = convert(expected);
    scale = convert(scale);

    const blockTimeAverage = new BigNumber(14).multipliedBy(scale);
    if (tolerateByAddition) {
      const expectedCeiling = expected.plus(blockTimeAverage);

      return this.assert(
        actual.isGreaterThanOrEqualTo(expected) && actual.isLessThanOrEqualTo(expectedCeiling),
        `expected ${actual.toString()} to be >= than ${expected.toString()} and <= ${expectedCeiling.toString()}`,
      );
    } else {
      const expectedFloor = expected.minus(blockTimeAverage);

      return this.assert(
        actual.isLessThanOrEqualTo(expected) && actual.isGreaterThanOrEqualTo(expectedFloor),
        `expected ${actual.toString()} to be <= than ${expected.toString()} and >= ${expectedFloor.toString()}`,
      );
    }
  });
};
