const { devConstants } = require("@sablier/dev-utils");
const dayjs = require("dayjs");
const BigNumber = require("bignumber.js");
const truffleAssert = require("truffle-assertions");

const {
  EXCHANGE_RATE_BLOCK_DELTA,
  STANDARD_RATE_PER_SECOND_CTOKEN,
  STANDARD_RECIPIENT_SHARE_PERCENTAGE,
  STANDARD_SALARY_CTOKEN,
  STANDARD_SENDER_SHARE_PERCENTAGE,
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

    describe("when shares sum up to 100", function() {
      const senderSharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
      const recipientSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;

      it("creates the compounding stream", async function() {
        const exchangeRateInitial = await this.cToken.exchangeRateCurrent();
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

        const streamId = Number(result.logs[0].args.streamId);
        // We have to force-call the `getStream` method via the web3.eth.Contract api, otherwise
        // solidity-coverage will turn it into a state-changing method
        const stream = await this.sablier.contract.methods.getStream(streamId).call();
        stream.sender.should.be.equal(sender);
        stream.recipient.should.be.equal(recipient);
        stream.deposit.should.be.bignumber.equal(deposit);
        stream.tokenAddress.should.be.equal(this.cToken.address);
        stream.startTime.should.be.bignumber.equal(startTime);
        stream.stopTime.should.be.bignumber.equal(stopTime);
        stream.remainingBalance.should.be.bignumber.equal(deposit);
        stream.ratePerSecond.should.be.bignumber.equal(STANDARD_RATE_PER_SECOND_CTOKEN);

        // The exchange rate increased because the block number increased
        const compoundingStreamVars = await this.sablier.contract.methods.getCompoundingStreamVars(streamId).call();
        // We have to account for variation because solidity-coverage makes the `getStream` function
        // increase the block number, whereas in normal conditions this doesn't happen
        compoundingStreamVars.exchangeRateInitial.should.tolerateTheBlockTimeVariation(
          exchangeRateInitial.plus(EXCHANGE_RATE_BLOCK_DELTA),
          new BigNumber(1e18),
        );
        // senderSharePercentage and recipientSharePercentage are mantissas
        compoundingStreamVars.senderSharePercentage.should.be.bignumber.equal(senderSharePercentage.multipliedBy(1e16));
        compoundingStreamVars.recipientSharePercentage.should.be.bignumber.equal(
          recipientSharePercentage.multipliedBy(1e16),
        );
      });

      it("transfers the token", async function() {
        const balance = await this.cToken.balanceOf(sender);
        await this.sablier.createCompoundingStream(
          recipient,
          deposit,
          this.cToken.address,
          startTime,
          stopTime,
          senderSharePercentage,
          recipientSharePercentage,
          opts,
        );
        const newBalance = await this.cToken.balanceOf(sender);
        newBalance.should.be.bignumber.equal(balance.minus(STANDARD_SALARY_CTOKEN));
      });

      it("emits a createcompoundingstream event", async function() {
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
        await truffleAssert.eventEmitted(result, "CreateCompoundingStream");
      });
    });

    describe("when shares do not sum up to 100", function() {
      const senderSharePercentage = new BigNumber(40);
      const recipientSharePercentage = new BigNumber(40);

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.createCompoundingStream(
            recipient,
            deposit,
            this.cToken.address,
            startTime,
            stopTime,
            senderSharePercentage,
            recipientSharePercentage,
            opts,
          ),
          "shares do not sum up to 100",
        );
      });
    });
  });

  describe("when the ctoken is not whitelisted", function() {
    const senderSharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
    const recipientSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;

    it("reverts", async function() {
      await truffleAssert.reverts(
        this.sablier.createCompoundingStream(
          recipient,
          deposit,
          this.cToken.address,
          startTime,
          stopTime,
          senderSharePercentage,
          recipientSharePercentage,
          opts,
        ),
        "ctoken is not whitelisted",
      );
    });
  });
}

module.exports = shouldBehaveLikeCreateCompoundingStream;
