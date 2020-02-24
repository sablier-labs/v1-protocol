/* global artifacts */
const StreamedSwap = artifacts.require("./StreamedSwap.sol");

module.exports = async (deployer, _network, _accounts) => {
  if (process.env.CI) {
    return;
  }
  if (!process.env.SABLIER_ADDRESS) {
    console.log("Please set the SABLIER_ADDRESS environment variable");
    return;
  }

  await deployer.deploy(StreamedSwap, process.env.SABLIER_ADDRESS);
};
