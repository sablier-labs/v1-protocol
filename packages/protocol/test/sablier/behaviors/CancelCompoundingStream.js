const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

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
    const amount = FIVE_UNITS_CTOKEN;

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
        streamId = Number(result.logs[0].args.streamId);
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
        const sablierBalance = await this.cToken.balanceOf(this.sablier.address);
        await this.sablier.cancelStream(streamId, opts);
        const newSenderBalance = await this.cToken.balanceOf(sender);
        const newRecipientBalance = await this.cToken.balanceOf(recipient);
        const newSablierBalance = await this.cToken.balanceOf(this.sablier.address);

        const sum = senderBalance.plus(recipientBalance).plus(sablierBalance);
        const newSum = newSenderBalance.plus(newRecipientBalance).plus(newSablierBalance);
        sum.should.be.bignumber.equal(newSum);
      });

      it("pays the interest to the sender of the stream", async function() {
        const balance = await this.cToken.balanceOf(sender);
        const result = await this.sablier.cancelStream(streamId, opts);
        const sablierInterest = result.logs[1].args.sablierInterest;
        const newBalance = await this.cToken.balanceOf(sender);

        // The sender receives the deposit back, minus what has been streamed so far, `amount`,
        // plus their earned interest
        const tolerateByAddition = false;
        balance.should.tolerateTheBlockTimeVariation(
          newBalance
            .minus(deposit)
            .plus(amount)
            .plus(sablierInterest),
          STANDARD_SCALE_CTOKEN,
          tolerateByAddition,
        );
      });

      it("pays the interest to the recipient of the stream", async function() {
        const balance = await this.cToken.balanceOf(recipient);
        const result = await this.sablier.cancelStream(streamId, opts);
        const sablierInterest = result.logs[1].args.sablierInterest;
        const newBalance = await this.cToken.balanceOf(recipient);

        // The recipient receives what has been streamed so far, `amount`,
        // plus their earned interest
        balance.should.tolerateTheBlockTimeVariation(
          newBalance.minus(amount).plus(sablierInterest),
          STANDARD_SALARY_CTOKEN,
        );
      });

      it("pays the interest to the sablier contract", async function() {
        const earnings = await this.sablier.earnings(this.cToken.address);
        const balance = await this.cToken.balanceOf(this.sablier.address);
        const stream = await this.sablier.contract.methods.getStream(streamId).call();
        const result = await this.sablier.cancelStream(streamId, opts);
        const sablierInterest = result.logs[1].args.sablierInterest;
        const newEarnings = await this.sablier.earnings(this.cToken.address);
        const newBalance = await this.cToken.balanceOf(this.sablier.address);

        // The sender and the recipient's interests are included in `stream.balance`, so we don't
        // subtract them again
        earnings.should.be.bignumber.equal(newEarnings.minus(sablierInterest));
        balance.should.be.bignumber.equal(newBalance.plus(stream.balance).minus(sablierInterest));
      });

      it("emits a cancelstream event", async function() {
        const result = await this.sablier.cancelStream(streamId, opts);
        await truffleAssert.eventEmitted(result, "CancelStream");
      });

      it("emits a payinterest event", async function() {
        const result = await this.sablier.cancelStream(streamId, opts);
        await truffleAssert.eventEmitted(result, "PayInterest");
      });

      it("deletes the storage objects", async function() {
        await this.sablier.cancelStream(streamId, opts);
        await truffleAssert.reverts(this.sablier.getStream(streamId), "stream does not exist");
        await truffleAssert.reverts(this.sablier.getCompoundForStream(streamId), "stream does not exist");
      });

      afterEach(async function() {
        await traveler.advanceBlockAndSetTime(now.toNumber());
      });
    });
  });

  describe("when the stream did end", function() {});
}

module.exports = shouldBehaveLikeCancelCompoundingStream;
