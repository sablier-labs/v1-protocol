/* global artifacts, web3 */
const ERC20Mintable = artifacts.require("./ERC20Mintable.sol");
const Sablier = artifacts.require("./Sablier.sol");

module.exports = (deployer, network, accounts) => {
  deployer.deploy(Sablier).then(async (sablier) => {
    if (network !== "development") {
      return;
    }
    const allowance = web3.utils.toWei("1000");
    const erc20Mintable = await ERC20Mintable.deployed();
    await erc20Mintable.approve(sablier.address, allowance, { from: accounts[0] });

    const sender = accounts[0];
    const recipient = accounts[1];
    const currentBlockNumber = await web3.eth.getBlockNumber();
    const startBlock = currentBlockNumber + 5;
    const stopBlock = currentBlockNumber + 100 + 5;
    const tokenAddress = erc20Mintable.address;
    const payment = web3.utils.toWei("1");
    const interval = 1;

    const opts = { from: accounts[0] };
    await sablier.createStream(sender, recipient, tokenAddress, startBlock, stopBlock, payment, interval, opts);
  });
};
