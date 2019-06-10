/* eslint-disable func-names */
/* global artifacts, before, contract, describe, it, web3 */
const { devConstants, errors } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const truffleAssert = require("truffle-assertions");

const ERC20Mock = artifacts.require("./ERC20Mock.sol");
const Sablier = artifacts.require("./Sablier.sol");

const { toWei } = web3.utils;

/* eslint-disable-next-line no-unused-vars */
contract("Sablier", function([_, sender, recipient, malicious, innocent]) {
  let token;
  let sablier;

  const vars = {
    delta: 12,
    offset: 8,
    startBlock: 0,
    streamId: 0,
    streamIdWrong: 314,
    stopBlock: 0,
  };
  const unit = 1;
  const payments = {
    interval: 1,
    unit,
    unitWei: toWei(`${unit}`),
    deposit: toWei(`${unit * vars.delta}`),
  };

  before(async function() {
    token = await ERC20Mock.new(sender, toWei("100"));
    sablier = await Sablier.new();
    sablier.contract.options.from = sender;
    sablier.contract.options.gas = "4700000";
  });

  async function createStream() {
    const blockNumber = await web3.eth.getBlockNumber();
    vars.startBlock = blockNumber + vars.offset;
    vars.stopBlock = blockNumber + vars.delta + vars.offset;

    await token.contract.methods.approve(sablier.contract.options.address, payments.deposit).send({
      from: sender,
    });

    await sablier.contract.methods
      .createStream(
        sender,
        recipient,
        token.address,
        vars.startBlock,
        vars.stopBlock,
        payments.unitWei,
        payments.interval,
      )
      .send({
        from: sender,
      });
    vars.streamId += 1;
  }

  function makeSuite(name, tests) {
    describe(name, function() {
      before(createStream);
      tests();
    });
  }

  makeSuite("balanceOf", function() {
    it("...should return the correct balance", async function() {
      await web3.utils.advanceBlock(vars.offset);
      const recipientBalance = new BigNumber(await sablier.contract.methods.balanceOf(vars.streamId, recipient).call());
      const senderBalance = new BigNumber(await sablier.contract.methods.balanceOf(vars.streamId, sender).call());
      const blockNumber = await web3.eth.getBlockNumber();

      // including the block in which the tx gets executed, hence "+1"
      const recipientExpectedContractBalance = toWei(`${(blockNumber - vars.startBlock + 1) * payments.unit}`);
      recipientBalance.should.be.bignumber.equal(
        recipientExpectedContractBalance,
        `recipient's contract balance should be ${recipientExpectedContractBalance}`,
      );

      // including the block in which the tx gets executed, hence "-1"
      const senderExpectedContractBalance = toWei(`${(vars.stopBlock - blockNumber - 1) * payments.unit}`);
      senderBalance.should.be.bignumber.equal(
        senderExpectedContractBalance,
        `sender's contract balance should be ${senderExpectedContractBalance}`,
      );
    });
  });

  makeSuite("getStream", function() {
    it("...should return the stream correctly", async function() {
      const stream = await sablier.contract.methods.getStream(vars.streamId).call();
      stream.sender.should.be.equal(sender);
      stream.recipient.should.be.equal(recipient);
      stream.tokenAddress.should.be.equal(token.address);
      stream.balance.should.be.equal(payments.deposit);
      stream.startBlock.should.be.equal(`${vars.startBlock}`);
      stream.stopBlock.should.be.equal(`${vars.stopBlock}`);
      stream.payment.should.be.equal(payments.unitWei);
      stream.interval.should.be.equal(`${payments.interval}`);
    });
  });

  makeSuite("getUpdate", function() {
    it("...should return the update correctly", async function() {
      await sablier.contract.methods
        .confirmUpdate(vars.streamId, token.address, vars.stopBlock + 10, payments.unitWei, payments.interval)
        .send({
          from: sender,
        });
      const update = await sablier.contract.methods.getUpdate(vars.streamId, sender).call();
      update.should.be.equal(true);
    });
  });

  async function shouldFailCreateStream(tokenAddress, startBlock, stopBlock, interval, error) {
    const { unitWei } = payments;
    await truffleAssert.reverts(
      sablier.contract.methods
        .createStream(sender, recipient, tokenAddress, startBlock, stopBlock, unitWei, interval)
        .send({ from: sender }),
      error,
    );
  }

  describe("createStream", async function() {
    it("...should fail to create a stream", async function() {
      const blockNumber = await web3.eth.getBlockNumber();

      // contract does not exist
      await shouldFailCreateStream(
        devConstants.ZERO_ADDRESS,
        blockNumber + vars.offset,
        blockNumber + vars.offset + vars.delta,
        payments.interval,
        errors.CONTRACT_EXISTENCE,
      );

      // contract not allowed to withdraw enough tokens
      await shouldFailCreateStream(
        token.address,
        blockNumber + vars.offset,
        blockNumber + vars.offset + vars.delta,
        payments.interval,
        errors.CONTRACT_ALLOWANCE,
      );

      // the start block (1) is lower than the current block number
      await shouldFailCreateStream(
        token.address,
        1,
        blockNumber + vars.offset + vars.delta,
        payments.interval,
        errors.BLOCK_START,
      );

      // the stop block (1) is lower than the start block
      await shouldFailCreateStream(token.address, blockNumber + vars.offset, 1, payments.interval, errors.BLOCK_STOP);

      // interval (51) is bigger than the block difference (1)
      await shouldFailCreateStream(
        token.address,
        blockNumber + vars.offset,
        blockNumber + vars.offset + 1,
        payments.interval + 50,
        errors.BLOCK_DELTA,
      );

      // block difference (5) is not a multiple of interval (3)
      await shouldFailCreateStream(
        token.address,
        blockNumber + vars.offset,
        blockNumber + vars.offset + 5,
        payments.interval + 2,
        errors.BLOCK_DELTA_MULTIPLICITY,
      );
    });

    it("...should create a stream", async function() {
      await createStream();

      const balance = (await sablier.contract.methods.balanceOf(vars.streamId, recipient).call()).toString();
      balance.should.be.equal("0", "contract balance right after stream creation should be 0");
    });
  });

  makeSuite("withdrawFromStream", function() {
    it("...should fail to withdraw funds", async function() {
      await truffleAssert.reverts(
        sablier.contract.methods.withdrawFromStream(vars.streamIdWrong, 10).send({ from: recipient }),
        errors.STREAM_EXISTENCE,
      );

      await truffleAssert.reverts(
        sablier.contract.methods.withdrawFromStream(vars.streamId, 10).send({ from: malicious }),
        errors.AUTH_RECIPIENT,
      );

      const billionEther = toWei("1", "gether");
      await truffleAssert.reverts(
        sablier.contract.methods.withdrawFromStream(vars.streamId, billionEther).send({ from: recipient }),
        errors.INSOLVENCY,
      );
    });

    async function shouldWithdraw(previousWalletBalance, previousContractBalance, fundsToWithdraw) {
      await sablier.contract.methods.withdrawFromStream(vars.streamId, fundsToWithdraw).send({ from: recipient });

      // wallet balance
      const walletBalance = new BigNumber(await token.balanceOf(recipient));
      const expectedWalletBalance = new BigNumber(previousWalletBalance).plus(new BigNumber(fundsToWithdraw));
      walletBalance.should.be.bignumber.equal(
        expectedWalletBalance,
        `wallet balance of ${recipient} is not ${expectedWalletBalance}`,
      );

      // contract balance
      const blockNumber = await web3.eth.getBlockNumber();
      const contractBalance = new BigNumber(
        (await sablier.contract.methods.balanceOf(vars.streamId, recipient).call()).toString(),
      );
      // including the block in which the tx gets executed, hence "+1",
      // but only if the current block number is lower than the stop block
      const expectedContractBalance = new BigNumber(previousContractBalance)
        .minus(fundsToWithdraw)
        .plus(blockNumber <= vars.stopBlock ? payments.unitWei : 0);
      contractBalance.should.be.bignumber.equal(
        expectedContractBalance,
        `contract balance of ${recipient} is not ${expectedContractBalance}`,
      );

      return { walletBalance, contractBalance };
    }

    it("...should withdraw funds", async function() {
      // while the stream is ongoing
      await web3.utils.advanceBlock(vars.offset);
      const previousWalletBalance = new BigNumber(
        (await token.contract.methods.balanceOf(recipient).call()).toString(),
      );
      const previousContractBalance = new BigNumber(
        (await sablier.contract.methods.balanceOf(vars.streamId, recipient).call()).toString(),
      );
      const fundsToWithdraw = payments.unitWei;
      const balances = await shouldWithdraw(previousWalletBalance, previousContractBalance, fundsToWithdraw);

      // after the blockchain passed the stop block
      await web3.utils.advanceBlock(vars.delta);
      const contractBalance = new BigNumber(payments.deposit).minus(fundsToWithdraw).toString();
      // yes, the funds to be withdrawn are equal to the contract balance
      await shouldWithdraw(balances.walletBalance, contractBalance, contractBalance);
    });
  });

  makeSuite("redeemStream", function() {
    it("...should fail to redeem the stream", async function() {
      // stream doesn't exist
      await truffleAssert.reverts(
        sablier.contract.methods.redeemStream(vars.streamIdWrong).send({ from: sender }),
        errors.STREAM_NONEXISTENT,
      );

      // only the stream sender or recipient allowed
      await truffleAssert.reverts(
        sablier.contract.methods.redeemStream(vars.streamId).send({ from: malicious }),
        errors.AUTH_BOTH,
      );
    });

    async function shouldRedeemStream() {
      const previousWalletBalance = await token.contract.methods.balanceOf(recipient).call();
      const contractBalance = await sablier.contract.methods.balanceOf(vars.streamId, recipient).call();
      await sablier.contract.methods.redeemStream(vars.streamId).send({
        from: sender,
      });

      const walletBalance = new BigNumber((await token.contract.methods.balanceOf(recipient).call()).toString());
      const expectedWalletBalance = new BigNumber(previousWalletBalance).plus(new BigNumber(contractBalance));
      walletBalance.should.be.bignumber.equal(
        expectedWalletBalance,
        `wallet balance is not ${expectedWalletBalance} after withdrawal`,
      );
    }

    it("...should redeem the funds", async function() {
      // before the stream starts
      await shouldRedeemStream();

      // while the stream is ongoing
     await createStream();
     await web3.utils.advanceBlock(vars.offset);
     await shouldRedeemStream();

     // after the blockchain passed the stop block
      await createStream();
      await web3.utils.advanceBlock(vars.delta + vars.offset);
      await shouldRedeemStream();
    });
  });

  makeSuite("updateStream", function() {
    it("...should confirm the sender's update", async function() {
      await web3.utils.advanceBlock(vars.offset);
      await sablier.contract.methods
        .confirmUpdate(vars.streamId, token.address, vars.stopBlock + 10, payments.unitWei, payments.interval)
        .send({
          from: sender,
        });

      const update = await sablier.contract.methods.getUpdate(vars.streamId, sender).call();
      update.should.be.equal(true);
    });

    it("...should revoke the sender's update", async function() {
      await sablier.contract.methods
        .revokeUpdate(vars.streamId, token.address, vars.stopBlock + 10, payments.unitWei, payments.interval)
        .send({
          from: sender,
        });

      const update = await sablier.contract.methods.getUpdate(vars.streamId, sender).call();
      update.should.be.equal(false);
    });

    it("...should confirm and execute the update", async function() {
      await sablier.contract.methods
        .confirmUpdate(vars.streamId, token.address, vars.stopBlock + 10, payments.unitWei, payments.interval)
        .send({
          from: recipient,
        });
    });
  });
});
