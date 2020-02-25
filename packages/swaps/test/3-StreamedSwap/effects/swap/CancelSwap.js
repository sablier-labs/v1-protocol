const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_DELTA, STANDARD_TIME_OFFSET } = devConstants;
const { contextForStreamDidStartButNotEnd, contextForStreamDidEnd } = mochaContexts;

function runTests() {
  contextForStreamDidStartButNotEnd(function() {
    const streamedAmount = FIVE_UNITS.toString(10);

    it("cancels the swap", async function() {
      await this.streamedSwap.cancelSwap(this.swapId, this.opts);
      await truffleAssert.reverts(this.streamedSwap.getSwap(this.swapId), "swap does not exist");
    });

  //   it("transfers the tokens to the sender of the stream", async function() {
  //     const stream = await this.sablier.getStream(2)
  //     console.log("stream", stream)
  //     const balance = await this.token2.balanceOf(this.sender);
  //     const contractbalance = await this.token2.balanceOf(this.streamedSwap);
  //     await this.streamedSwap.cancelSwap(this.swapId, this.opts);
  //     const newBalance = await this.token2.balanceOf(this.sender);
  //     console.log(balance, newBalance, FIVE_UNITS)
  //     newBalance.should.tolerateTheBlockTimeVariation(balance.plus(streamedAmount), STANDARD_SCALE);
  //   });

  //   it("transfers the tokens to the recipient of the stream", async function() {
  //     const balance = await this.token1.balanceOf(this.recipient);
  //     await this.streamedSwap.cancelSwap(this.swapId, this.opts);
  //     const newBalance = await this.token1.balanceOf(this.recipient);
  //     newBalance.should.tolerateTheBlockTimeVariation(balance.plus(streamedAmount), STANDARD_SCALE);
  //   });

    it("emits a cancelswap event", async function() {
      const result = await this.streamedSwap.cancelSwap(this.swapId, this.opts);
      truffleAssert.eventEmitted(result, "CancelSwap");
    });
  });

  contextForStreamDidEnd(function() {
    const streamedAmount = STANDARD_SALARY.toString(10);

    it("cancels the stream", async function() {
      await this.streamedSwap.cancelSwap(this.swapId, this.opts);
      await truffleAssert.reverts(this.streamedSwap.getSwap(this.swapId), "swap does not exist");
    });

    it("transfers token2 to only the sender of the swap", async function() {
      const senderBalance = await this.token2.balanceOf(this.sender, this.opts);
      const recipientBalance = await this.token2.balanceOf(this.recipient, this.opts);
      await this.streamedSwap.cancelSwap(this.swapId, this.opts);
      const newSenderBalance = await this.token2.balanceOf(this.sender, this.opts);
      const newRecipientBalance = await this.token2.balanceOf(this.recipient, this.opts);
      newSenderBalance.should.be.bignumber.equal(senderBalance.plus(streamedAmount));
      newRecipientBalance.should.be.bignumber.equal(recipientBalance);
    });

    it("transfers token1 to only the recipient of the stream", async function() {
      const senderBalance = await this.token1.balanceOf(this.sender, this.opts);
      const recipientBalance = await this.token1.balanceOf(this.recipient, this.opts);
      await this.streamedSwap.cancelSwap(this.swapId, this.opts);
      const newSenderBalance = await this.token1.balanceOf(this.sender, this.opts);
      const newRecipientBalance = await this.token1.balanceOf(this.recipient, this.opts);
      newSenderBalance.should.be.bignumber.equal(senderBalance);
      newRecipientBalance.should.be.bignumber.equal(recipientBalance.plus(streamedAmount));
    });

    it("emits a cancel event", async function() {
      const result = await this.streamedSwap.cancelSwap(this.swapId, this.opts);
      truffleAssert.eventEmitted(result, "CancelSwap");
    });
  });
}

function shouldBehaveLikeCancelSwap(alice, bob, eve) {
  const now = new BigNumber(dayjs().unix());
  const duration = STANDARD_TIME_DELTA;

  beforeEach(async function() {
    this.sender = alice;
    this.recipient = bob;
    this.salary = STANDARD_SALARY.toString(10);
  });

  describe("when the swap exists", function() {
    beforeEach(async function() {
      this.senderOpts = { from: this.sender };
      this.recipientOpts = { from: this.recipient };

      await this.token1.approve(this.streamedSwap.address, this.salary, this.senderOpts);
      await this.token2.approve(this.streamedSwap.address, this.salary, this.recipientOpts);

      const result = await this.streamedSwap.proposeSwap(
        this.recipient,
        this.salary,
        this.salary,
        this.token1.address,
        this.token2.address,
        duration,
        this.senderOpts,
      );
      this.swapId = Number(result.logs[0].args.swapId);
      await this.streamedSwap.executeSwap(
        this.swapId,
        this.recipientOpts,
      );
    });

    describe("when the caller is the sender", function() {
      beforeEach(async function() {
        this.opts = { from: this.sender };
      });

      runTests();
    });

    describe("when the caller is the recipient", function() {
      beforeEach(async function() {
        this.opts = { from: this.recipient };
      });

      runTests();
    });

    describe("when the caller is not the sender or the recipient", function() {
      const opts = { from: eve };

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.streamedSwap.cancelSwap(this.swapId, opts),
          "caller is not the sender or recipient",
        );
      });
    });
  });

  describe("when the swap does not exist", function() {
    const opts = { from: alice };

    it("reverts", async function() {
      const swapId = new BigNumber(419863);
      await truffleAssert.reverts(this.streamedSwap.cancelSwap(swapId, opts), "swap does not exist");
    });
  });
}

module.exports = shouldBehaveLikeCancelSwap;
