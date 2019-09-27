const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { STANDARD_SALARY, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA } = devConstants;

function shouldBehaveLikeInterestOf(alice, bob) {
  const sender = alice;
  const deposit = STANDARD_SALARY.toString(10);
  const opts = { from: sender };
  const now = new BigNumber(dayjs().unix());

  describe("when the compounding stream does not exist", function() {
    let streamId;
    const recipient = bob;
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);

    beforeEach(async function() {
      await this.token.approve(this.sablier.address, deposit, opts);
      const result = await this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts);
      streamId = Number(result.logs[0].args.streamId);
    });

    it("returns 0", async function() {
      const result = await this.sablier.contract.methods.interestOf(streamId, deposit).call();
      result.senderInterest.should.be.bignumber.equal(new BigNumber(0));
      result.recipientInterest.should.be.bignumber.equal(new BigNumber(0));
      result.sablierInterest.should.be.bignumber.equal(new BigNumber(0));
    });
  });

  describe("when the stream does not exist", function() {
    it("reverts", async function() {
      const streamId = new BigNumber(419863);
      await truffleAssert.reverts(this.sablier.interestOf(streamId, deposit, opts), "stream does not exist");
    });
  });
}

module.exports = shouldBehaveLikeInterestOf;
