const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { STANDARD_SALARY, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA } = devConstants;
const { contextForStreamDidEnd, contextForStreamDidStartButNotEnd } = mochaContexts;

function shouldBehaveLikeDeltaOf(alice, bob) {
  const sender = alice;
  const opts = { from: sender };
  const now = new BigNumber(dayjs().unix());

  describe("when the stream exists", function() {
    let streamId;
    const recipient = bob;
    const deposit = STANDARD_SALARY.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);

    beforeEach(async function() {
      await this.token.approve(this.sablier.address, deposit, opts);
      const result = await this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts);
      streamId = Number(result.logs[0].args.streamId);
    });

    describe("when the stream did not start", function() {
      it("returns 0", async function() {
        const delta = await this.sablier.deltaOf(streamId, opts);
        delta.should.be.bignumber.equal(new BigNumber(0));
      });
    });

    contextForStreamDidStartButNotEnd(function() {
      it("returns the time the number of seconds that passed since the start time", async function() {
        const delta = await this.sablier.deltaOf(streamId, opts);
        delta.should.bignumber.satisfy(function(num) {
          return num.isEqualTo(new BigNumber(5)) || num.isEqualTo(new BigNumber(5).plus(1));
        });
      });
    });

    contextForStreamDidEnd(function() {
      it("returns the difference between the stop time and the start time", async function() {
        const delta = await this.sablier.deltaOf(streamId, opts);
        delta.should.be.bignumber.equal(stopTime.minus(startTime));
      });
    });
  });

  describe("when the stream does not exist", function() {
    it("reverts", async function() {
      const streamId = new BigNumber(419863);
      await truffleAssert.reverts(this.sablier.deltaOf(streamId, opts), "stream does not exist");
    });
  });
}

module.exports = shouldBehaveLikeDeltaOf;
