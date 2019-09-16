const BigNumber = require("bignumber.js");

const STANDARD_SALARY = new BigNumber(3600).multipliedBy(1e18);

module.exports = {
  EXCHANGE_RATE_BLOCK_DELTA: new BigNumber(1e24),
  FIVE_UNITS: new BigNumber(5).multipliedBy(1e18),
  FIVE_UNITS_CTOKEN: new BigNumber(5).multipliedBy(1e8),
  GAS_LIMIT: 6721975,
  INITIAL_EXCHANGE_RATE: new BigNumber(2e26),
  INITIAL_SUPPLY: STANDARD_SALARY.multipliedBy(1000),
  ONE_UNIT: new BigNumber(1).multipliedBy(1e18),
  ONE_UNIT_CTOKEN: new BigNumber(1).multipliedBy(1e8),
  RPC_URL: "http://127.0.0.1:8545",
  RPC_PORT: 8545,
  STANDARD_SABLIER_FEE: new BigNumber(10),
  STANDARD_SALARY,
  STANDARD_SALARY_CTOKEN: new BigNumber(3600).multipliedBy(1e8),
  STANDARD_SCALE: new BigNumber(1e18),
  STANDARD_SCALE_CTOKEN: new BigNumber(1e8),
  STANDARD_RATE: new BigNumber(1).multipliedBy(1e18),
  STANDARD_RATE_CTOKEN: new BigNumber(1).multipliedBy(1e8),
  STANDARD_RECIPIENT_SHARE: new BigNumber(50),
  STANDARD_TIME_DELTA: new BigNumber(3600),
  STANDARD_TIME_OFFSET: new BigNumber(300),
  STANDARD_SENDER_SHARE: new BigNumber(50),
  STANDARD_WITHDRAWAL: new BigNumber(1).multipliedBy(1e18),
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
};
