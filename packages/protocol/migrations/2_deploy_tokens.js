/* global artifacts, web3 */
const ERC20Mock = artifacts.require("./ERC20Mock.sol");
const NonStandardERC20 = artifacts.require("./NonStandardERC20.sol");

module.exports = (deployer, _, accounts) => {
  const initialBalance = web3.utils.toWei("7200");

  deployer.deploy(ERC20Mock).then(async (token) => {
    await token.mint(accounts[0], initialBalance);
  });

  deployer.deploy(NonStandardERC20).then(async (nonStandardToken) => {
    await nonStandardToken.nonStandardMint(accounts[0], initialBalance);
  });
};
