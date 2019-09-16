const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA } = devConstants;

function shouldBehaveLikeERC1620Cancel(alice, bob, eve) {
  const now = new BigNumber(dayjs().unix());

  describe("when the stream exists", function() {
    let streamId;
    const sender = alice;
    const recipient = bob;
    const deposit = STANDARD_SALARY.toString(10);
    let startTime;
    let stopTime;

    beforeEach(async function() {
      const opts = { from: sender };
      await this.token.approve(this.sablier.address, deposit, opts);
      startTime = now.plus(STANDARD_TIME_OFFSET);
      stopTime = startTime.plus(STANDARD_TIME_DELTA);
      const result = await this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts);
      streamId = Number(result.logs[0].args.streamId);
    });

    describe("when the caller is the sender of the stream", function() {
      const opts = { from: sender };

      describe("when the stream did not start", function() {
        it("cancels the stream", async function() {
          await this.sablier.cancelStream(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        });

        it("it transfers all tokens to the sender of the stream", async function() {
          const balance = await this.token.balanceOf(sender);
          await this.sablier.cancelStream(streamId, opts);
          const newBalance = await this.token.balanceOf(sender);
          newBalance.should.be.bignumber.equal(balance.plus(deposit));
        });

        it("emits a cancel event", async function() {
          const result = await this.sablier.cancelStream(streamId, opts);
          truffleAssert.eventEmitted(result, "CancelStream");
        });
      });

      describe("when the stream did start but not end", function() {
        const amount = FIVE_UNITS;

        beforeEach(async function() {
          await traveler.advanceBlockAndSetTime(
            now
              .plus(STANDARD_TIME_OFFSET)
              .plus(5)
              .toNumber(),
          );
        });

        it("cancels the stream and transfers the tokens on a pro rata basis", async function() {
          await this.sablier.cancelStream(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        });

        it("transfers the tokens to the sender of the stream", async function() {
          const senderBalance = await this.token.balanceOf(sender);
          await this.sablier.cancelStream(streamId, opts);
          const newSenderBalance = await this.token.balanceOf(sender);
          newSenderBalance.should.tolerateTheBlockTimeVariation(
            senderBalance.minus(amount).plus(deposit),
            STANDARD_SCALE,
          );
        });

        it("transfers the tokens to the recipient of the stream", async function() {
          const recipientBalance = await this.token.balanceOf(recipient);
          await this.sablier.cancelStream(streamId, opts);
          const newRecipientBalance = await this.token.balanceOf(recipient);
          const tolerateByAddition = false;
          newRecipientBalance.should.tolerateTheBlockTimeVariation(
            recipientBalance.plus(amount),
            STANDARD_SCALE,
            tolerateByAddition,
          );
        });

        it("emits a cancel event", async function() {
          const result = await this.sablier.cancelStream(streamId, opts);
          truffleAssert.eventEmitted(result, "CancelStream");
        });

        afterEach(async function() {
          await traveler.advanceBlockAndSetTime(now.toNumber());
        });
      });

      describe("when the stream did end", function() {
        beforeEach(async function() {
          await traveler.advanceBlockAndSetTime(
            now
              .plus(STANDARD_TIME_OFFSET)
              .plus(STANDARD_TIME_DELTA)
              .plus(5)
              .toNumber(),
          );
        });

        it("cancels the stream", async function() {
          await this.sablier.cancelStream(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        });

        it("transfers all tokens to the recipient of the stream", async function() {
          const balance = await this.token.balanceOf(recipient);
          await this.sablier.cancelStream(streamId, opts);
          const newBalance = await this.token.balanceOf(recipient);
          newBalance.should.be.bignumber.equal(balance.plus(deposit));
        });

        it("emits a cancel event", async function() {
          const result = await this.sablier.cancelStream(streamId, opts);
          truffleAssert.eventEmitted(result, "CancelStream");
        });

        afterEach(async function() {
          await traveler.advanceBlockAndSetTime(now.toNumber());
        });
      });
    });

    describe("when the caller is the recipient of the stream", function() {
      const opts = { from: sender };

      describe("when the stream did not start", function() {
        it("cancels the stream", async function() {
          await this.sablier.cancelStream(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        });

        it("transfers all tokens to the sender of the stream", async function() {
          const balance = await this.token.balanceOf(sender);
          await this.sablier.cancelStream(streamId, opts);
          const newBalance = await this.token.balanceOf(sender);
          newBalance.should.be.bignumber.equal(balance.plus(deposit));
        });

        it("emits a cancel event", async function() {
          const result = await this.sablier.cancelStream(streamId, opts);
          truffleAssert.eventEmitted(result, "CancelStream");
        });
      });

      describe("when the stream did start but not end", function() {
        const amount = FIVE_UNITS;

        beforeEach(async function() {
          await traveler.advanceBlockAndSetTime(
            now
              .plus(STANDARD_TIME_OFFSET)
              .plus(5)
              .toNumber(),
          );
        });

        it("cancels the stream", async function() {
          await this.sablier.cancelStream(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        });

        it("transfers the tokens to the sender of the stream", async function() {
          const senderBalance = await this.token.balanceOf(sender);
          await this.sablier.cancelStream(streamId, opts);
          const newSenderBalance = await this.token.balanceOf(sender);
          newSenderBalance.should.tolerateTheBlockTimeVariation(
            senderBalance.minus(amount).plus(deposit),
            STANDARD_SCALE,
          );
        });

        it("transfers the tokens to the recipient of the stream", async function() {
          const recipientBalance = await this.token.balanceOf(recipient);
          await this.sablier.cancelStream(streamId, opts);
          const newRecipientBalance = await this.token.balanceOf(recipient);
          const tolerateByAddition = false;
          newRecipientBalance.should.tolerateTheBlockTimeVariation(
            recipientBalance.plus(amount),
            STANDARD_SCALE,
            tolerateByAddition,
          );
        });

        it("emits a cancel event", async function() {
          const result = await this.sablier.cancelStream(streamId, opts);
          truffleAssert.eventEmitted(result, "CancelStream");
        });

        afterEach(async function() {
          await traveler.advanceBlockAndSetTime(now.toNumber());
        });
      });

      describe("when the stream did end", function() {
        beforeEach(async function() {
          await traveler.advanceBlockAndSetTime(
            now
              .plus(STANDARD_TIME_OFFSET)
              .plus(STANDARD_TIME_DELTA)
              .plus(5)
              .toNumber(),
          );
        });

        it("cancels the stream", async function() {
          await this.sablier.cancelStream(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        });

        it("transfers all tokens to the recipient of the stream", async function() {
          const balance = await this.token.balanceOf(recipient);
          await this.sablier.cancelStream(streamId, opts);
          const newBalance = await this.token.balanceOf(recipient);
          newBalance.should.be.bignumber.equal(balance.plus(deposit));
        });

        it("emits a cancel event", async function() {
          const result = await this.sablier.cancelStream(streamId, opts);
          truffleAssert.eventEmitted(result, "CancelStream");
        });

        afterEach(async function() {
          await traveler.advanceBlockAndSetTime(now.toNumber());
        });
      });
    });

    describe("when the caller is not the sender or the recipient of the stream", function() {
      const opts = { from: eve };

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.cancelStream(streamId, opts),
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

module.exports = shouldBehaveLikeERC1620Cancel;
