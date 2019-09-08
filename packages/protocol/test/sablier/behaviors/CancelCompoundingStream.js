const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");

const {
  FIVE_UNITS_CTOKEN,
  STANDARD_RECIPIENT_SHARE,
  STANDARD_SALARY_CTOKEN,
  STANDARD_SCALE_CTOKEN,
  STANDARD_SENDER_SHARE,
  STANDARD_TIME_OFFSET,
  STANDARD_TIME_DELTA,
} = devConstants;

function shouldBehaveLikeCancelCompoundingStream(alice, bob) {
  const now = new BigNumber(dayjs().unix());

  describe("when the stream did start but not end", function() {
    let streamId;
    const sender = alice;
    const recipient = bob;
    const deposit = STANDARD_SALARY_CTOKEN.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);
    const senderShare = STANDARD_SENDER_SHARE;
    const recipientShare = STANDARD_RECIPIENT_SHARE;
    const opts = { from: sender };

    describe("when the fee is not 0", function() {
      beforeEach(async function() {
        await this.sablier.whitelistCToken(this.cToken.address, opts);
        await this.cToken.approve(this.sablier.address, deposit, opts);
        const result = await this.sablier.createCompoundingStream(
          recipient,
          deposit,
          this.cToken.address,
          startTime,
          stopTime,
          senderShare,
          recipientShare,
          opts,
        );
        streamId = result.logs[0].args.streamId;
        await traveler.advanceBlockAndSetTime(
          now
            .plus(STANDARD_TIME_OFFSET)
            .plus(5)
            .toNumber(),
        );
      });

      it("cancels the compounding stream and transfers the tokens on a pro rata basis", async function() {
        const senderBalance = await this.cToken.balanceOf(sender);
        const recipientBalance = await this.cToken.balanceOf(recipient);
        await this.sablier.cancelStream(streamId, opts);
        const newSenderBalance = await this.cToken.balanceOf(sender);
        const newRecipientBalance = await this.cToken.balanceOf(recipient);
        const addTheBlockTimeAverage = false;
        senderBalance.should.tolerateTheBlockTimeVariation(
          newSenderBalance.plus(FIVE_UNITS_CTOKEN).minus(deposit),
          STANDARD_SCALE_CTOKEN,
          addTheBlockTimeAverage,
        );
        recipientBalance.should.tolerateTheBlockTimeVariation(
          newRecipientBalance.minus(FIVE_UNITS_CTOKEN),
          STANDARD_SCALE_CTOKEN,
        );
      });

      afterEach(async function() {
        await traveler.advanceBlockAndSetTime(now.toNumber());
      });
    });

    // describe("when the fee is 0", function() {
    //   beforeEach(async function() {
    //     await this.sablier.updateFee(new BigNumber(0));
    //   });
    // });
  });

  describe("when the stream did end", function() {});
}

module.exports = shouldBehaveLikeCancelCompoundingStream;
