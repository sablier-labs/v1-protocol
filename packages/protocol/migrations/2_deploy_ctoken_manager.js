/* global artifacts */
const CTokenManager = artifacts.require("./CTokenManager.sol");

module.exports = async deployer => {
  await deployer.deploy(CTokenManager);
};
