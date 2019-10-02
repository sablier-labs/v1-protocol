/* global artifacts */
const CTokenManager = artifacts.require("./CTokenManager.sol");
const Sablier = artifacts.require("./Sablier.sol");

module.exports = async (deployer) => {
  const cTokenManagerInstance = await CTokenManager.deployed();
  await deployer.deploy(Sablier, cTokenManagerInstance.address);
};
