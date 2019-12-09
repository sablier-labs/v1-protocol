/* global artifacts */
const Payroll = artifacts.require("./Payroll.sol");

module.exports = async (deployer, _, accounts) => {
  if (process.env.CI) {
    return;
  }

  if (!process.env.SABLIER_ADDRESS) {
    console.log("Please set the SABLIER_ADDRESS environment variable");
    return;
  }

  const ownerAddress = accounts[0];
  const signerAddress = accounts[0];
  const sablierAddress = process.env.SABLIER_ADDRESS;
  const opts = { from: accounts[0] };
  await deployer.deploy(Payroll, ownerAddress, signerAddress, sablierAddress, opts);
};
