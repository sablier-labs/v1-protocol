/* global artifacts, web3 */
const BigNumber = require("bignumber.js");

const CTokenManager = artifacts.require("./CTokenManager.sol");
const ERC20Mock = artifacts.require("./ERC20Mock.sol");
const Sablier = artifacts.require("./Sablier.sol");

module.exports = async (deployer, network, accounts) => {
  const cTokenManagerInstance = await CTokenManager.deployed();
  await deployer.deploy(Sablier, cTokenManagerInstance.address);
  const sablier = await Sablier.deployed();

  if (network !== "development") {
    return;
  }

  const allowance = new BigNumber(3600).multipliedBy(1e18).toString(10);

  await deployer.deploy(ERC20Mock);
  const erc20 = await ERC20Mock.deployed();
  await erc20.mint(accounts[0], allowance);
  await erc20.approve(sablier.address, allowance, { from: accounts[0] });

  const recipient = accounts[1];
  const deposit = allowance;
  const tokenAddress = erc20.address;
  const { timestamp } = await web3.eth.getBlock("latest");
  const startTime = new BigNumber(timestamp).plus(300);
  const stopTime = startTime.plus(3600);

  await sablier.createStream(recipient, deposit, tokenAddress, startTime, stopTime, { from: accounts[0] });
};
