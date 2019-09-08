const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

const shouldBehaveLikeCancelCompoundingStream = require("./behaviors/CancelCompoundingStream");
const shouldBehaveLikeCreateCompoundingStream = require("./behaviors/CreateCompoundingStream");
const shouldBehaveLikeERC1620CreateStream = require("./behaviors/CreateStream");
const shouldBehaveLikeERC1620WithdrawFromStream = require("./behaviors/WithdrawFromStream");
const shouldBehaveLikeERC1620CancelStream = require("./behaviors/CancelStream");
const shouldBehaveLikeSablierAdmin = require("./behaviors/Admin");
const shouldBehaveLikeWithdrawFromCompoundingStream = require("./behaviors/WithdrawFromCompoundingStream");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_DELTA, STANDARD_TIME_OFFSET } = devConstants;

function shouldBehaveLikeSablier(alice, bob, carol, eve) {
  let snapshot;
  let snapshotId;

  before(async () => {
    snapshot = await traveler.takeSnapshot();
    snapshotId = snapshot.result;
  });

  after(async () => {
    await traveler.revertToSnapshot(snapshotId);
  });

  describe("admin functions", function() {
    shouldBehaveLikeSablierAdmin(alice, bob, carol, eve);
  });

  describe("view functions", function() {
    describe("balanceOf", function() {
      const sender = alice;
      const opts = { from: sender };
      const now = new BigNumber(dayjs().unix());

      describe("when the stream exists", function() {
        let streamId;
        const recipient = bob;
        const salary = STANDARD_SALARY.toString(10);
        const startTime = now.plus(STANDARD_TIME_OFFSET);
        const stopTime = startTime.plus(STANDARD_TIME_DELTA);

        beforeEach(async function() {
          await this.token.approve(this.sablier.address, salary, opts);
          const result = await this.sablier.createStream(
            recipient,
            salary,
            this.token.address,
            startTime,
            stopTime,
            opts,
          );
          streamId = result.logs[0].args.streamId;
        });

        describe("when the stream did not start", function() {
          it("returns the whole salary for the sender of the stream", async function() {
            const balance = await this.sablier.balanceOf(streamId, sender, opts);
            balance.should.be.bignumber.equal(STANDARD_SALARY);
          });

          it("returns 0 for the recipient of the stream", async function() {
            const balance = await this.sablier.balanceOf(streamId, recipient, opts);
            balance.should.be.bignumber.equal(new BigNumber(0));
          });

          it("returns 0 for anyone else", async function() {
            const balance = await this.sablier.balanceOf(streamId, carol, opts);
            balance.should.be.bignumber.equal(new BigNumber(0));
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

          it("returns the pro rata balance for the sender of the stream", async function() {
            const balance = await this.sablier.balanceOf(streamId, sender, opts);
            const addTheBlockTimeAverage = false;
            balance.should.tolerateTheBlockTimeVariation(
              STANDARD_SALARY.minus(FIVE_UNITS),
              STANDARD_SCALE,
              addTheBlockTimeAverage,
            );
          });

          it("returns the pro rata balance for the recipient of the stream", async function() {
            const balance = await this.sablier.balanceOf(streamId, recipient, opts);
            balance.should.tolerateTheBlockTimeVariation(FIVE_UNITS, STANDARD_SCALE);
          });

          it("returns 0 for anyone else", async function() {
            const balance = await this.sablier.balanceOf(streamId, carol, opts);
            balance.should.be.bignumber.equal(new BigNumber(0));
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

          it("returns 0 for the sender of the stream", async function() {
            const balance = await this.sablier.balanceOf(streamId, sender, opts);
            balance.should.be.bignumber.equal(new BigNumber(0));
          });

          it("returns the whole salary for the recipient of the stream", async function() {
            const balance = await this.sablier.balanceOf(streamId, recipient, opts);
            balance.should.be.bignumber.equal(STANDARD_SALARY);
          });

          it("returns 0 for anyone else", async function() {
            const balance = await this.sablier.balanceOf(streamId, carol, opts);
            balance.should.be.bignumber.equal(new BigNumber(0));
          });

          afterEach(async function() {
            await traveler.advanceBlockAndSetTime(now.toNumber());
          });
        });
      });

      describe("when the stream does not exist", function() {
        it("reverts", async function() {
          const streamId = new BigNumber(419863);
          await truffleAssert.reverts(this.sablier.balanceOf(streamId, sender, opts), "stream does not exist");
        });
      });
    });

    describe("deltaOf", function() {
      const sender = alice;
      const opts = { from: sender };
      const now = new BigNumber(dayjs().unix());

      describe("when the stream exists", function() {
        let streamId;
        const recipient = bob;
        const salary = STANDARD_SALARY.toString(10);
        const startTime = now.plus(STANDARD_TIME_OFFSET);
        const stopTime = startTime.plus(STANDARD_TIME_DELTA);

        beforeEach(async function() {
          await this.token.approve(this.sablier.address, salary, opts);
          const result = await this.sablier.createStream(
            recipient,
            salary,
            this.token.address,
            startTime,
            stopTime,
            opts,
          );
          streamId = result.logs[0].args.streamId;
        });

        describe("when the stream did not start", function() {
          it("returns 0", async function() {
            const delta = await this.sablier.deltaOf(streamId, opts);
            delta.should.be.bignumber.equal(new BigNumber(0));
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

          it("returns the time the number of seconds that passed since the start time", async function() {
            const delta = await this.sablier.deltaOf(streamId, opts);
            delta.should.bignumber.satisfy(function(num) {
              return num.isEqualTo(new BigNumber(5)) || num.isEqualTo(new BigNumber(5).plus(1));
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

          it("returns the difference between the stop time and the start time", async function() {
            const delta = await this.sablier.deltaOf(streamId, opts);
            delta.should.be.bignumber.equal(stopTime.minus(startTime));
          });

          afterEach(async function() {
            await traveler.advanceBlockAndSetTime(now.toNumber());
          });
        });
      });

      describe("when the stream does not exist", function() {
        it("reverts", async function() {
          const streamId = new BigNumber(419863);
          await truffleAssert.reverts(this.sablier.deltaOf(streamId, opts), "stream does not exist");
        });
      });
    });

    describe("getStream", function() {
      const sender = alice;
      const opts = { from: sender };

      describe("when the stream does not exist", function() {
        it("reverts", async function() {
          const streamId = new BigNumber(419863);
          await truffleAssert.reverts(this.sablier.getStream(streamId, opts), "stream does not exist");
        });
      });
    });

    describe("getCompoundForStream", function() {
      const sender = alice;
      const opts = { from: sender };

      describe("when the stream does not exist", function() {
        it("reverts", async function() {
          const streamId = new BigNumber(419863);
          await truffleAssert.reverts(this.sablier.getCompoundForStream(streamId, opts), "stream does not exist");
        });
      });
    });
  });

  describe("state functions", function() {
    describe("createStream", function() {
      shouldBehaveLikeERC1620CreateStream(alice, bob);
    });

    describe("createCompoundingStream", function() {
      shouldBehaveLikeCreateCompoundingStream(alice, bob);
    });

    describe("withdraw", function() {
      shouldBehaveLikeERC1620WithdrawFromStream(alice, bob, eve);
    });

    describe("withdrawFromCompoundingStream", function() {
      shouldBehaveLikeWithdrawFromCompoundingStream(alice, bob, eve);
    });

    describe("cancel", function() {
      shouldBehaveLikeERC1620CancelStream(alice, bob, eve);
    });

    // describe("cancelCompoundingStream", function() {
    // shouldBehaveLikeCancelCompoundingStream(alice, bob, eve);
    // });
  });
}

module.exports = {
  shouldBehaveLikeERC1620CreateStream,
  shouldBehaveLikeERC1620WithdrawFromStream,
  shouldBehaveLikeERC1620CancelStream,
  shouldBehaveLikeCancelCompoundingStream,
  shouldBehaveLikeCreateCompoundingStream,
  shouldBehaveLikeSablier,
  shouldBehaveLikeSablierAdmin,
  shouldBehaveLikeWithdrawFromCompoundingStream,
};
