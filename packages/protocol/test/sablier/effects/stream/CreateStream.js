const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const {
  STANDARD_RATE_PER_SECOND,
  STANDARD_SALARY,
  STANDARD_TIME_OFFSET,
  STANDARD_TIME_DELTA,
  ZERO_ADDRESS,
} = devConstants;

function shouldBehaveLikeERC1620Stream(alice, bob) {
  const sender = alice;
  const opts = { from: sender };
  const now = new BigNumber(dayjs().unix());

  describe("when not paused", function() {
    describe("when the recipient is valid", function() {
      const recipient = bob;

      describe("when the token contract is erc20 compliant", function() {
        describe("when the sablier contract has enough allowance", function() {
          beforeEach(async function() {
            await this.token.approve(this.sablier.address, STANDARD_SALARY.toString(10), opts);
          });

          describe("when the sender has enough tokens", function() {
            describe("when the deposit is valid", function() {
              const deposit = STANDARD_SALARY.toString(10);

              describe("when the start time is after block.timestamp", function() {
                describe("when the stop time is after the start time", function() {
                  const startTime = now.plus(STANDARD_TIME_OFFSET);
                  const stopTime = startTime.plus(STANDARD_TIME_DELTA);

                  it("creates the stream", async function() {
                    const result = await this.sablier.createStream(
                      recipient,
                      deposit,
                      this.token.address,
                      startTime,
                      stopTime,
                      opts,
                    );
                    const streamObject = await this.sablier.getStream(Number(result.logs[0].args.streamId));
                    streamObject.sender.should.be.equal(sender);
                    streamObject.recipient.should.be.equal(recipient);
                    streamObject.deposit.should.be.bignumber.equal(deposit);
                    streamObject.tokenAddress.should.be.equal(this.token.address);
                    streamObject.startTime.should.be.bignumber.equal(startTime);
                    streamObject.stopTime.should.be.bignumber.equal(stopTime);
                    streamObject.remainingBalance.should.be.bignumber.equal(deposit);
                    streamObject.ratePerSecond.should.be.bignumber.equal(STANDARD_RATE_PER_SECOND);
                  });

                  it("transfers the tokens to the contract", async function() {
                    const balance = await this.token.balanceOf(sender, opts);
                    await this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts);
                    const newBalance = await this.token.balanceOf(sender, opts);
                    newBalance.should.be.bignumber.equal(balance.minus(STANDARD_SALARY));
                  });

                  it("increases the stream next stream id", async function() {
                    const nextStreamId = await this.sablier.nextStreamId();
                    await this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts);
                    const newNextStreamId = await this.sablier.nextStreamId();
                    newNextStreamId.should.be.bignumber.equal(nextStreamId.plus(1));
                  });

                  it("emits a stream event", async function() {
                    const result = await this.sablier.createStream(
                      recipient,
                      deposit,
                      this.token.address,
                      startTime,
                      stopTime,
                      opts,
                    );
                    truffleAssert.eventEmitted(result, "CreateStream");
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
                      this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
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
                    this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
                    "start time before block.timestamp",
                  );
                });
              });
            });

            describe("when the deposit is not valid", function() {
              const startTime = now.plus(STANDARD_TIME_OFFSET);
              const stopTime = startTime.plus(STANDARD_TIME_DELTA);

              describe("when the deposit is zero", function() {
                const deposit = new BigNumber(0).toString(10);

                it("reverts", async function() {
                  await truffleAssert.reverts(
                    this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
                    "deposit is zero",
                  );
                });
              });

              describe("when the deposit is smaller than the time delta", function() {
                const deposit = STANDARD_TIME_DELTA.minus(1).toString(10);

                it("reverts", async function() {
                  await truffleAssert.reverts(
                    this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
                    "deposit smaller than time delta",
                  );
                });
              });

              describe("when the deposit is not a multiple of the time delta", function() {
                const deposit = STANDARD_SALARY.plus(5).toString(10);

                it("reverts", async function() {
                  await truffleAssert.reverts(
                    this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
                    "deposit not multiple of time delta",
                  );
                });
              });
            });
          });

          describe("when the sender does not have enough tokens", function() {
            const deposit = STANDARD_SALARY.multipliedBy(2).toString(10);
            const startTime = now.plus(STANDARD_TIME_OFFSET);
            const stopTime = startTime.plus(STANDARD_TIME_DELTA);

            it("reverts", async function() {
              await truffleAssert.reverts(
                this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
                truffleAssert.ErrorType.REVERT,
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
                this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
                truffleAssert.ErrorType.REVERT,
              );
            });
          });

          describe("when the sender does not have enough tokens", function() {
            const deposit = STANDARD_SALARY.multipliedBy(2).toString(10);

            it("reverts", async function() {
              await truffleAssert.reverts(
                this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
                truffleAssert.ErrorType.REVERT,
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
            await this.nonStandardERC20Token.nonStandardApprove(
              this.sablier.address,
              STANDARD_SALARY.toString(10),
              opts,
            );
          });

          it("reverts", async function() {
            await truffleAssert.reverts(
              this.sablier.createStream(
                recipient,
                deposit,
                this.nonStandardERC20Token.address,
                startTime,
                stopTime,
                opts,
              ),
              truffleAssert.ErrorType.REVERT,
            );
          });
        });

        describe("when the token contract is the zero address", function() {
          it("reverts", async function() {
            await truffleAssert.reverts(
              this.sablier.createStream(recipient, deposit, ZERO_ADDRESS, startTime, stopTime, opts),
              truffleAssert.ErrorType.REVERT,
            );
          });
        });
      });
    });

    describe("when the recipient is the caller itself", function() {
      const recipient = sender;
      const deposit = STANDARD_SALARY.toString(10);
      const startTime = now.plus(STANDARD_TIME_OFFSET);
      const stopTime = startTime.plus(STANDARD_TIME_DELTA);

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
          "stream to the caller",
        );
      });
    });

    describe("when the recipient is the contract itself", function() {
      const deposit = STANDARD_SALARY.toString(10);
      const startTime = now.plus(STANDARD_TIME_OFFSET);
      const stopTime = startTime.plus(STANDARD_TIME_DELTA);

      it("reverts", async function() {
        // Can't be defined in the context above because "this.sablier" is undefined there
        const recipient = this.sablier.address;

        await truffleAssert.reverts(
          this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
          "stream to the contract itself",
        );
      });
    });

    describe("when the recipient is the zero address", function() {
      const recipient = ZERO_ADDRESS;
      const deposit = STANDARD_SALARY.toString(10);
      const startTime = now.plus(STANDARD_TIME_OFFSET);
      const stopTime = startTime.plus(STANDARD_TIME_DELTA);

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
          "stream to the zero address",
        );
      });
    });
  });

  describe("when paused", function() {
    const recipient = bob;
    const deposit = STANDARD_SALARY.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);

    beforeEach(async function() {
      // Note that `sender` coincides with the owner of the contract
      await this.sablier.pause(opts);
    });

    it("reverts", async function() {
      await truffleAssert.reverts(
        this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
        "Pausable: paused",
      );
    });
  });
}

module.exports = shouldBehaveLikeERC1620Stream;
