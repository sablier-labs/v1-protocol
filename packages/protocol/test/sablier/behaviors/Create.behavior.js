const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { STANDARD_SALARY, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA, ZERO_ADDRESS } = devConstants;

function shouldBehaveLikeERC1620Create(alice, bob) {
  const sender = alice;
  const opts = { from: sender };
  const now = new BigNumber(dayjs().unix());

  describe("when the recipient is valid", function() {
    const recipient = bob;

    describe("when the token contract is erc20 compliant", function() {
      describe("when the sablier contract has enough allowance", function() {
        beforeEach(async function() {
          await this.token.approve(this.sablier.address, STANDARD_SALARY.toString(10), opts);
        });

        describe("when the sender has enough tokens", function() {
          describe("when the deposit is a multiple of the time delta", function() {
            const deposit = STANDARD_SALARY.toString(10);

            describe("when the start time is after block.timestamp", function() {
              describe("when the stop time is after the start time", function() {
                let startTime;
                let stopTime;

                beforeEach(async function() {
                  startTime = now.plus(STANDARD_TIME_OFFSET);
                  stopTime = startTime.plus(STANDARD_TIME_DELTA);
                });

                it("creates the stream", async function() {
                  const balance = await this.token.balanceOf(sender);
                  await this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts);
                  const newBalance = await this.token.balanceOf(sender);
                  balance.should.be.bignumber.equal(newBalance.plus(STANDARD_SALARY));
                });

                it("increases the stream nonce", async function() {
                  const nonce = await this.sablier.nonce();
                  await this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts);
                  const newNonce = await this.sablier.nonce();
                  nonce.should.be.bignumber.equal(newNonce.minus(1));
                });

                it("emits a create event", async function() {
                  const result = await this.sablier.create(
                    recipient,
                    deposit,
                    this.token.address,
                    startTime,
                    stopTime,
                    opts,
                  );
                  truffleAssert.eventEmitted(result, "Create");
                });
              });

              describe("when the stop time is not after the start time", function() {
                let startTime;
                let stopTime;

                beforeEach(async function() {
                  startTime = now.plus(STANDARD_TIME_OFFSET);
                  stopTime = startTime;
                });

                it("reverts", async function() {
                  await truffleAssert.reverts(
                    this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts),
                    "stop time before the start time",
                  );
                });
              });
            });

            describe("when the start time is not after block.timestamp", function() {
              let startTime;
              let stopTime;

              beforeEach(async function() {
                startTime = now.minus(STANDARD_TIME_OFFSET);
                stopTime = startTime.plus(STANDARD_TIME_DELTA);
              });

              it("reverts", async function() {
                await truffleAssert.reverts(
                  this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts),
                  "start time before block.timestamp",
                );
              });
            });
          });

          describe("when the deposit is not a multiple of the time delta", function() {
            const deposit = STANDARD_SALARY.plus(5).toString(10);
            let startTime;
            let stopTime;

            beforeEach(async function() {
              startTime = now.plus(STANDARD_TIME_OFFSET);
              stopTime = startTime.plus(STANDARD_TIME_DELTA);
            });

            it("reverts", async function() {
              await truffleAssert.reverts(
                this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts),
                "deposit not multiple of time delta",
              );
            });
          });

          describe("when the deposit is zero", function() {
            const deposit = new BigNumber(0);
            let startTime;
            let stopTime;

            beforeEach(async function() {
              startTime = now.plus(STANDARD_TIME_OFFSET);
              stopTime = startTime.plus(STANDARD_TIME_DELTA);
            });

            it("reverts", async function() {
              await truffleAssert.reverts(
                this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts),
                "deposit is zero",
              );
            });
          });
        });

        describe("when the sender does not have enough tokens", function() {
          const deposit = STANDARD_SALARY.multipliedBy(2).toString(10);
          let startTime;
          let stopTime;

          beforeEach(async function() {
            startTime = now.plus(STANDARD_TIME_OFFSET);
            stopTime = startTime.plus(STANDARD_TIME_DELTA);
          });

          it("reverts", async function() {
            await truffleAssert.reverts(
              this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts),
              "SafeMath: subtraction overflow",
            );
          });
        });
      });

      describe("when the sablier contract does not have enough allowance", function() {
        let startTime;
        let stopTime;

        beforeEach(async function() {
          startTime = now.plus(STANDARD_TIME_OFFSET);
          stopTime = startTime.plus(STANDARD_TIME_DELTA);
          await this.token.approve(this.sablier.address, STANDARD_SALARY.minus(5).toString(10), opts);
        });

        describe("when the sender has enough tokens", function() {
          const deposit = STANDARD_SALARY.toString(10);

          it("reverts", async function() {
            await truffleAssert.reverts(
              this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts),
              "SafeMath: subtraction overflow",
            );
          });
        });

        describe("when the sender does not have enough tokens", function() {
          const deposit = STANDARD_SALARY.multipliedBy(2).toString(10);

          it("reverts", async function() {
            await truffleAssert.reverts(
              this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts),
              "SafeMath: subtraction overflow",
            );
          });
        });
      });
    });

    describe("when the token contract is not erc20", function() {
      const deposit = STANDARD_SALARY.toString(10);
      let startTime;
      let stopTime;

      beforeEach(async function() {
        startTime = now.plus(STANDARD_TIME_OFFSET);
        stopTime = startTime.plus(STANDARD_TIME_DELTA);
      });

      describe("when the token contract is non-compliant", function() {
        beforeEach(async function() {
          await this.notERC20Token.notApprove(this.sablier.address, STANDARD_SALARY.toString(10), opts);
        });

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.sablier.create(recipient, deposit, this.notERC20Token.address, startTime, stopTime, opts),
            truffleAssert.ErrorType.REVERT,
          );
        });
      });

      describe("when the token contract is the zero address", function() {
        it("reverts", async function() {
          await truffleAssert.reverts(
            this.sablier.create(recipient, deposit, ZERO_ADDRESS, startTime, stopTime, opts),
            truffleAssert.ErrorType.REVERT,
          );
        });
      });
    });
  });

  describe("when the recipient is the caller itself", function() {
    const deposit = STANDARD_SALARY.toString(10);
    let startTime;
    let stopTime;

    beforeEach(async function() {
      startTime = now.plus(STANDARD_TIME_OFFSET);
      stopTime = startTime.plus(STANDARD_TIME_DELTA);
    });

    it("reverts", async function() {
      const recipient = sender;

      await truffleAssert.reverts(
        this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts),
        "stream to the caller",
      );
    });
  });

  describe("when the recipient is the contract itself", function() {
    const deposit = STANDARD_SALARY.toString(10);
    let startTime;
    let stopTime;

    beforeEach(async function() {
      startTime = now.plus(STANDARD_TIME_OFFSET);
      stopTime = startTime.plus(STANDARD_TIME_DELTA);
    });

    it("reverts", async function() {
      const recipient = this.sablier.address;

      await truffleAssert.reverts(
        this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts),
        "stream to the contract itself",
      );
    });
  });

  describe("when the recipient is the zero address", function() {
    const recipient = ZERO_ADDRESS;
    const deposit = STANDARD_SALARY.toString(10);
    let startTime;
    let stopTime;

    beforeEach(async function() {
      startTime = now.plus(STANDARD_TIME_OFFSET);
      stopTime = startTime.plus(STANDARD_TIME_DELTA);
    });

    it("reverts", async function() {
      await truffleAssert.reverts(
        this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts),
        "stream to the zero address",
      );
    });
  });
}

module.exports = shouldBehaveLikeERC1620Create;
