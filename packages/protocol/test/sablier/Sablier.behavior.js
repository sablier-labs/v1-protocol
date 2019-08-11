const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const shouldBehaveLikeERC1620Create = require("./behaviors/Create.behavior");
const shouldBehaveLikeERC1620Withdraw = require("./behaviors/Withdraw.behavior");
const shouldBehaveLikeERC1620Cancel = require("./behaviors/Cancel.behavior");

const {
  FIVE_UNITS,
  ONE_UNIT,
  STANDARD_DEPOSIT,
  STANDARD_RATE,
  STANDARD_TIME_DELTA,
  STANDARD_TIME_OFFSET,
} = devConstants;

function shouldBehaveLikeERC1620(alice, bob, carol, eve) {
  let snapshot;
  let snapshotId;

  before(async () => {
    snapshot = await web3.utils.takeSnapshot();
    snapshotId = snapshot.result;
  });

  after(async () => {
    await web3.utils.revertToSnapshot(snapshotId);
  });

  describe("deltaOf", function() {
    const sender = alice;
    const opts = { from: sender };
    const now = new BigNumber(dayjs().unix());

    describe("when the stream exists", function() {
      let streamId;
      const recipient = bob;
      const deposit = STANDARD_DEPOSIT.toString(10);
      const startTime = now.plus(STANDARD_TIME_OFFSET);
      const stopTime = startTime.plus(STANDARD_TIME_DELTA);

      beforeEach(async function() {
        await this.token.approve(this.sablier.address, deposit, opts);
        const result = await this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts);
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
          await web3.utils.advanceBlockAtTime(
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
          await web3.utils.advanceBlockAtTime(now.toNumber());
        });
      });

      describe("when the stream did end", function() {
        beforeEach(async function() {
          await web3.utils.advanceBlockAtTime(
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
          await web3.utils.advanceBlockAtTime(now.toNumber());
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

  describe("balanceOf", function() {
    const sender = alice;
    const opts = { from: sender };
    const now = new BigNumber(dayjs().unix());

    describe("when the stream exists", function() {
      let streamId;
      const recipient = bob;
      const deposit = STANDARD_DEPOSIT.toString(10);
      const startTime = now.plus(STANDARD_TIME_OFFSET);
      const stopTime = startTime.plus(STANDARD_TIME_DELTA);

      beforeEach(async function() {
        await this.token.approve(this.sablier.address, deposit, opts);
        const result = await this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts);
        streamId = result.logs[0].args.streamId;
      });

      describe("when the stream did not start", function() {
        it("returns the whole deposit for the sender of the stream", async function() {
          const balance = await this.sablier.balanceOf(streamId, sender, opts);
          balance.should.be.bignumber.equal(STANDARD_DEPOSIT);
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
          await web3.utils.advanceBlockAtTime(
            now
              .plus(STANDARD_TIME_OFFSET)
              .plus(5)
              .toNumber(),
          );
        });

        it("returns the pro rata balance for the sender of the stream", async function() {
          const balance = await this.sablier.balanceOf(streamId, sender, opts);
          balance.should.be.bignumber.satisfy(function(num) {
            return (
              num.isEqualTo(new BigNumber(STANDARD_DEPOSIT).minus(FIVE_UNITS)) ||
              num.isEqualTo(new BigNumber(STANDARD_DEPOSIT).minus(FIVE_UNITS).minus(ONE_UNIT))
            );
          });
        });

        it("returns the pro rata balance for the recipient of the stream", async function() {
          const balance = await this.sablier.balanceOf(streamId, recipient, opts);
          balance.should.be.bignumber.satisfy(function(num) {
            return num.isEqualTo(FIVE_UNITS) || num.isEqualTo(FIVE_UNITS.plus(ONE_UNIT));
          });
        });

        it("returns 0 for anyone else", async function() {
          const balance = await this.sablier.balanceOf(streamId, carol, opts);
          balance.should.be.bignumber.equal(new BigNumber(0));
        });

        afterEach(async function() {
          await web3.utils.advanceBlockAtTime(now.toNumber());
        });
      });

      describe("when the stream did end", function() {
        beforeEach(async function() {
          await web3.utils.advanceBlockAtTime(
            now
              .plus(STANDARD_TIME_OFFSET)
              .plus(STANDARD_TIME_DELTA)
              .plus(5)
              .toNumber(),
          );
        });

        it("returns 0 for the sender", async function() {
          const balance = await this.sablier.balanceOf(streamId, sender, opts);
          balance.should.be.bignumber.equal(new BigNumber(0));
        });

        it("returns the whole deposit for the recipient of the stream", async function() {
          const balance = await this.sablier.balanceOf(streamId, recipient, opts);
          balance.should.be.bignumber.equal(STANDARD_DEPOSIT);
        });

        it("returns 0 for anyone else", async function() {
          const balance = await this.sablier.balanceOf(streamId, carol, opts);
          balance.should.be.bignumber.equal(new BigNumber(0));
        });

        afterEach(async function() {
          await web3.utils.advanceBlockAtTime(now.toNumber());
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

  describe("getStream", function() {
    const sender = alice;
    const opts = { from: sender };
    const now = new BigNumber(dayjs().unix());

    describe("when the stream exists", function() {
      let streamId;
      const recipient = bob;
      const deposit = STANDARD_DEPOSIT.toString(10);
      const startTime = now.plus(STANDARD_TIME_OFFSET);
      const stopTime = startTime.plus(STANDARD_TIME_DELTA);

      beforeEach(async function() {
        await this.token.approve(this.sablier.address, deposit, opts);
        const result = await this.sablier.create(recipient, deposit, this.token.address, startTime, stopTime, opts);
        streamId = result.logs[0].args.streamId;
      });

      it("returns the stream", async function() {
        const stream = await this.sablier.getStream(streamId);
        stream.sender.should.be.equal(sender);
        stream.recipient.should.be.equal(recipient);
        stream.deposit.should.be.bignumber.equal(STANDARD_DEPOSIT);
        stream.tokenAddress.should.be.equal(this.token.address);
        stream.startTime.should.be.bignumber.equal(startTime);
        stream.stopTime.should.be.bignumber.equal(stopTime);
        stream.balance.should.be.bignumber.equal(STANDARD_DEPOSIT);
        stream.rate.should.be.bignumber.equal(STANDARD_RATE);
      });
    });

    describe("when the stream does not exist", function() {
      it("reverts", async function() {
        const streamId = new BigNumber(419863);
        await truffleAssert.reverts(this.sablier.getStream(streamId, opts), "stream does not exist");
      });
    });
  });

  describe("create", function() {
    shouldBehaveLikeERC1620Create(alice, bob);
  });

  describe("withdraw", function() {
    shouldBehaveLikeERC1620Withdraw(alice, bob, eve);
  });

  describe("cancel", function() {
    shouldBehaveLikeERC1620Cancel(alice, bob, eve);
  });
}

module.exports = {
  shouldBehaveLikeERC1620,
  shouldBehaveLikeERC1620Create,
  shouldBehaveLikeERC1620Withdraw,
  shouldBehaveLikeERC1620Cancel,
};
