const BigNumber = require("bignumber.js");

const STANDARD_DEPOSIT = new BigNumber(3600).multipliedBy(1e18);

module.exports = {
  INITIAL_SUPPLY: STANDARD_DEPOSIT.multipliedBy(1000),
  GAS_LIMIT: 6721975,
  RPC_URL: "http://127.0.0.1:8545",
  RPC_PORT: 8545,
  STANDARD_DEPOSIT,
  STANDARD_TIME_DELTA: new BigNumber(3600),
  STANDARD_TIME_OFFSET: new BigNumber(100),
  STANDARD_WITHDRAWAL: new BigNumber(1).multipliedBy(1e18),
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
};
