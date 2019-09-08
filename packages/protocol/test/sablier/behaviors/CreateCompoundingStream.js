const { devConstants } = require("@sablier/dev-utils");
const dayjs = require("dayjs");
const BigNumber = require("bignumber.js");
const truffleAssert = require("truffle-assertions");

const {
  EXCHANGE_RATE_BLOCK_DELTA,
  STANDARD_RATE_CTOKEN,
  STANDARD_RECIPIENT_SHARE,
  STANDARD_SALARY_CTOKEN,
  STANDARD_SENDER_SHARE,
  STANDARD_TIME_DELTA,
  STANDARD_TIME_OFFSET,
} = devConstants;

function shouldBehaveLikeCreateCompoundingStream(alice, bob) {
  const sender = alice;
  const recipient = bob;
  const deposit = STANDARD_SALARY_CTOKEN.toString(10);
  const opts = { from: sender };
  const now = new BigNumber(dayjs().unix());
  const startTime = now.plus(STANDARD_TIME_OFFSET);
  const stopTime = startTime.plus(STANDARD_TIME_DELTA);

  describe("when the ctoken is whitelisted", function() {
    beforeEach(async function() {
      await this.sablier.whitelistCToken(this.cToken.address, opts);
      await this.cToken.approve(this.sablier.address, deposit, opts);
    });

    describe("when shares sum up to 100%", function() {
      const senderShare = STANDARD_SENDER_SHARE;
      const recipientShare = STANDARD_RECIPIENT_SHARE;

      it("creates the compounding stream", async function() {
        const exchangeRate = await this.cToken.exchangeRateCurrent();
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

        const streamId = result.logs[0].args.streamId;
        const stream = await this.sablier.getStream(streamId);
        stream.sender.should.be.equal(sender);
        stream.recipient.should.be.equal(recipient);
        stream.deposit.should.be.bignumber.equal(deposit);
        stream.tokenAddress.should.be.equal(this.cToken.address);
        stream.startTime.should.be.bignumber.equal(startTime);
        stream.stopTime.should.be.bignumber.equal(stopTime);
        stream.balance.should.be.bignumber.equal(deposit);
        stream.rate.should.be.bignumber.equal(STANDARD_RATE_CTOKEN);

        // The exchange rate increased because the block number incremented
        const compound = await this.sablier.getCompoundForStream(streamId);
        compound.exchangeRate.should.be.bignumber.equal(exchangeRate.plus(EXCHANGE_RATE_BLOCK_DELTA));
        compound.senderShare.should.be.bignumber.equal(senderShare);
        compound.recipientShare.should.be.bignumber.equal(recipientShare);
      });

      it("transfers the token", async function() {
        const balance = await this.cToken.balanceOf(sender);
        await this.sablier.createCompoundingStream(
          recipient,
          deposit,
          this.cToken.address,
          startTime,
          stopTime,
          senderShare,
          recipientShare,
          opts,
        );
        const newBalance = await this.cToken.balanceOf(sender);
        balance.should.be.bignumber.equal(newBalance.plus(STANDARD_SALARY_CTOKEN));
      });

      it("emits a createcompoundingstream event", async function() {
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
        await truffleAssert.eventEmitted(result, "CreateCompoundingStream");
      });
    });

    describe("when shares do not sum up to 100%", function() {
      const senderShare = new BigNumber(40);
      const recipientShare = new BigNumber(40);

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.createCompoundingStream(
            recipient,
            deposit,
            this.cToken.address,
            startTime,
            stopTime,
            senderShare,
            recipientShare,
            opts,
          ),
          "shares do not sum up to 100%",
        );
      });
    });
  });

  describe("when the ctoken is not whitelisted", function() {
    const senderShare = STANDARD_SENDER_SHARE;
    const recipientShare = STANDARD_RECIPIENT_SHARE;

    it("reverts", async function() {
      await truffleAssert.reverts(
        this.sablier.createCompoundingStream(
          recipient,
          deposit,
          this.cToken.address,
          startTime,
          stopTime,
          senderShare,
          recipientShare,
          opts,
        ),
        "ctoken is not whitelisted",
      );
    });
  });
}

module.exports = shouldBehaveLikeCreateCompoundingStream;
