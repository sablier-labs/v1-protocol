const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA } = devConstants;
const { contextForStreamDidEnd, contextForStreamDidStartButNotEnd } = mochaContexts;

function runTests() {
  describe("when the stream did not start", function() {
    it("cancels the stream", async function() {
      await this.sablier.cancelStream(this.streamId, this.opts);
      await truffleAssert.reverts(this.sablier.getStream(this.streamId), "stream does not exist");
    });

    it("transfers all tokens to the sender of the stream", async function() {
      const balance = await this.token.balanceOf(this.sender, this.opts);
      await this.sablier.cancelStream(this.streamId, this.opts);
      const newBalance = await this.token.balanceOf(this.sender, this.opts);
      newBalance.should.be.bignumber.equal(balance.plus(this.deposit));
    });

    it("emits a cancel event", async function() {
      const result = await this.sablier.cancelStream(this.streamId, this.opts);
      truffleAssert.eventEmitted(result, "CancelStream");
    });
  });

  contextForStreamDidStartButNotEnd(function() {
    const streamedAmount = FIVE_UNITS.toString(10);

    it("cancels the stream", async function() {
      await this.sablier.cancelStream(this.streamId, this.opts);
      await truffleAssert.reverts(this.sablier.getStream(this.streamId), "stream does not exist");
    });

    it("transfers the tokens to the sender of the stream", async function() {
      const balance = await this.token.balanceOf(this.sender, this.opts);
      await this.sablier.cancelStream(this.streamId, this.opts);
      const newBalance = await this.token.balanceOf(this.sender, this.opts);
      const tolerateByAddition = false;
      newBalance.should.tolerateTheBlockTimeVariation(
        balance.minus(streamedAmount).plus(this.deposit),
        STANDARD_SCALE,
        tolerateByAddition,
      );
    });

    it("transfers the tokens to the recipient of the stream", async function() {
      const balance = await this.token.balanceOf(this.recipient, this.opts);
      await this.sablier.cancelStream(this.streamId, this.opts);
      const newBalance = await this.token.balanceOf(this.recipient, this.opts);
      newBalance.should.tolerateTheBlockTimeVariation(balance.plus(streamedAmount), STANDARD_SCALE);
    });

    it("emits a cancel event", async function() {
      const result = await this.sablier.cancelStream(this.streamId, this.opts);
      truffleAssert.eventEmitted(result, "CancelStream");
    });
  });

  contextForStreamDidEnd(function() {
    const streamedAmount = STANDARD_SALARY.toString(10);

    it("cancels the stream", async function() {
      await this.sablier.cancelStream(this.streamId, this.opts);
      await truffleAssert.reverts(this.sablier.getStream(this.streamId), "stream does not exist");
    });

    it("transfers nothing to the sender of the stream", async function() {
      const balance = await this.token.balanceOf(this.sender, this.opts);
      await this.sablier.cancelStream(this.streamId, this.opts);
      const newBalance = await this.token.balanceOf(this.recipient, this.opts);
      newBalance.should.be.bignumber.equal(balance);
    });

    it("transfers all tokens to the recipient of the stream", async function() {
      const balance = await this.token.balanceOf(this.recipient, this.opts);
      await this.sablier.cancelStream(this.streamId, this.opts);
      const newBalance = await this.token.balanceOf(this.recipient, this.opts);
      newBalance.should.be.bignumber.equal(balance.plus(streamedAmount));
    });

    it("emits a cancel event", async function() {
      const result = await this.sablier.cancelStream(this.streamId, this.opts);
      truffleAssert.eventEmitted(result, "CancelStream");
    });
  });
}

function shouldBehaveLikeERC1620CancelStream(alice, bob, eve) {
  const now = new BigNumber(dayjs().unix());

  describe("when the stream exists", function() {
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);

    beforeEach(async function() {
      this.sender = alice;
      this.recipient = bob;
      this.deposit = STANDARD_SALARY.toString(10);
      const opts = { from: this.sender };
      await this.token.approve(this.sablier.address, this.deposit, opts);
      const result = await this.sablier.createStream(
        this.recipient,
        this.deposit,
        this.token.address,
        startTime,
        stopTime,
        opts,
      );
      this.streamId = Number(result.logs[0].args.streamId);
    });

    describe("when the caller is the sender of the stream", function() {
      beforeEach(function() {
        this.opts = { from: this.sender };
      });

      runTests();
    });

    describe("when the caller is the recipient of the stream", function() {
      beforeEach(function() {
        this.opts = { from: this.recipient };
      });

      runTests();
    });

    describe("when the caller is not the sender or the recipient of the stream", function() {
      const opts = { from: eve };

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.cancelStream(this.streamId, opts),
          "caller is not the sender or the recipient of the stream",
        );
      });
    });
  });

  describe("when the stream does not exist", function() {
    const recipient = bob;
    const opts = { from: recipient };

    it("reverts", async function() {
      const streamId = new BigNumber(419863);
      await truffleAssert.reverts(this.sablier.cancelStream(streamId, opts), "stream does not exist");
    });
  });
}

module.exports = shouldBehaveLikeERC1620CancelStream;
