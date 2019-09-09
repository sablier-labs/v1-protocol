const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { STANDARD_RATE, STANDARD_SALARY, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA, ZERO_ADDRESS } = devConstants;

function shouldBehaveLikeERC1620Stream(alice, bob) {
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
                  // We have to force-call the `getStream` method via the web3.eth.Contract api, otherwise
                  // solidity-coverage will turn it into a state-changing method
                  const stream = await this.sablier.getStream(Number(result.logs[0].args.streamId));
                  stream.sender.should.be.equal(sender);
                  stream.recipient.should.be.equal(recipient);
                  stream.deposit.should.be.bignumber.equal(deposit);
                  stream.tokenAddress.should.be.equal(this.token.address);
                  stream.startTime.should.be.bignumber.equal(startTime);
                  stream.stopTime.should.be.bignumber.equal(stopTime);
                  stream.balance.should.be.bignumber.equal(deposit);
                  stream.rate.should.be.bignumber.equal(STANDARD_RATE);
                });

                it("transfers the tokens", async function() {
                  const balance = await this.token.balanceOf(sender);
                  await this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts);
                  const newBalance = await this.token.balanceOf(sender);
                  balance.should.be.bignumber.equal(newBalance.plus(STANDARD_SALARY));
                });

                it("increases the stream nonce", async function() {
                  const nonce = await this.sablier.nonce();
                  await this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts);
                  const newNonce = await this.sablier.nonce();
                  nonce.should.be.bignumber.equal(newNonce.minus(1));
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
                this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
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
                this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
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
          await this.nonStandardERC20Token.nonStandardApprove(this.sablier.address, STANDARD_SALARY.toString(10), opts);
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
        this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
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
        this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
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
        this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts),
        "stream to the zero address",
      );
    });
  });
}

module.exports = shouldBehaveLikeERC1620Stream;
