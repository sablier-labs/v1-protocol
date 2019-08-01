/* global artifacts, web3 */
const ERC20Mintable = artifacts.require("./ERC20Mintable.sol");

module.exports = (deployer, network, accounts) => {
  deployer.deploy(ERC20Mintable).then(async (erc20Mintable) => {
    const amount = web3.utils.toWei("1000");
    const opts = { from: accounts[0] };
    await erc20Mintable.mint(accounts[0], amount, opts);
  });
};
