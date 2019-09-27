/* global artifacts */
const CTokenManager = artifacts.require("./CTokenManager.sol");

module.exports = (deployer, _, accounts) => {
  const opts = { from: accounts[0] };
  deployer.deploy(CTokenManager, opts);
};
