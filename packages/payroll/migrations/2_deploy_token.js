/* global artifacts, web3 */
const ERC20Mock = artifacts.require("./ERC20Mock.sol");

module.exports = (deployer, _, accounts) => {
  return deployer.deploy(ERC20Mock).then(async (erc20Mock) => {
    const initialBalance = web3.utils.toWei("7200");
    await erc20Mock.mint(accounts[0], initialBalance);
  });
};
