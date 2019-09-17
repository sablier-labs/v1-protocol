const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

const {
  FIVE_UNITS_CTOKEN,
  STANDARD_RECIPIENT_SHARE_PERCENTAGE,
  STANDARD_SABLIER_FEE,
  STANDARD_SALARY_CTOKEN,
  STANDARD_SCALE_CTOKEN,
  STANDARD_SENDER_SHARE_PERCENTAGE,
  STANDARD_TIME_OFFSET,
  STANDARD_TIME_DELTA,
} = devConstants;

function shouldBehaveLikeCancelCompoundingStream(alice, bob) {
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
      const senderSharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
      const recipientSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;

      beforeEach(async function() {
        const result = await this.sablier.createCompoundingStream(
          recipient,
          deposit,
          this.cToken.address,
          startTime,
          stopTime,
          senderSharePercentage,
          recipientSharePercentage,
          opts,
        );
        streamId = Number(result.logs[0].args.streamId);
      });

      describe("when there are no prior withdrawals", function() {
        describe("when the stream did not start", function() {
          it("cancels the stream", async function() {
            await this.sablier.cancelStream(streamId, opts);
            await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
            await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
          });
        });

        describe("when the stream did start but not end", function() {
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
            await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
          });

          it("transfers the tokens and pays the interest to the sender of the stream", async function() {
            const balance = await this.cToken.balanceOf(sender);
            const result = await this.sablier.cancelStream(streamId, opts);
            const senderBalance = result.logs[0].args.senderBalance;
            const newBalance = await this.cToken.balanceOf(sender);
            newBalance.should.be.bignumber.equal(balance.plus(senderBalance));
          });

          it("transfers the tokens and pays the interest to the recipient of the stream", async function() {
            const balance = await this.cToken.balanceOf(recipient);
            const result = await this.sablier.cancelStream(streamId, opts);
            const recipientBalance = result.logs[0].args.recipientBalance;
            const newBalance = await this.cToken.balanceOf(recipient);
            newBalance.should.be.bignumber.equal(balance.plus(recipientBalance));
          });

          it("pays the interest to the sablier contract", async function() {
            const earnings = await this.sablier.earnings(this.cToken.address);
            const balance = await this.cToken.balanceOf(this.sablier.address);
            const stream = await this.sablier.contract.methods.getStream(streamId).call();
            const result = await this.sablier.cancelStream(streamId, opts);
            const sablierInterest = result.logs[1].args.sablierInterest;
            const newEarnings = await this.sablier.earnings(this.cToken.address);
            const newBalance = await this.cToken.balanceOf(this.sablier.address);

            // The sender and the recipient's interests are included in `stream.balance`, so we don't
            // subtract them again
            earnings.should.be.bignumber.equal(newEarnings.minus(sablierInterest));
            newBalance.should.be.bignumber.equal(balance.minus(stream.remainingBalance).plus(sablierInterest));
          });

          it("emits a cancelstream event", async function() {
            const result = await this.sablier.cancelStream(streamId, opts);
            await truffleAssert.eventEmitted(result, "CancelStream");
          });

          it("emits a payinterest event", async function() {
            const result = await this.sablier.cancelStream(streamId, opts);
            await truffleAssert.eventEmitted(result, "PayInterest");
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
            await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
          });

          it("transfers the tokens and pays the interest to the sender of the stream", async function() {
            const balance = await this.cToken.balanceOf(sender);
            const result = await this.sablier.cancelStream(streamId, opts);
            const senderBalance = result.logs[0].args.senderBalance;
            const newBalance = await this.cToken.balanceOf(sender);
            newBalance.should.be.bignumber.equal(balance.plus(senderBalance));
          });

          it("transfers the tokens and pays the interest to the recipient of the stream", async function() {
            const balance = await this.cToken.balanceOf(recipient);
            const result = await this.sablier.cancelStream(streamId, opts);
            const recipientBalance = result.logs[0].args.recipientBalance;
            const newBalance = await this.cToken.balanceOf(recipient);
            newBalance.should.be.bignumber.equal(balance.plus(recipientBalance));
          });

          it("pays the interest to the sablier contract", async function() {
            const earnings = await this.sablier.earnings(this.cToken.address);
            const balance = await this.cToken.balanceOf(this.sablier.address);
            const stream = await this.sablier.contract.methods.getStream(streamId).call();
            const result = await this.sablier.cancelStream(streamId, opts);
            const sablierInterest = result.logs[1].args.sablierInterest;
            const newEarnings = await this.sablier.earnings(this.cToken.address);
            const newBalance = await this.cToken.balanceOf(this.sablier.address);

            // The sender and the recipient's interests are included in `stream.balance`, so we don't
            // subtract them again
            earnings.should.be.bignumber.equal(newEarnings.minus(sablierInterest));
            newBalance.should.be.bignumber.equal(balance.minus(stream.remainingBalance).plus(sablierInterest));
          });

          it("emits a cancelstream event", async function() {
            const result = await this.sablier.cancelStream(streamId, opts);
            await truffleAssert.eventEmitted(result, "CancelStream");
          });

          it("emits a payinterest event", async function() {
            const result = await this.sablier.cancelStream(streamId, opts);
            await truffleAssert.eventEmitted(result, "PayInterest");
          });

          afterEach(async function() {
            await traveler.advanceBlockAndSetTime(now.toNumber());
          });
        });
      });

      describe("when there are prior withdrawals", function() {
        beforeEach(async function() {
          await traveler.advanceBlockAndSetTime(
            now
              .plus(STANDARD_TIME_OFFSET)
              .plus(5)
              .toNumber(),
          );
          const amount = FIVE_UNITS_CTOKEN.toString(10);
          await this.sablier.withdrawFromStream(streamId, amount, opts);
        });

        it("cancels the stream", async function() {
          await this.sablier.cancelStream(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
          await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
        });

        afterEach(async function() {
          await traveler.advanceBlockAndSetTime(now.toNumber());
        });
      });
    });

    describe("when the sender's interest share is zero", function() {
      const senderSharePercentage = new BigNumber(0);
      const recipientSharePercentage = new BigNumber(100);

      beforeEach(async function() {
        const result = await this.sablier.createCompoundingStream(
          recipient,
          deposit,
          this.cToken.address,
          startTime,
          stopTime,
          senderSharePercentage,
          recipientSharePercentage,
          opts,
        );
        streamId = Number(result.logs[0].args.streamId);
      });

      describe("when the stream did not start", function() {
        it("cancels the stream", async function() {
          await this.sablier.cancelStream(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
          await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
        });
      });

      describe("when the stream did start but not end", function() {
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
          await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
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
          await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
        });

        afterEach(async function() {
          await traveler.advanceBlockAndSetTime(now.toNumber());
        });
      });
    });

    describe("when the recipient's interest share is zero", function() {
      const senderSharePercentage = new BigNumber(100);
      const recipientSharePercentage = new BigNumber(0);

      beforeEach(async function() {
        const result = await this.sablier.createCompoundingStream(
          recipient,
          deposit,
          this.cToken.address,
          startTime,
          stopTime,
          senderSharePercentage,
          recipientSharePercentage,
          opts,
        );
        streamId = Number(result.logs[0].args.streamId);
      });

      describe("when the stream did not start", function() {
        it("cancels the stream", async function() {
          await this.sablier.cancelStream(streamId, opts);
          await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
          await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
        });
      });

      describe("when the stream did start but not end", function() {
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
          await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
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
          await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
        });

        afterEach(async function() {
          await traveler.advanceBlockAndSetTime(now.toNumber());
        });
      });
    });
  });

  describe("when the sablier fee is zero", function() {
    const senderSharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
    const recipientSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;

    beforeEach(async function() {
      await this.sablier.updateFee(new BigNumber(0));
      const result = await this.sablier.createCompoundingStream(
        recipient,
        deposit,
        this.cToken.address,
        startTime,
        stopTime,
        senderSharePercentage,
        recipientSharePercentage,
        opts,
      );
      streamId = Number(result.logs[0].args.streamId);
    });

    describe("when the stream did not start", function() {
      it("cancels the stream", async function() {
        await this.sablier.cancelStream(streamId, opts);
        await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
      });
    });

    describe("when the stream did start but not end", function() {
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
        await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
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
        await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
      });

      afterEach(async function() {
        await traveler.advanceBlockAndSetTime(now.toNumber());
      });
    });
  });

  describe("when the sablier fee is 100", function() {
    const senderSharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
    const recipientSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;

    beforeEach(async function() {
      await this.sablier.updateFee(new BigNumber(100));
      const result = await this.sablier.createCompoundingStream(
        recipient,
        deposit,
        this.cToken.address,
        startTime,
        stopTime,
        senderSharePercentage,
        recipientSharePercentage,
        opts,
      );
      streamId = Number(result.logs[0].args.streamId);
    });

    describe("when the stream did not start", function() {
      it("cancels the stream", async function() {
        await this.sablier.cancelStream(streamId, opts);
        await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
      });
    });

    describe("when the stream did start but not end", function() {
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
        await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
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
        await truffleAssert.reverts(this.sablier.getCompoundingStreamVars(streamId), "stream does not exist");
      });

      afterEach(async function() {
        await traveler.advanceBlockAndSetTime(now.toNumber());
      });
    });
  });
}

module.exports = shouldBehaveLikeCancelCompoundingStream;
