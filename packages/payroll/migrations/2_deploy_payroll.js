/* global artifacts */
const Payroll = artifacts.require("./Payroll.sol");

module.exports = async (deployer, _, accounts) => {
  if (!process.env.SABLIER_ADDRESS) {
    console.log("Please set the SABLIER_ADDRESS environment variable");
    return;
  }

  await deployer.deploy(Payroll);
  const payroll = await Payroll.deployed();
  const ownerAddress = accounts[0];
  const signerAddress = accounts[0];
  const sablierAddress = process.env.SABLIER_ADDRESS;
  const opts = { from: accounts[0] };
  await payroll.methods["initialize(address,address,address)"](ownerAddress, signerAddress, sablierAddress, opts);
};
