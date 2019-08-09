const BigNumber = require("bignumber.js");

const STANDARD_DEPOSIT = new BigNumber(3600).multipliedBy(1e18);

module.exports = {
  FIVE_UNITS: new BigNumber(5).multipliedBy(1e18),
  GAS_LIMIT: 6721975,
  INITIAL_SUPPLY: STANDARD_DEPOSIT.multipliedBy(1000),
  ONE_UNIT: new BigNumber(1).multipliedBy(1e18),
  RPC_URL: "http://127.0.0.1:8545",
  RPC_PORT: 8545,
  STANDARD_DEPOSIT,
  STANDARD_TIME_DELTA: new BigNumber(3600),
  STANDARD_TIME_OFFSET: new BigNumber(300),
  STANDARD_WITHDRAWAL: new BigNumber(1).multipliedBy(1e18),
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
};
