/* global artifacts */
const CTokenManager = artifacts.require("./CTokenManager.sol");

module.exports = (deployer) => {
  deployer.deploy(CTokenManager);
};
