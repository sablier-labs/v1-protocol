const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { contextForStreamDidEnd, contextForStreamDidStartButNotEnd } = mochaContexts;

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

function runTests() {
  describe("when there were no withdrawals", function() {
    describe("when the stream did not start", function() {
      it("cancels the stream", async function() {
        await this.sablier.cancelStream(this.streamId, this.opts);
        await truffleAssert.reverts(this.sablier.getStream(this.streamId), "stream does not exist");
        await truffleAssert.reverts(this.sablier.getCompoundingStream(this.streamId), "stream does not exist");
      });
    });

    contextForStreamDidStartButNotEnd(function() {
      const recipientBalance = FIVE_UNITS_CTOKEN.toString(10);

      it("cancels the stream", async function() {
        await this.sablier.cancelStream(this.streamId, this.opts);
        await truffleAssert.reverts(this.sablier.getStream(this.streamId), "stream does not exist");
        await truffleAssert.reverts(this.sablier.getCompoundingStream(this.streamId), "stream does not exist");
      });

      it("transfers the tokens and pays the interest to the sender of the stream", async function() {
        const balance = await this.cToken.balanceOf(this.sender, this.opts);
        const { senderInterest } = await this.sablier.contract.methods
          .interestOf(this.streamId, recipientBalance)
          .call();
        await this.sablier.cancelStream(this.streamId, this.opts);
        const newBalance = await this.cToken.balanceOf(this.sender, this.opts);
        const tolerateByAddition = false;
        newBalance.should.tolerateTheBlockTimeVariation(
          balance
            .minus(recipientBalance)
            .plus(this.deposit)
            .plus(senderInterest),
          STANDARD_SCALE_CTOKEN,
          tolerateByAddition,
        );
      });

      it("transfers the tokens and pays the interest to the recipient of the stream", async function() {
        const balance = await this.cToken.balanceOf(this.recipient, this.opts);
        const { senderInterest, sablierInterest } = await this.sablier.contract.methods
          .interestOf(this.streamId, recipientBalance)
          .call();
        await this.sablier.cancelStream(this.streamId, this.opts);
        const netWithdrawalAmount = new BigNumber(recipientBalance).minus(senderInterest).minus(sablierInterest);
        const newBalance = await this.cToken.balanceOf(this.recipient, this.opts);
        newBalance.should.tolerateTheBlockTimeVariation(balance.plus(netWithdrawalAmount), STANDARD_SCALE_CTOKEN);
      });

      it("pays the interest to the sablier contract", async function() {
        const earnings = await this.sablier.getEarnings(this.cToken.address, this.opts);
        const balance = await this.cToken.balanceOf(this.sablier.address, this.opts);
        const { remainingBalance } = await this.sablier.contract.methods.getStream(this.streamId).call();
        const { sablierInterest } = await this.sablier.contract.methods
          .interestOf(this.streamId, recipientBalance)
          .call();
        await this.sablier.cancelStream(this.streamId, this.opts);
        const newEarnings = await this.sablier.getEarnings(this.cToken.address, this.opts);
        const newBalance = await this.cToken.balanceOf(this.sablier.address, this.opts);
        newEarnings.should.tolerateTheBlockTimeVariation(earnings.plus(sablierInterest), STANDARD_SCALE_INTEREST);
        // The sender and the recipient's interests are included in `stream.remainingBalance`,
        // so we don't subtract them again
        newBalance.should.tolerateTheBlockTimeVariation(
          balance.minus(remainingBalance).plus(sablierInterest),
          STANDARD_SCALE_INTEREST,
        );
      });

      it("emits a cancelstream event", async function() {
        const result = await this.sablier.cancelStream(this.streamId, this.opts);
        await truffleAssert.eventEmitted(result, "CancelStream");
      });

      it("emits a payinterest event", async function() {
        const result = await this.sablier.cancelStream(this.streamId, this.opts);
        await truffleAssert.eventEmitted(result, "PayInterest");
      });
    });

    contextForStreamDidEnd(function() {
      const recipientBalance = STANDARD_SALARY_CTOKEN.toString(10);

      it("cancels the stream", async function() {
        await this.sablier.cancelStream(this.streamId, this.opts);
        await truffleAssert.reverts(this.sablier.getStream(this.streamId), "stream does not exist");
        await truffleAssert.reverts(this.sablier.getCompoundingStream(this.streamId), "stream does not exist");
      });

      it("transfers the tokens and pays the interest to the sender of the stream", async function() {
        const balance = await this.cToken.balanceOf(this.sender, this.opts);
        const { senderInterest } = await this.sablier.contract.methods
          .interestOf(this.streamId, recipientBalance)
          .call();
        await this.sablier.cancelStream(this.streamId, this.opts);
        const newBalance = await this.cToken.balanceOf(this.sender, this.opts);
        newBalance.should.be.bignumber.equal(balance.plus(senderInterest));
      });

      it("transfers the tokens and pays the interest to the recipient of the stream", async function() {
        const balance = await this.cToken.balanceOf(this.recipient, this.opts);
        const { senderInterest, sablierInterest } = await this.sablier.contract.methods
          .interestOf(this.streamId, recipientBalance)
          .call();
        await this.sablier.cancelStream(this.streamId, this.opts);
        const netWithdrawalAmount = new BigNumber(recipientBalance).minus(senderInterest).minus(sablierInterest);
        const newBalance = await this.cToken.balanceOf(this.recipient, this.opts);
        newBalance.should.be.bignumber.equal(balance.plus(netWithdrawalAmount));
      });

      it("pays the interest to the sablier contract", async function() {
        const earnings = await this.sablier.getEarnings(this.cToken.address, this.opts);
        const balance = await this.cToken.balanceOf(this.sablier.address, this.opts);
        const stream = await this.sablier.contract.methods.getStream(this.streamId).call();
        const { sablierInterest } = await this.sablier.contract.methods
          .interestOf(this.streamId, recipientBalance)
          .call();
        await this.sablier.cancelStream(this.streamId, this.opts);
        const newEarnings = await this.sablier.getEarnings(this.cToken.address, this.opts);
        const newBalance = await this.cToken.balanceOf(this.sablier.address, this.opts);
        // The sender and the recipient's interests are included in `stream.remainingBalance`,
        // so we don't subtract them again
        newEarnings.should.tolerateTheBlockTimeVariation(earnings.plus(sablierInterest), STANDARD_SCALE_INTEREST);
        newBalance.should.tolerateTheBlockTimeVariation(
          balance.minus(stream.remainingBalance).plus(sablierInterest),
          STANDARD_SCALE_INTEREST,
        );
      });

      it("emits a cancelstream event", async function() {
        const result = await this.sablier.cancelStream(this.streamId, this.opts);
        await truffleAssert.eventEmitted(result, "CancelStream");
      });

      it("emits a payinterest event", async function() {
        const result = await this.sablier.cancelStream(this.streamId, this.opts);
        await truffleAssert.eventEmitted(result, "PayInterest");
      });
    });
  });

  describe("when there were withdrawals", function() {
    contextForStreamDidStartButNotEnd(function() {
      beforeEach(async function() {
        const streamedAmount = FIVE_UNITS_CTOKEN.toString(10);
        await this.sablier.withdrawFromStream(this.streamId, streamedAmount, this.opts);
      });

      it("cancels the stream", async function() {
        await this.sablier.cancelStream(this.streamId, this.opts);
        await truffleAssert.reverts(this.sablier.getStream(this.streamId), "stream does not exist");
        await truffleAssert.reverts(this.sablier.getCompoundingStream(this.streamId), "stream does not exist");
      });
    });
  });
}

function shouldBehaveLikeCancelCompoundingStream(alice, bob) {
  const now = new BigNumber(dayjs().unix());
  const startTime = now.plus(STANDARD_TIME_OFFSET);
  const stopTime = startTime.plus(STANDARD_TIME_DELTA);

  beforeEach(async function() {
    this.sender = alice;
    this.recipient = bob;
    this.deposit = STANDARD_SALARY_CTOKEN.toString(10);
    this.opts = { from: this.sender };
    await this.cTokenManager.whitelistCToken(this.cToken.address, { from: alice });
    await this.cToken.approve(this.sablier.address, this.deposit, { from: alice });
  });

  describe("when the sender's interest share is not zero and the recipient's interest share is not zero", function() {
    const senderSharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
    const recipientSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;

    beforeEach(async function() {
      const result = await this.sablier.createCompoundingStream(
        this.recipient,
        this.deposit,
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
        await this.sablier.updateFee(STANDARD_SABLIER_FEE);
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
        this.deposit,
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
        await this.sablier.updateFee(STANDARD_SABLIER_FEE);
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
        this.deposit,
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
        await this.sablier.updateFee(STANDARD_SABLIER_FEE);
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

module.exports = shouldBehaveLikeCancelCompoundingStream;
