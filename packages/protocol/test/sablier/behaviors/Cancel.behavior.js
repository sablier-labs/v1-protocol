const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const truffleAssert = require("truffle-assertions");

const { STANDARD_DEPOSIT, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA, ZERO_ADDRESS } = devConstants;

function shouldBehaveLikeERC1620Cancel(alice, bob, eve) {
  const deposit = STANDARD_DEPOSIT.toString(10);

  describe("when the stream exists", function() {
    const sender = alice;
    const recipient = bob;
    let startTime;
    let stopTime;
    let streamId;

    beforeEach(async function() {
      const opts = { from: sender };
      await this.token.approve(this.sablier.address, deposit, opts);
      const tokenAddress = this.token.address;
      const { timestamp } = await web3.eth.getBlock("latest");
      startTime = new BigNumber(timestamp).plus(STANDARD_TIME_OFFSET);
      stopTime = startTime.plus(STANDARD_TIME_DELTA);
      const result = await this.sablier.create(recipient, deposit, tokenAddress, startTime, stopTime, opts);
      streamId = result.logs[0].args.streamId;
    });

    describe("when the caller is the sender of the stream", function() {
      const opts = { from: sender };

      describe("when the stream did not start", function() {
        it("cancels the stream and transfers all tokens to the sender", async function() {
          const balance = await this.token.balanceOf(sender);
          await this.sablier.cancel(streamId, opts);
          const newBalance = await this.token.balanceOf(sender);
          balance.should.be.bignumber.equal(newBalance.minus(deposit));
        });

        it("deletes the stream object", async function() {
          await this.sablier.cancel(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        });

        it("emits a cancel event", async function() {
          const result = await this.sablier.cancel(streamId, opts);
          truffleAssert.eventEmitted(result, "Cancel");
        });
      });

      describe("when the stream did start but not end", function() {
        const streamingTime = new BigNumber(1);
        const streamedAmount = new BigNumber(1).multipliedBy(1e18);

        beforeEach(async function() {
          await web3.utils.advanceTimeAndBlock(STANDARD_TIME_OFFSET.plus(streamingTime).toNumber());
        });

        it("cancels the stream and transfers tokens on a pro rata basis", async function() {
          const senderBalance = await this.token.balanceOf(sender);
          const recipientBalance = await this.token.balanceOf(recipient);
          await this.sablier.cancel(streamId, opts);
          const newSenderBalance = await this.token.balanceOf(sender);
          const newRecipientBalance = await this.token.balanceOf(recipient);
          senderBalance.should.be.bignumber.equal(newSenderBalance.plus(streamedAmount).minus(deposit));
          recipientBalance.should.be.bignumber.equal(newRecipientBalance.minus(streamedAmount));
        });

        it("deletes the stream object", async function() {
          await this.sablier.cancel(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        });

        it("emits a cancel event", async function() {
          const result = await this.sablier.cancel(streamId, opts);
          truffleAssert.eventEmitted(result, "Cancel");
        });
      });

      describe("when the stream did end", function() {
        beforeEach(async function() {
          await web3.utils.advanceTimeAndBlock(
            STANDARD_TIME_OFFSET.plus(STANDARD_TIME_DELTA)
              .plus(1)
              .toNumber(),
          );
        });

        it("cancels the stream and transfers all tokens to the recipient", async function() {
          const balance = await this.token.balanceOf(recipient);
          await this.sablier.cancel(streamId, opts);
          const newBalance = await this.token.balanceOf(recipient);
          balance.should.be.bignumber.equal(newBalance.minus(deposit));
        });

        it("deletes the stream object", async function() {
          await this.sablier.cancel(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        });

        it("emits a cancel event", async function() {
          const result = await this.sablier.cancel(streamId, opts);
          truffleAssert.eventEmitted(result, "Cancel");
        });
      });
    });

    describe("when the caller is the recipient of the stream", function() {
      const opts = { from: sender };

      describe("when the stream did not start", function() {
        it("cancels the stream and transfers all tokens to the sender", async function() {
          const balance = await this.token.balanceOf(sender);
          await this.sablier.cancel(streamId, opts);
          const newBalance = await this.token.balanceOf(sender);
          balance.should.be.bignumber.equal(newBalance.minus(deposit));
        });

        it("deletes the stream object", async function() {
          await this.sablier.cancel(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        });

        it("emits a cancel event", async function() {
          const result = await this.sablier.cancel(streamId, opts);
          truffleAssert.eventEmitted(result, "Cancel");
        });
      });

      describe("when the stream did start but not end", function() {
        const streamingTime = new BigNumber(1);
        const streamedAmount = new BigNumber(1).multipliedBy(1e18);

        beforeEach(async function() {
          await web3.utils.advanceTimeAndBlock(STANDARD_TIME_OFFSET.plus(streamingTime).toNumber());
        });

        it("cancels the stream and transfers tokens on a pro rata basis", async function() {
          const senderBalance = await this.token.balanceOf(sender);
          const recipientBalance = await this.token.balanceOf(recipient);
          await this.sablier.cancel(streamId, opts);
          const newSenderBalance = await this.token.balanceOf(sender);
          const newRecipientBalance = await this.token.balanceOf(recipient);
          senderBalance.should.be.bignumber.equal(newSenderBalance.plus(streamedAmount).minus(deposit));
          recipientBalance.should.be.bignumber.equal(newRecipientBalance.minus(streamedAmount));
        });

        it("deletes the stream object", async function() {
          await this.sablier.cancel(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        });

        it("emits a cancel event", async function() {
          const result = await this.sablier.cancel(streamId, opts);
          truffleAssert.eventEmitted(result, "Cancel");
        });
      });

      describe("when the stream did end", function() {
        beforeEach(async function() {
          await web3.utils.advanceTimeAndBlock(
            STANDARD_TIME_OFFSET.plus(STANDARD_TIME_DELTA)
              .plus(1)
              .toNumber(),
          );
        });

        it("cancels the stream and transfers all tokens to the recipient", async function() {
          const balance = await this.token.balanceOf(recipient);
          await this.sablier.cancel(streamId, opts);
          const newBalance = await this.token.balanceOf(recipient);
          balance.should.be.bignumber.equal(newBalance.minus(deposit));
        });

        it("deletes the stream object", async function() {
          await this.sablier.cancel(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        });

        it("emits a cancel event", async function() {
          const result = await this.sablier.cancel(streamId, opts);
          truffleAssert.eventEmitted(result, "Cancel");
        });
      });
    });

    describe("when the caller is not the sender or the recipient of the stream", function() {
      const opts = { from: eve };

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.cancel(streamId, opts),
          "caller is not the stream or the recipient of the stream",
        );
      });
    });
  });

  describe("when the stream does not exist", function() {
    const recipient = bob;
    const opts = { from: recipient };

    it("reverts", async function() {
      const streamId = new BigNumber(1);
      await truffleAssert.reverts(this.sablier.cancel(streamId, opts), "stream does not exist");
    });
  });
}

module.exports = shouldBehaveLikeERC1620Cancel;
