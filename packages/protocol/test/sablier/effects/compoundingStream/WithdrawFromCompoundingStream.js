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
  let streamId;
  const sender = alice;
  const recipient = bob;
  const deposit = STANDARD_SALARY_CTOKEN.toString(10);
  const opts = { from: sender };
  const now = new BigNumber(dayjs().unix());
  const startTime = now.plus(STANDARD_TIME_OFFSET);
  const stopTime = startTime.plus(STANDARD_TIME_DELTA);

  beforeEach(async function() {
    await this.sablier.whitelistCToken(this.cToken.address, opts);
    await this.cToken.approve(this.sablier.address, deposit, opts);
  });

  describe("when the sablier fee is not zero and is not 100", function() {
    beforeEach(async function() {
      await this.sablier.updateFee(STANDARD_SABLIER_FEE);
    });

    describe("when the sender's interest share is not zero and the recipient's interest share is not zero", function() {
      const senderShare = STANDARD_SENDER_SHARE;
      const recipientShare = STANDARD_RECIPIENT_SHARE;

      beforeEach(async function() {
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
        streamId = Number(result.logs[0].args.streamId);
      });

      describe("when the stream did not start", function() {
        const amount = FIVE_UNITS_CTOKEN.toString(10);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.sablier.withdrawFromStream(streamId, amount, opts),
            "amount exceeds the available balance",
          );
        });
      });

      describe("when the stream did start but not end", function() {
        const amount = FIVE_UNITS_CTOKEN.toString(10);

        beforeEach(async function() {
          await traveler.advanceBlockAndSetTime(
            now
              .plus(STANDARD_TIME_OFFSET)
              .plus(5)
              .toNumber(),
          );
        });

        it("withdraws from the stream", async function() {
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
          newBalance.should.be.bignumber.equal(balance.plus(senderInterest));
        });

        it("transfers the tokens and pays the interest to the recipient of the stream", async function() {
          const balance = await this.cToken.balanceOf(recipient);
          const result = await this.sablier.withdrawFromStream(streamId, amount, opts);
          const netWithdrawalAmount = result.logs[0].args.amount;
          const newBalance = await this.cToken.balanceOf(recipient);
          newBalance.should.be.bignumber.equal(balance.plus(netWithdrawalAmount));
        });

        it("pays the interest to the sablier contract", async function() {
          const earnings = await this.sablier.earnings(this.cToken.address);
          const balance = await this.cToken.balanceOf(this.sablier.address);
          const result = await this.sablier.withdrawFromStream(streamId, amount, opts);
          const sablierInterest = result.logs[1].args.sablierInterest;
          const newEarnings = await this.sablier.earnings(this.cToken.address);
          const newBalance = await this.cToken.balanceOf(this.sablier.address);

          // The sender and the recipient's interests are included in `amount`, so we don't
          // subtract them again
          newEarnings.should.be.bignumber.equal(earnings.plus(sablierInterest));
          newBalance.should.be.bignumber.equal(balance.minus(amount).plus(sablierInterest));
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
          const tolerateByAddition = false;
          newBalance.should.tolerateTheBlockTimeVariation(
            balance.minus(amount),
            STANDARD_SCALE_CTOKEN,
            tolerateByAddition,
          );
        });

        afterEach(async function() {
          await traveler.advanceBlockAndSetTime(now.toNumber());
        });
      });

      describe("when the stream did end", function() {
        const amount = STANDARD_SALARY_CTOKEN.toString(10);

        beforeEach(async function() {
          await traveler.advanceBlockAndSetTime(
            now
              .plus(STANDARD_TIME_OFFSET)
              .plus(STANDARD_TIME_DELTA)
              .plus(5)
              .toNumber(),
          );
        });

        it("withdraws from the stream", async function() {
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
          newBalance.should.be.bignumber.equal(balance.plus(senderInterest));
        });

        it("transfers the tokens and pays the interest to the recipient of the stream", async function() {
          const balance = await this.cToken.balanceOf(recipient);
          const result = await this.sablier.withdrawFromStream(streamId, amount, opts);
          const netWithdrawalAmount = result.logs[0].args.amount;
          const newBalance = await this.cToken.balanceOf(recipient);
          newBalance.should.be.bignumber.equal(balance.plus(netWithdrawalAmount));
        });

        it("pays the interest to the sablier contract", async function() {
          const earnings = await this.sablier.earnings(this.cToken.address);
          const balance = await this.cToken.balanceOf(this.sablier.address);
          const result = await this.sablier.withdrawFromStream(streamId, amount, opts);
          const sablierInterest = result.logs[1].args.sablierInterest;
          const newEarnings = await this.sablier.earnings(this.cToken.address);
          const newBalance = await this.cToken.balanceOf(this.sablier.address);

          // The sender and the recipient's interests are included in `amount`, so we don't
          // subtract them again
          newEarnings.should.be.bignumber.equal(earnings.plus(sablierInterest));
          newBalance.should.be.bignumber.equal(balance.minus(amount).plus(sablierInterest));
        });

        it("emits a withdrawfromstream event", async function() {
          const result = await this.sablier.withdrawFromStream(streamId, amount, opts);
          await truffleAssert.eventEmitted(result, "WithdrawFromStream");
        });

        it("emits a payinterest event", async function() {
          const result = await this.sablier.withdrawFromStream(streamId, amount, opts);
          await truffleAssert.eventEmitted(result, "PayInterest");
        });

        it("deletes the stream objects", async function() {
          await this.sablier.withdrawFromStream(streamId, amount, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
          await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
        });

        afterEach(async function() {
          await traveler.advanceBlockAndSetTime(now.toNumber());
        });
      });
    });

    describe("when the sender's interest share is zero", function() {
      const amount = FIVE_UNITS_CTOKEN.toString(10);
      const senderShare = new BigNumber(0);
      const recipientShare = new BigNumber(100);

      beforeEach(async function() {
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
        streamId = Number(result.logs[0].args.streamId);
        await traveler.advanceBlockAndSetTime(
          now
            .plus(STANDARD_TIME_OFFSET)
            .plus(5)
            .toNumber(),
        );
      });

      it("withdraws from the stream", async function() {
        const senderBalance = await this.cToken.balanceOf(sender);
        const recipientBalance = await this.cToken.balanceOf(recipient);
        const sablierBalance = await this.cToken.balanceOf(this.sablier.address);
        await this.sablier.withdrawFromStream(streamId, amount, opts);
        const newSenderBalance = await this.cToken.balanceOf(sender);
        const newRecipientBalance = await this.cToken.balanceOf(recipient);
        const newSablierBalance = await this.cToken.balanceOf(this.sablier.address);

        const sum = senderBalance.plus(recipientBalance).plus(sablierBalance);
        const newSum = newSenderBalance.plus(newRecipientBalance).plus(newSablierBalance);
        newSum.should.be.bignumber.equal(sum);
      });

      afterEach(async function() {
        await traveler.advanceBlockAndSetTime(now.toNumber());
      });
    });

    describe("when the recipient's interest share is zero", function() {
      const amount = FIVE_UNITS_CTOKEN.toString(10);
      const senderShare = new BigNumber(100);
      const recipientShare = new BigNumber(0);

      beforeEach(async function() {
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
        streamId = Number(result.logs[0].args.streamId);
        await traveler.advanceBlockAndSetTime(
          now
            .plus(STANDARD_TIME_OFFSET)
            .plus(5)
            .toNumber(),
        );
      });

      it("withdraws from the stream", async function() {
        const senderBalance = await this.cToken.balanceOf(sender);
        const recipientBalance = await this.cToken.balanceOf(recipient);
        const sablierBalance = await this.cToken.balanceOf(this.sablier.address);
        await this.sablier.withdrawFromStream(streamId, amount, opts);
        const newSenderBalance = await this.cToken.balanceOf(sender);
        const newRecipientBalance = await this.cToken.balanceOf(recipient);
        const newSablierBalance = await this.cToken.balanceOf(this.sablier.address);

        const sum = senderBalance.plus(recipientBalance).plus(sablierBalance);
        const newSum = newSenderBalance.plus(newRecipientBalance).plus(newSablierBalance);
        newSum.should.be.bignumber.equal(sum);
      });

      afterEach(async function() {
        await traveler.advanceBlockAndSetTime(now.toNumber());
      });
    });
  });

  describe("when the sablier fee is zero", function() {
    const amount = FIVE_UNITS_CTOKEN.toString(10);
    const senderShare = STANDARD_SENDER_SHARE;
    const recipientShare = STANDARD_RECIPIENT_SHARE;

    beforeEach(async function() {
      await this.sablier.updateFee(new BigNumber(0));
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
      streamId = Number(result.logs[0].args.streamId);
      await traveler.advanceBlockAndSetTime(
        now
          .plus(STANDARD_TIME_OFFSET)
          .plus(5)
          .toNumber(),
      );
    });

    it("withdraws from the stream", async function() {
      const senderBalance = await this.cToken.balanceOf(sender);
      const recipientBalance = await this.cToken.balanceOf(recipient);
      const sablierBalance = await this.cToken.balanceOf(this.sablier.address);
      await this.sablier.withdrawFromStream(streamId, amount, opts);
      const newSenderBalance = await this.cToken.balanceOf(sender);
      const newRecipientBalance = await this.cToken.balanceOf(recipient);
      const newSablierBalance = await this.cToken.balanceOf(this.sablier.address);

      const sum = senderBalance.plus(recipientBalance).plus(sablierBalance);
      const newSum = newSenderBalance.plus(newRecipientBalance).plus(newSablierBalance);
      newSum.should.be.bignumber.equal(sum);
    });

    afterEach(async function() {
      await traveler.advanceBlockAndSetTime(now.toNumber());
    });
  });

  describe("when the sablier fee is 100", function() {
    const amount = FIVE_UNITS_CTOKEN.toString(10);
    const senderShare = STANDARD_SENDER_SHARE;
    const recipientShare = STANDARD_RECIPIENT_SHARE;

    beforeEach(async function() {
      await this.sablier.updateFee(new BigNumber(100));
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
      streamId = Number(result.logs[0].args.streamId);
      await traveler.advanceBlockAndSetTime(
        now
          .plus(STANDARD_TIME_OFFSET)
          .plus(5)
          .toNumber(),
      );
    });

    it("withdraws from the stream", async function() {
      const senderBalance = await this.cToken.balanceOf(sender);
      const recipientBalance = await this.cToken.balanceOf(recipient);
      const sablierBalance = await this.cToken.balanceOf(this.sablier.address);
      await this.sablier.withdrawFromStream(streamId, amount, opts);
      const newSenderBalance = await this.cToken.balanceOf(sender);
      const newRecipientBalance = await this.cToken.balanceOf(recipient);
      const newSablierBalance = await this.cToken.balanceOf(this.sablier.address);

      const sum = senderBalance.plus(recipientBalance).plus(sablierBalance);
      const newSum = newSenderBalance.plus(newRecipientBalance).plus(newSablierBalance);
      newSum.should.be.bignumber.equal(sum);
    });

    afterEach(async function() {
      await traveler.advanceBlockAndSetTime(now.toNumber());
    });
  });
}

module.exports = shouldBehaveLikeWithdrawFromCompoundingStream;
