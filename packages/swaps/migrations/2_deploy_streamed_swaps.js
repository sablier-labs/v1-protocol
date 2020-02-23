/* global artifacts, web3 */
const BigNumber = require("bignumber.js");

const StreamedSwap = artifacts.require("./StreamedSwap.sol");

module.exports = async (deployer, network, accounts) => {
  if (process.env.CI) {
    return;
  }
  if (!process.env.SABLIER_ADDRESS) {
    console.log("Please set the SABLIER_ADDRESS environment variable");
    return;
  }

  await deployer.deploy(StreamedSwap, process.env.SABLIER_ADDRESS);

  // const swapContract = await Payroll.deployed();
  // const ownerAddress = accounts[0];
  // const signerAddress = accounts[0];
  // const sablierAddress = process.env.SABLIER_ADDRESS;
  // const opts = { from: accounts[0] };
  // await swapContract.methods["initialize(address,address,address)"](ownerAddress, signerAddress, sablierAddress, opts);
};
