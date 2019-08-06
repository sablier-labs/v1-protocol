const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const truffleAssert = require("truffle-assertions");

const { STANDARD_DEPOSIT, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA, ZERO_ADDRESS } = devConstants;

function shouldBehaveLikeERC1620Withdraw(alice, bob, eve) {
  describe("when the stream exists", function() {
    const sender = alice;
    const recipient = bob;
    const deposit = STANDARD_DEPOSIT.toString(10);
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

    describe("when the caller is the recipient of the stream", function() {
      const opts = { from: recipient };

      describe("when the withdrawal amount is higher than 0", function() {
        describe("when the stream did not start", function() {
          it("reverts", async function() {
            const amount = new BigNumber(1).multipliedBy(1e18).toString(10);
            await truffleAssert.reverts(
              this.sablier.withdraw(streamId, amount, opts),
              "withdrawal exceeds the available balance",
            );
          });
        });

        describe("when the stream did start but not end", function() {
          beforeEach(async function() {
            await web3.utils.advanceTimeAndBlock(STANDARD_TIME_OFFSET.plus(1).toNumber());
          });

          describe("when the withdrawal amount is within the available balance", function() {
            const amount = new BigNumber(1).multipliedBy(1e18).toString(10);

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

          describe("when the withdrawal amount is not within the available balance", function() {
            const amount = new BigNumber(1)
              .plus(1)
              .multipliedBy(1e18)
              .toString(10);

            it("reverts", async function() {
              await truffleAssert.reverts(
                this.sablier.withdraw(streamId, amount, opts),
                "withdrawal exceeds the available balance",
              );
            });
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

          describe("when the withdrawal amount is within the available balance", function() {
            describe("when the balance is withdrawn in full", function() {
              const amount = STANDARD_DEPOSIT.toString(10);

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
              const amount = STANDARD_DEPOSIT.dividedBy(2).toString(10);

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
            const amount = STANDARD_DEPOSIT.plus(1)
              .multipliedBy(1e18)
              .toString(10);

            it("reverts", async function() {
              await truffleAssert.reverts(
                this.sablier.withdraw(streamId, amount, opts),
                "withdrawal exceeds the available balance",
              );
            });
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

    describe("when the caller is not the recipient of the stream", function() {
      const opts = { from: eve };

      it("reverts", async function() {
        const amount = new BigNumber(1).multipliedBy(1e18).toString(10);
        await truffleAssert.reverts(
          this.sablier.withdraw(streamId, amount, opts),
          "caller is not the recipient of the stream",
        );
      });
    });
  });

  describe("when the stream does not exist", function() {
    const recipient = bob;
    const opts = { from: recipient };

    it("reverts", async function() {
      const streamId = new BigNumber(1);
      const amount = new BigNumber(1).multipliedBy(1e18).toString(10);
      await truffleAssert.reverts(this.sablier.withdraw(streamId, amount, opts), "stream does not exist");
    });
  });
}

module.exports = shouldBehaveLikeERC1620Withdraw;
