const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const {
  STANDARD_RECIPIENT_SHARE_PERCENTAGE,
  STANDARD_SALARY,
  STANDARD_SALARY_CTOKEN,
  STANDARD_SENDER_SHARE_PERCENTAGE,
  STANDARD_TIME_OFFSET,
  STANDARD_TIME_DELTA,
} = devConstants;

function shouldBehaveLikeIsCompoundingStream(alice, bob) {
  const sender = alice;
  const opts = { from: sender };
  const now = new BigNumber(dayjs().unix());

  describe("when the compounding stream exists", function() {
    let streamId;
    const recipient = bob;
    const deposit = STANDARD_SALARY_CTOKEN.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);
    const senderSharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
    const recipientSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;

    beforeEach(async function() {
      await this.cTokenManager.whitelistCToken(this.cToken.address);
      await this.cToken.approve(this.sablier.address, deposit, opts);
      const result = await this.sablier.createCompoundingStream(
        recipient,
        deposit,
        this.cToken.address,
        startTime,
        stopTime,
        senderSharePercentage,
        recipientSharePercentage,
        opts,
      );
      streamId = Number(result.logs[0].args.streamId);
    });

    it("returns true", async function() {
      const result = await this.sablier.isCompoundingStream(streamId, opts);
      result.should.be.equal(true);
    });
  });

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

    it("returns false", async function() {
      const result = await this.sablier.isCompoundingStream(streamId, opts);
      result.should.be.equal(false);
    });
  });

  describe("when the stream does not exist", function() {
    it("reverts", async function() {
      const streamId = new BigNumber(419863);
      await truffleAssert.reverts(this.sablier.getCompoundingStream(streamId, opts), "stream does not exist");
    });
  });
}

module.exports = shouldBehaveLikeIsCompoundingStream;
