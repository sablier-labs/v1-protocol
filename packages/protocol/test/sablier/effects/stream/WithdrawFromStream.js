const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { contextForStreamDidEnd, contextForStreamDidStartButNotEnd } = mochaContexts;
const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA } = devConstants;

function runTests() {
  describe("when not paused", function() {
    describe("when the withdrawal amount is higher than 0", function() {
      describe("when the stream did not start", function() {
        const withdrawalAmount = FIVE_UNITS.toString(10);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts),
            "amount exceeds the available balance",
          );
        });
      });

      contextForStreamDidStartButNotEnd(function() {
        describe("when the withdrawal amount does not exceed the available balance", function() {
          const withdrawalAmount = FIVE_UNITS.toString(10);

          it("withdraws from the stream", async function() {
            const balance = await this.token.balanceOf(this.recipient);
            await this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts);
            const newBalance = await this.token.balanceOf(this.recipient);
            newBalance.should.be.bignumber.equal(balance.plus(FIVE_UNITS));
          });

          it("emits a withdrawfromstream event", async function() {
            const result = await this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts);
            truffleAssert.eventEmitted(result, "WithdrawFromStream");
          });

          it("decreases the stream balance", async function() {
            const balance = await this.sablier.balanceOf(this.streamId, this.recipient, this.opts);
            await this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts);
            const newBalance = await this.sablier.balanceOf(this.streamId, this.recipient, this.opts);
            // Intuitively, one may say we don't have to tolerate the block time variation here.
            // However, the Sablier balance for the recipient can only go up from the bottom
            // low of `balance` - `amount`, due to uncontrollable runtime costs.
            newBalance.should.tolerateTheBlockTimeVariation(balance.minus(withdrawalAmount), STANDARD_SCALE);
          });
        });

        describe("when the withdrawal amount exceeds the available balance", function() {
          const withdrawalAmount = FIVE_UNITS.multipliedBy(2).toString(10);

          it("reverts", async function() {
            await truffleAssert.reverts(
              this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts),
              "amount exceeds the available balance",
            );
          });
        });
      });

      contextForStreamDidEnd(function() {
        describe("when the withdrawal amount does not exceed the available balance", function() {
          describe("when the balance is not withdrawn in full", function() {
            const withdrawalAmount = STANDARD_SALARY.dividedBy(2).toString(10);

            it("withdraws from the stream", async function() {
              const balance = await this.token.balanceOf(this.recipient);
              await this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts);
              const newBalance = await this.token.balanceOf(this.recipient);
              newBalance.should.be.bignumber.equal(balance.plus(withdrawalAmount));
            });

            it("emits a withdrawfromstream event", async function() {
              const result = await this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts);
              truffleAssert.eventEmitted(result, "WithdrawFromStream");
            });

            it("decreases the stream balance", async function() {
              const balance = await this.sablier.balanceOf(this.streamId, this.recipient);
              await this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts);
              const newBalance = await this.sablier.balanceOf(this.streamId, this.recipient);
              newBalance.should.be.bignumber.equal(balance.minus(withdrawalAmount));
            });
          });

          describe("when the balance is withdrawn in full", function() {
            const withdrawalAmount = STANDARD_SALARY.toString(10);

            it("withdraws from the stream", async function() {
              const balance = await this.token.balanceOf(this.recipient);
              await this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts);
              const newBalance = await this.token.balanceOf(this.recipient);
              newBalance.should.be.bignumber.equal(balance.plus(withdrawalAmount));
            });

            it("emits a withdrawfromstream event", async function() {
              const result = await this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts);
              truffleAssert.eventEmitted(result, "WithdrawFromStream");
            });

            it("deletes the stream object", async function() {
              await this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts);
              await truffleAssert.reverts(this.sablier.getStream(this.streamId), "stream does not exist");
            });
          });
        });

        describe("when the withdrawal amount exceeds the available balance", function() {
          const withdrawalAmount = STANDARD_SALARY.plus(FIVE_UNITS).toString(10);

          it("reverts", async function() {
            await truffleAssert.reverts(
              this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts),
              "amount exceeds the available balance",
            );
          });
        });
      });
    });

    describe("when the withdrawal amount is zero", function() {
      const withdrawalAmount = new BigNumber(0).toString(10);

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts),
          "amount is zero",
        );
      });
    });
  });

  describe("when paused", function() {
    const withdrawalAmount = FIVE_UNITS.toString(10);

    beforeEach(async function() {
      // Note that `sender` coincides with the owner of the contract
      await this.sablier.pause({ from: this.sender });
    });

    it("reverts", async function() {
      await truffleAssert.reverts(
        this.sablier.withdrawFromStream(this.streamId, withdrawalAmount, this.opts),
        "Pausable: paused",
      );
    });
  });
}

function shouldBehaveLikeERC1620WithdrawFromStream(alice, bob, eve) {
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
          this.sablier.withdrawFromStream(this.streamId, FIVE_UNITS, opts),
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
      await truffleAssert.reverts(this.sablier.withdrawFromStream(streamId, FIVE_UNITS, opts), "stream does not exist");
    });
  });
}

module.exports = shouldBehaveLikeERC1620WithdrawFromStream;
