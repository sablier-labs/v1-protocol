const BigNumber = require("bignumber.js");

const STANDARD_DEPOSIT = new BigNumber(3600).multipliedBy(1e18);

module.exports = {
  INITIAL_SUPPLY: STANDARD_DEPOSIT.multipliedBy(1000).toString(10),
  STANDARD_DEPOSIT,
};
