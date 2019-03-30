/* global artifacts */
const Sablier = artifacts.require("./Sablier.sol");

module.exports = (deployer) => {
  deployer.deploy(Sablier);
};
