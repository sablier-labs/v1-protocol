const { devConstants } = require("@sablier/dev-utils");
const dayjs = require("dayjs");
const BigNumber = require("bignumber.js");
const truffleAssert = require("truffle-assertions");

const {
  ONE_PERCENT_MANTISSA,
  STANDARD_RATE_PER_SECOND_CTOKEN,
  STANDARD_RECIPIENT_SHARE_PERCENTAGE,
  STANDARD_SALARY_CTOKEN,
  STANDARD_SENDER_SHARE_PERCENTAGE,
  STANDARD_TIME_DELTA,
  STANDARD_TIME_OFFSET,
} = devConstants;

/**
 * We do not tests all the logical branches as in `CreateStream.js`, because these are unit tests.
 * The `createCompoundingStream` method uses `createStream`, so if that fails with non-compliant erc20
 * or insufficient allowances, this must fail too.
 */
function shouldBehaveLikeCreateCompoundingStream(alice, bob) {
  const sender = alice;
  const recipient = bob;
  const deposit = STANDARD_SALARY_CTOKEN.toString(10);
  const opts = { from: sender };
  const now = new BigNumber(dayjs().unix());
  const startTime = now.plus(STANDARD_TIME_OFFSET);
  const stopTime = startTime.plus(STANDARD_TIME_DELTA);

  describe("when not paused", function() {
    describe("when the cToken is whitelisted", function() {
      beforeEach(async function() {
        await this.cTokenManager.whitelistCToken(this.cToken.address, opts);
        await this.cToken.approve(this.sablier.address, deposit, opts);
      });

      describe("when interest shares are valid", function() {
        const senderSharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
        const recipientSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;

        it("creates the compounding stream", async function() {
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
          const exchangeRateInitial = new BigNumber(await this.cToken.contract.methods.exchangeRateCurrent().call());

          const streamId = Number(result.logs[0].args.streamId);
          const compoundingStreamObject = await this.sablier.contract.methods.getCompoundingStream(streamId).call();
          compoundingStreamObject.sender.should.be.equal(sender);
          compoundingStreamObject.recipient.should.be.equal(recipient);
          compoundingStreamObject.deposit.should.be.bignumber.equal(deposit);
          compoundingStreamObject.tokenAddress.should.be.equal(this.cToken.address);
          compoundingStreamObject.startTime.should.be.bignumber.equal(startTime);
          compoundingStreamObject.stopTime.should.be.bignumber.equal(stopTime);
          compoundingStreamObject.remainingBalance.should.be.bignumber.equal(deposit);
          compoundingStreamObject.ratePerSecond.should.be.bignumber.equal(STANDARD_RATE_PER_SECOND_CTOKEN);
          compoundingStreamObject.exchangeRateInitial.should.be.bignumber.equal(exchangeRateInitial);
          compoundingStreamObject.senderSharePercentage.should.be.bignumber.equal(
            senderSharePercentage.multipliedBy(ONE_PERCENT_MANTISSA),
          );
          compoundingStreamObject.recipientSharePercentage.should.be.bignumber.equal(
            recipientSharePercentage.multipliedBy(ONE_PERCENT_MANTISSA),
          );
        });

        it("transfers the tokens to the contract", async function() {
          const balance = await this.cToken.balanceOf(sender, opts);
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
          const newBalance = await this.cToken.balanceOf(sender, opts);
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

      describe("when interest shares are not valid", function() {
        const senderSharePercentage = new BigNumber(40);
        const recipientSharePercentage = new BigNumber(140);

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

    describe("when the cToken is not whitelisted", function() {
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
          "cToken is not whitelisted",
        );
      });
    });
  });

  describe("when paused", function() {
    const senderSharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
    const recipientSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;

    beforeEach(async function() {
      // Note that `sender` coincides with the owner of the contract
      await this.sablier.pause(opts);
    });

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
        "Pausable: paused",
      );
    });
  });
}

module.exports = shouldBehaveLikeCreateCompoundingStream;
