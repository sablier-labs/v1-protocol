const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

const { FIVE_UNITS, ONE_UNIT, STANDARD_SALARY, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA } = devConstants;

function shouldBehaveLikeERC1620Withdraw(alice, bob, eve) {
  const now = new BigNumber(dayjs().unix());

  describe("when the stream exists", function() {
    let streamId;
    const sender = alice;
    const recipient = bob;
    const deposit = STANDARD_SALARY.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);

    beforeEach(async function() {
      const opts = { from: sender };
      await this.token.approve(this.sablier.address, deposit, opts);
      const result = await this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts);
      streamId = result.logs[0].args.streamId;
    });

    describe("when the caller is the sender of the stream", function() {
      const opts = { from: sender };

      describe("when the withdrawal amount is higher than 0", function() {
        describe("when the stream did not start", function() {
          it("reverts", async function() {
            await truffleAssert.reverts(
              this.sablier.withdraw(streamId, FIVE_UNITS, opts),
              "withdrawal exceeds the available balance",
            );
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

          describe("when the withdrawal amount is within the available balance", function() {
            it("makes the withdrawal", async function() {
              const balance = await this.token.balanceOf(recipient);
              await this.sablier.withdraw(streamId, FIVE_UNITS, opts);
              const newBalance = await this.token.balanceOf(recipient);
              balance.should.bignumber.satisfy(function(num) {
                return (
                  num.isEqualTo(newBalance.minus(FIVE_UNITS)) ||
                  num.isEqualTo(newBalance.minus(FIVE_UNITS).plus(ONE_UNIT))
                );
              });
            });

            it("emits a withdraw event", async function() {
              const result = await this.sablier.withdraw(streamId, FIVE_UNITS, opts);
              truffleAssert.eventEmitted(result, "Withdraw");
            });

            it("decreases the stream balance", async function() {
              const balance = await this.sablier.balanceOf(streamId, recipient);
              await this.sablier.withdraw(streamId, FIVE_UNITS, opts);
              const newBalance = await this.sablier.balanceOf(streamId, recipient);
              balance.should.bignumber.satisfy(function(num) {
                return (
                  num.isEqualTo(newBalance.plus(FIVE_UNITS)) ||
                  num.isEqualTo(newBalance.plus(FIVE_UNITS).plus(ONE_UNIT))
                );
              });
            });
          });

          describe("when the withdrawal amount is not within the available balance", function() {
            const amount = FIVE_UNITS.multipliedBy(2).toString(10);

            it("reverts", async function() {
              await truffleAssert.reverts(
                this.sablier.withdraw(streamId, amount, opts),
                "withdrawal exceeds the available balance",
              );
            });
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

          describe("when the withdrawal amount is within the available balance", function() {
            describe("when the balance is withdrawn in full", function() {
              const amount = STANDARD_SALARY.toString(10);

              it("makes the withdrawal", async function() {
                const balance = await this.token.balanceOf(recipient);
                await this.sablier.withdraw(streamId, amount, opts);
                const newBalance = await this.token.balanceOf(recipient);
                balance.should.be.bignumber.equal(newBalance.minus(amount));
              });

              it("emits a withdraw event", async function() {
                const result = await this.sablier.withdraw(streamId, amount, opts);
                truffleAssert.eventEmitted(result, "Withdraw");
              });

              it("deletes the stream object", async function() {
                await this.sablier.withdraw(streamId, amount, opts);
                await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
              });
            });

            describe("when the balance is not withdrawn in full", function() {
              const amount = STANDARD_SALARY.dividedBy(2).toString(10);

              it("makes the withdrawal", async function() {
                const balance = await this.token.balanceOf(recipient);
                await this.sablier.withdraw(streamId, amount, opts);
                const newBalance = await this.token.balanceOf(recipient);
                balance.should.be.bignumber.equal(newBalance.minus(amount));
              });

              it("emits a withdraw event", async function() {
                const result = await this.sablier.withdraw(streamId, amount, opts);
                truffleAssert.eventEmitted(result, "Withdraw");
              });

              it("decreases the stream balance", async function() {
                const balance = await this.sablier.balanceOf(streamId, recipient);
                await this.sablier.withdraw(streamId, amount, opts);
                const newBalance = await this.sablier.balanceOf(streamId, recipient);
                balance.should.be.bignumber.equal(newBalance.plus(amount));
              });
            });
          });

          describe("when the withdrawal amount is not within the available balance", function() {
            const amount = STANDARD_SALARY.plus(FIVE_UNITS).toString(10);

            it("reverts", async function() {
              await truffleAssert.reverts(
                this.sablier.withdraw(streamId, amount, opts),
                "withdrawal exceeds the available balance",
              );
            });
          });

          afterEach(async function() {
            await traveler.advanceBlockAndSetTime(now.toNumber());
          });
        });
      });

      describe("when the withdrawal amount is zero", function() {
        it("reverts", async function() {
          const amount = "0";
          await truffleAssert.reverts(this.sablier.withdraw(streamId, amount, opts), "amount is zero");
        });
      });
    });

    describe("when the caller is the recipient of the stream", function() {
      const opts = { from: recipient };

      describe("when the withdrawal amount is higher than 0", function() {
        describe("when the stream did not start", function() {
          it("reverts", async function() {
            await truffleAssert.reverts(
              this.sablier.withdraw(streamId, FIVE_UNITS, opts),
              "withdrawal exceeds the available balance",
            );
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

          describe("when the withdrawal amount is within the available balance", function() {
            it("makes the withdrawal", async function() {
              const balance = await this.token.balanceOf(recipient);
              await this.sablier.withdraw(streamId, FIVE_UNITS, opts);
              const newBalance = await this.token.balanceOf(recipient);
              balance.should.bignumber.satisfy(function(num) {
                return (
                  num.isEqualTo(newBalance.minus(FIVE_UNITS)) ||
                  num.isEqualTo(newBalance.minus(FIVE_UNITS).plus(ONE_UNIT))
                );
              });
            });

            it("emits a withdraw event", async function() {
              const result = await this.sablier.withdraw(streamId, FIVE_UNITS, opts);
              truffleAssert.eventEmitted(result, "Withdraw");
            });

            it("decreases the stream balance", async function() {
              const balance = await this.sablier.balanceOf(streamId, recipient);
              await this.sablier.withdraw(streamId, FIVE_UNITS, opts);
              const newBalance = await this.sablier.balanceOf(streamId, recipient);
              balance.should.bignumber.satisfy(function(num) {
                return (
                  num.isEqualTo(newBalance.plus(FIVE_UNITS)) ||
                  num.isEqualTo(newBalance.plus(FIVE_UNITS).plus(ONE_UNIT))
                );
              });
            });
          });

          describe("when the withdrawal amount is not within the available balance", function() {
            const amount = FIVE_UNITS.multipliedBy(2).toString(10);

            it("reverts", async function() {
              await truffleAssert.reverts(
                this.sablier.withdraw(streamId, amount, opts),
                "withdrawal exceeds the available balance",
              );
            });
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

          describe("when the withdrawal amount is within the available balance", function() {
            describe("when the balance is withdrawn in full", function() {
              const amount = STANDARD_SALARY.toString(10);

              it("makes the withdrawal", async function() {
                const balance = await this.token.balanceOf(recipient);
                await this.sablier.withdraw(streamId, amount, opts);
                const newBalance = await this.token.balanceOf(recipient);
                balance.should.be.bignumber.equal(newBalance.minus(amount));
              });

              it("emits a withdraw event", async function() {
                const result = await this.sablier.withdraw(streamId, amount, opts);
                truffleAssert.eventEmitted(result, "Withdraw");
              });

              it("deletes the stream object", async function() {
                await this.sablier.withdraw(streamId, amount, opts);
                await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
              });
            });

            describe("when the balance is not withdrawn in full", function() {
              const amount = STANDARD_SALARY.dividedBy(2).toString(10);

              it("makes the withdrawal", async function() {
                const balance = await this.token.balanceOf(recipient);
                await this.sablier.withdraw(streamId, amount, opts);
                const newBalance = await this.token.balanceOf(recipient);
                balance.should.be.bignumber.equal(newBalance.minus(amount));
              });

              it("emits a withdraw event", async function() {
                const result = await this.sablier.withdraw(streamId, amount, opts);
                truffleAssert.eventEmitted(result, "Withdraw");
              });

              it("decreases the stream balance", async function() {
                const balance = await this.sablier.balanceOf(streamId, recipient);
                await this.sablier.withdraw(streamId, amount, opts);
                const newBalance = await this.sablier.balanceOf(streamId, recipient);
                balance.should.be.bignumber.equal(newBalance.plus(amount));
              });
            });
          });

          describe("when the withdrawal amount is not within the available balance", function() {
            const amount = STANDARD_SALARY.plus(FIVE_UNITS).toString(10);

            it("reverts", async function() {
              await truffleAssert.reverts(
                this.sablier.withdraw(streamId, amount, opts),
                "withdrawal exceeds the available balance",
              );
            });
          });

          afterEach(async function() {
            await traveler.advanceBlockAndSetTime(now.toNumber());
          });
        });
      });

      describe("when the withdrawal amount is zero", function() {
        it("reverts", async function() {
          const amount = "0";
          await truffleAssert.reverts(this.sablier.withdraw(streamId, amount, opts), "amount is zero");
        });
      });
    });

    describe("when the caller is not the sender or the recipient of the stream", function() {
      const opts = { from: eve };

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.withdraw(streamId, FIVE_UNITS, opts),
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
      await truffleAssert.reverts(this.sablier.withdraw(streamId, FIVE_UNITS, opts), "stream does not exist");
    });
  });
}

module.exports = shouldBehaveLikeERC1620Withdraw;
