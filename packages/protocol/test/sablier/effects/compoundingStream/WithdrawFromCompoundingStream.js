const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const {
  FIVE_UNITS_CTOKEN,
  STANDARD_RECIPIENT_SHARE_PERCENTAGE,
  STANDARD_SABLIER_FEE,
  STANDARD_SALARY_CTOKEN,
  STANDARD_SCALE_CTOKEN,
  STANDARD_SCALE_INTEREST,
  STANDARD_SENDER_SHARE_PERCENTAGE,
  STANDARD_SUPPLY_AMOUNT,
  STANDARD_TIME_OFFSET,
  STANDARD_TIME_DELTA,
} = devConstants;
const { contextForStreamDidEnd, contextForStreamDidStartButNotEnd } = mochaContexts;

function runTests() {
  describe("when not paused", function() {
    describe("when the stream did not start", function() {
      const streamedAmount = FIVE_UNITS_CTOKEN.toString(10);

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts),
          "amount exceeds the available balance",
        );
      });
    });

    contextForStreamDidStartButNotEnd(function() {
      const streamedAmount = FIVE_UNITS_CTOKEN.toString(10);

      it("withdraws from the stream", async function() {
        const senderBalance = await this.cToken.balanceOf(this.sender, this.opts);
        const recipientBalance = await this.cToken.balanceOf(this.recipient, this.opts);
        const sablierBalance = await this.cToken.balanceOf(this.sablier.address, this.opts);
        await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        const newSenderBalance = await this.cToken.balanceOf(this.sender, this.opts);
        const newRecipientBalance = await this.cToken.balanceOf(this.recipient, this.opts);
        const newSablierBalance = await this.cToken.balanceOf(this.sablier.address, this.opts);

        const sum = senderBalance.plus(recipientBalance).plus(sablierBalance);
        const newSum = newSenderBalance.plus(newRecipientBalance).plus(newSablierBalance);
        sum.should.be.bignumber.equal(newSum);
      });

      it("pays the interest to the sender of the stream", async function() {
        const balance = await this.cToken.balanceOf(this.sender, this.opts);
        const { senderInterest } = await this.sablier.contract.methods.interestOf(this.streamId, streamedAmount).call();
        await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        const newBalance = await this.cToken.balanceOf(this.sender, this.opts);
        newBalance.should.be.bignumber.equal(balance.plus(senderInterest));
      });

      it("transfers the tokens and pays the interest to the recipient of the stream", async function() {
        const balance = await this.cToken.balanceOf(this.recipient, this.opts);
        const { senderInterest, sablierInterest } = await this.sablier.contract.methods
          .interestOf(this.streamId, streamedAmount)
          .call();
        await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        const netWithdrawalAmount = new BigNumber(streamedAmount).minus(senderInterest).minus(sablierInterest);
        const newBalance = await this.cToken.balanceOf(this.recipient, this.opts);
        newBalance.should.be.bignumber.equal(balance.plus(netWithdrawalAmount));
      });

      it("pays the interest to the sablier contract", async function() {
        const earnings = await this.sablier.getEarnings(this.cToken.address);
        const balance = await this.cToken.balanceOf(this.sablier.address, this.opts);
        const { sablierInterest } = await this.sablier.contract.methods
          .interestOf(this.streamId, streamedAmount)
          .call();
        await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        const newEarnings = await this.sablier.getEarnings(this.cToken.address);
        const newBalance = await this.cToken.balanceOf(this.sablier.address, this.opts);
        // The sender and the recipient's interests are included in `amount`,
        // so we don't subtract them again
        newEarnings.should.tolerateTheBlockTimeVariation(earnings.plus(sablierInterest), STANDARD_SCALE_INTEREST);
        newBalance.should.tolerateTheBlockTimeVariation(
          balance.minus(streamedAmount).plus(sablierInterest),
          STANDARD_SCALE_INTEREST,
        );
      });

      it("emits a withdrawfromstream event", async function() {
        const result = await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        await truffleAssert.eventEmitted(result, "WithdrawFromStream");
      });

      it("emits a payinterest event", async function() {
        const result = await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        await truffleAssert.eventEmitted(result, "PayInterest");
      });

      it("decreases the stream balance", async function() {
        const balance = await this.sablier.balanceOf(this.streamId, this.recipient, this.opts);
        await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        const newBalance = await this.sablier.balanceOf(this.streamId, this.recipient, this.opts);
        // Intuitively, one may say we don't have to tolerate the block time variation here.
        // However, the Sablier balance for the recipient can only go up from the bottom
        // low of `balance` - `amount`, due to uncontrollable runtime costs.
        newBalance.should.tolerateTheBlockTimeVariation(balance.minus(streamedAmount), STANDARD_SCALE_CTOKEN);
      });
    });

    contextForStreamDidEnd(function() {
      const streamedAmount = STANDARD_SALARY_CTOKEN.toString(10);

      it("withdraws from the stream", async function() {
        const senderBalance = await this.cToken.balanceOf(this.sender, this.opts);
        const recipientBalance = await this.cToken.balanceOf(this.recipient, this.opts);
        const sablierBalance = await this.cToken.balanceOf(this.sablier.address, this.opts);
        await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        const newSenderBalance = await this.cToken.balanceOf(this.sender, this.opts);
        const newRecipientBalance = await this.cToken.balanceOf(this.recipient, this.opts);
        const newSablierBalance = await this.cToken.balanceOf(this.sablier.address, this.opts);

        const sum = senderBalance.plus(recipientBalance).plus(sablierBalance);
        const newSum = newSenderBalance.plus(newRecipientBalance).plus(newSablierBalance);
        sum.should.be.bignumber.equal(newSum);
      });

      it("pays the interest to the sender of the stream", async function() {
        const balance = await this.cToken.balanceOf(this.sender, this.opts);
        const { senderInterest } = await this.sablier.contract.methods.interestOf(this.streamId, streamedAmount).call();
        await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        const newBalance = await this.cToken.balanceOf(this.sender, this.opts);
        newBalance.should.be.bignumber.equal(balance.plus(senderInterest));
      });

      it("transfers the tokens and pays the interest to the recipient of the stream", async function() {
        const balance = await this.cToken.balanceOf(this.recipient, this.opts);
        const { senderInterest, sablierInterest } = await this.sablier.contract.methods
          .interestOf(this.streamId, streamedAmount)
          .call();
        await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        const netWithdrawalAmount = new BigNumber(streamedAmount).minus(senderInterest).minus(sablierInterest);
        const newBalance = await this.cToken.balanceOf(this.recipient, this.opts);
        newBalance.should.be.bignumber.equal(balance.plus(netWithdrawalAmount));
      });

      it("pays the interest to the sablier contract", async function() {
        const earnings = await this.sablier.getEarnings(this.cToken.address);
        const balance = await this.cToken.balanceOf(this.sablier.address, this.opts);
        const { sablierInterest } = await this.sablier.contract.methods
          .interestOf(this.streamId, streamedAmount)
          .call();
        await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        const newEarnings = await this.sablier.getEarnings(this.cToken.address);
        const newBalance = await this.cToken.balanceOf(this.sablier.address, this.opts);
        // The sender and the recipient's interests are included in `amount`,
        // so we don't subtract them again
        newEarnings.should.tolerateTheBlockTimeVariation(earnings.plus(sablierInterest), STANDARD_SCALE_INTEREST);
        newBalance.should.tolerateTheBlockTimeVariation(
          balance.minus(streamedAmount).plus(sablierInterest),
          STANDARD_SCALE_INTEREST,
        );
      });

      it("emits a withdrawfromstream event", async function() {
        const result = await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        await truffleAssert.eventEmitted(result, "WithdrawFromStream");
      });

      it("emits a payinterest event", async function() {
        const result = await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        await truffleAssert.eventEmitted(result, "PayInterest");
      });

      it("deletes the stream objects", async function() {
        await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
        await truffleAssert.reverts(this.sablier.getStream(this.streamId), "stream does not exist");
        await truffleAssert.reverts(this.sablier.getCompoundingStream(this.streamId), "stream does not exist");
      });
    });
  });

  describe("when paused", function() {
    const streamedAmount = FIVE_UNITS_CTOKEN.toString(10);

    beforeEach(async function() {
      // Note that `sender` coincides with the owner of the contract
      await this.sablier.pause({ from: this.sender });
    });

    it("reverts", async function() {
      await truffleAssert.reverts(
        this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts),
        "Pausable: paused",
      );
    });
  });
}

function shouldBehaveLikeWithdrawFromCompoundingStream(alice, bob) {
  const deposit = STANDARD_SALARY_CTOKEN.toString(10);
  const now = new BigNumber(dayjs().unix());
  const startTime = now.plus(STANDARD_TIME_OFFSET);
  const stopTime = startTime.plus(STANDARD_TIME_DELTA);

  beforeEach(async function() {
    this.sender = alice;
    this.recipient = bob;
    this.opts = { from: this.sender };
    await this.cTokenManager.whitelistCToken(this.cToken.address, this.opts);
    await this.cToken.approve(this.sablier.address, deposit, this.opts);
  });

  describe("when the sender's interest share is not zero and the recipient's interest share is not zero", function() {
    const senderSharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
    const recipientSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;

    beforeEach(async function() {
      const result = await this.sablier.createCompoundingStream(
        this.recipient,
        deposit,
        this.cToken.address,
        startTime,
        stopTime,
        senderSharePercentage,
        recipientSharePercentage,
        this.opts,
      );
      this.streamId = Number(result.logs[0].args.streamId);
      await this.token.approve(this.cToken.address, STANDARD_SUPPLY_AMOUNT.toString(10), this.opts);
      await this.cToken.supplyUnderlying(STANDARD_SUPPLY_AMOUNT.toString(10), this.opts);
    });

    describe("when the sablier fee is not zero and is not 100", function() {
      beforeEach(async function() {
        await this.sablier.updateFee(new BigNumber(STANDARD_SABLIER_FEE));
      });

      runTests();
    });

    describe("when the sablier fee is 0", function() {
      beforeEach(async function() {
        await this.sablier.updateFee(new BigNumber(0));
      });

      runTests();
    });

    describe("when the sablier fee is 100", function() {
      beforeEach(async function() {
        await this.sablier.updateFee(new BigNumber(100));
      });

      runTests();
    });
  });

  describe("when the sender's interest share is zero", function() {
    const senderSharePercentage = new BigNumber(0);
    const recipientSharePercentage = new BigNumber(100);

    beforeEach(async function() {
      const result = await this.sablier.createCompoundingStream(
        this.recipient,
        deposit,
        this.cToken.address,
        startTime,
        stopTime,
        senderSharePercentage,
        recipientSharePercentage,
        this.opts,
      );
      this.streamId = Number(result.logs[0].args.streamId);
      await this.token.approve(this.cToken.address, STANDARD_SUPPLY_AMOUNT.toString(10), this.opts);
      await this.cToken.supplyUnderlying(STANDARD_SUPPLY_AMOUNT.toString(10), this.opts);
    });

    describe("when the sablier fee is not zero and is not 100", function() {
      beforeEach(async function() {
        await this.sablier.updateFee(new BigNumber(STANDARD_SABLIER_FEE));
      });

      runTests();
    });

    describe("when the sablier fee is 0", function() {
      beforeEach(async function() {
        await this.sablier.updateFee(new BigNumber(0));
      });

      runTests();
    });

    describe("when the sablier fee is 100", function() {
      beforeEach(async function() {
        await this.sablier.updateFee(new BigNumber(100));
      });

      runTests();
    });
  });

  describe("when the recipient's interest share is zero", function() {
    const senderSharePercentage = new BigNumber(100);
    const recipientSharePercentage = new BigNumber(0);

    beforeEach(async function() {
      const result = await this.sablier.createCompoundingStream(
        this.recipient,
        deposit,
        this.cToken.address,
        startTime,
        stopTime,
        senderSharePercentage,
        recipientSharePercentage,
        this.opts,
      );
      this.streamId = Number(result.logs[0].args.streamId);
      await this.token.approve(this.cToken.address, STANDARD_SUPPLY_AMOUNT.toString(10), this.opts);
      await this.cToken.supplyUnderlying(STANDARD_SUPPLY_AMOUNT.toString(10), this.opts);
    });

    describe("when the sablier fee is not zero and is not 100", function() {
      beforeEach(async function() {
        await this.sablier.updateFee(new BigNumber(STANDARD_SABLIER_FEE));
      });

      runTests();
    });

    describe("when the sablier fee is 0", function() {
      beforeEach(async function() {
        await this.sablier.updateFee(new BigNumber(0));
      });

      runTests();
    });

    describe("when the sablier fee is 100", function() {
      beforeEach(async function() {
        await this.sablier.updateFee(new BigNumber(100));
      });

      runTests();
    });
  });
}

module.exports = shouldBehaveLikeWithdrawFromCompoundingStream;
