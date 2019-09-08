const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

const {
  FIVE_UNITS_CTOKEN,
  ONE_UNIT_CTOKEN,
  STANDARD_RECIPIENT_SHARE,
  STANDARD_SABLIER_FEE,
  STANDARD_SALARY_CTOKEN,
  STANDARD_SCALE_CTOKEN,
  STANDARD_SENDER_SHARE,
  STANDARD_TIME_OFFSET,
  STANDARD_TIME_DELTA,
} = devConstants;

function shouldBehaveLikeWithdrawFromCompoundingStream(alice, bob) {
  const now = new BigNumber(dayjs().unix());

  describe("when the stream did start but not end", function() {
    let streamId;
    const sender = alice;
    const recipient = bob;
    const deposit = STANDARD_SALARY_CTOKEN.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);
    const senderShare = STANDARD_SENDER_SHARE;
    const recipientShare = STANDARD_RECIPIENT_SHARE;
    const opts = { from: sender };
    const amount = FIVE_UNITS_CTOKEN.toString(10);

    describe("when the fee is not 0", function() {
      beforeEach(async function() {
        await this.sablier.updateFee(STANDARD_SABLIER_FEE);
        await this.sablier.whitelistCToken(this.cToken.address, opts);
        await this.cToken.approve(this.sablier.address, deposit, opts);
        const result = await this.sablier.createCompoundingStream(
          recipient,
          deposit,
          this.cToken.address,
          startTime,
          stopTime,
          senderShare,
          recipientShare,
          opts,
        );
        streamId = result.logs[0].args.streamId;
        await traveler.advanceBlockAndSetTime(
          now
            .plus(STANDARD_TIME_OFFSET)
            .plus(5)
            .toNumber(),
        );
      });

      it("makes the withdrawal", async function() {
        const senderBalance = await this.cToken.balanceOf(sender);
        const recipientBalance = await this.cToken.balanceOf(recipient);
        const sablierBalance = await this.cToken.balanceOf(this.sablier.address);
        await this.sablier.withdrawFromStream(streamId, amount, opts);
        const newSenderBalance = await this.cToken.balanceOf(sender);
        const newRecipientBalance = await this.cToken.balanceOf(recipient);
        const newSablierBalance = await this.cToken.balanceOf(this.sablier.address);

        const sum = senderBalance.plus(recipientBalance).plus(sablierBalance);
        const newSum = newSenderBalance.plus(newRecipientBalance).plus(newSablierBalance);
        sum.should.be.bignumber.equal(newSum);
      });

      it("pays the interest to the sender of the stream", async function() {
        const balance = await this.cToken.balanceOf(sender);
        const result = await this.sablier.withdrawFromStream(streamId, amount, opts);
        const senderInterest = result.logs[1].args.senderInterest;
        const newBalance = await this.cToken.balanceOf(sender);
        balance.should.be.bignumber.equal(newBalance.minus(senderInterest));
      });

      it("pays the interest to the recipient", async function() {
        const balance = await this.cToken.balanceOf(recipient);
        const result = await this.sablier.withdrawFromStream(streamId, amount, opts);
        const senderInterest = result.logs[1].args.senderInterest;
        const sablierInterest = result.logs[1].args.sablierInterest;
        const newBalance = await this.cToken.balanceOf(recipient);

        // The recipient's interest is included in `amount`, so we don't add it in the
        // equation again
        balance.should.be.bignumber.equal(
          newBalance
            .minus(amount)
            .plus(senderInterest)
            .plus(sablierInterest),
        );
      });

      it("pays the interest to the sablier contract", async function() {
        const earnings = await this.sablier.earnings(this.cToken.address);
        const balance = await this.cToken.balanceOf(this.sablier.address);
        const result = await this.sablier.withdrawFromStream(streamId, amount, opts);
        const sablierInterest = result.logs[1].args.sablierInterest;
        const newEarnings = await this.sablier.earnings(this.cToken.address);
        const newBalance = await this.cToken.balanceOf(this.sablier.address);

        // The sender and the recipient's interests are included in `amount`, so we don't put
        // them in the equation again
        earnings.should.be.bignumber.equal(newEarnings.minus(sablierInterest));
        balance.should.be.bignumber.equal(newBalance.plus(amount).minus(sablierInterest));
      });

      it("emits a withdrawfromstream event", async function() {
        const result = await this.sablier.withdrawFromStream(streamId, amount, opts);
        await truffleAssert.eventEmitted(result, "WithdrawFromStream");
      });

      it("emits a payinterest event", async function() {
        const result = await this.sablier.withdrawFromStream(streamId, amount, opts);
        await truffleAssert.eventEmitted(result, "PayInterest");
      });

      it("decreases the stream balance", async function() {
        const balance = await this.sablier.balanceOf(streamId, recipient);
        await this.sablier.withdrawFromStream(streamId, amount, opts);
        const newBalance = await this.sablier.balanceOf(streamId, recipient);
        balance.should.tolerateTheBlockTimeVariation(newBalance.plus(amount), STANDARD_SCALE_CTOKEN);
      });

      afterEach(async function() {
        await traveler.advanceBlockAndSetTime(now.toNumber());
      });
    });

    // describe("when the fee is 0", function() {
    //   beforeEach(async function() {
    //     await this.sablier.updateFee(new BigNumber(0));
    //   });
    // });
  });

  describe("when the stream did end", function() {
    let streamId;
    const sender = alice;
    const recipient = bob;
    const deposit = STANDARD_SALARY_CTOKEN.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);
    const senderShare = STANDARD_SENDER_SHARE;
    const recipientShare = STANDARD_RECIPIENT_SHARE;
    const opts = { from: sender };

    beforeEach(async function() {
      await this.sablier.whitelistCToken(this.cToken.address, opts);
      await this.cToken.approve(this.sablier.address, deposit, opts);
      const result = await this.sablier.createCompoundingStream(
        recipient,
        deposit,
        this.cToken.address,
        startTime,
        stopTime,
        senderShare,
        recipientShare,
        opts,
      );
      streamId = result.logs[0].args.streamId;
      await traveler.advanceBlockAndSetTime(
        now
          .plus(STANDARD_TIME_OFFSET)
          .plus(STANDARD_TIME_DELTA)
          .plus(5)
          .toNumber(),
      );
    });

    describe("when the balance is withdrawn in full", function() {
      const amount = STANDARD_SALARY_CTOKEN.toString(10);

      describe("when the fee is not 0", function() {
        beforeEach(async function() {
          await this.sablier.updateFee(STANDARD_SABLIER_FEE);
        });

        it("deletes the storage objects", async function() {
          await this.sablier.withdrawFromStream(streamId, amount, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
          await truffleAssert.reverts(this.sablier.getCompoundForStream(streamId), "stream does not exist");
        });
      });
    });

    afterEach(async function() {
      await traveler.advanceBlockAndSetTime(now.toNumber());
    });
  });
}

module.exports = shouldBehaveLikeWithdrawFromCompoundingStream;
