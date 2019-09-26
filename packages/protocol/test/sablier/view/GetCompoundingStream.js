const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { STANDARD_SALARY, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA } = devConstants;

function shouldBehaveLikeGetCompoundingStream(alice, bob) {
  const sender = alice;
  const opts = { from: sender };
  const now = new BigNumber(dayjs().unix());

  describe("when the stream exists but is not compounding", function() {
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

    it("reverts", async function() {
      await truffleAssert.reverts(
        this.sablier.getCompoundingStream(streamId, opts),
        "compounding stream does not exist",
      );
    });
  });

  describe("when the stream does not exist", function() {
    it("reverts", async function() {
      const streamId = new BigNumber(419863);
      await truffleAssert.reverts(this.sablier.getCompoundingStream(streamId, opts), "stream does not exist");
    });
  });
}

module.exports = shouldBehaveLikeGetCompoundingStream;
