const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_DELTA, STANDARD_TIME_OFFSET } = devConstants;
const { contextForStreamDidStartButNotEnd } = mochaContexts;

function runTests() {
  contextForStreamDidStartButNotEnd(function() {
    const streamedAmount = FIVE_UNITS.toString(10);

    it("cancels the swap", async function() {
      await this.streamedSwap.cancelSwap(this.swapId, this.opts);
      await truffleAssert.reverts(this.streamedSwap.getSwap(this.swapId), "swap does not exist");
    });

    it("transfers the tokens to the sender of the stream", async function() {
      const balance = await this.token2.balanceOf(this.company);
      await this.streamedSwap.cancelSwap(this.swapId, this.opts);
      const newBalance = await this.token2.balanceOf(this.company);
      const tolerateByAddition = false;
      newBalance.should.tolerateTheBlockTimeVariation(
        balance.minus(streamedAmount).plus(this.salary),
        STANDARD_SCALE,
        tolerateByAddition,
      );
    });

    it("transfers the tokens to the recipient of the stream", async function() {
      const balance = await this.token1.balanceOf(this.employee);
      await this.streamedSwap.cancelSwap(this.swapId, this.opts);
      const newBalance = await this.token1.balanceOf(this.employee);
      newBalance.should.tolerateTheBlockTimeVariation(balance.plus(streamedAmount), STANDARD_SCALE);
    });

    it("emits a cancelswap event", async function() {
      const result = await this.streamedSwap.cancelSwap(this.swapId, this.opts);
      truffleAssert.eventEmitted(result, "CancelSwap");
    });
  });
}

function shouldBehaveLikeCancelSwap(alice, bob, eve) {
  const now = new BigNumber(dayjs().unix());
  const startTime = now.plus(STANDARD_TIME_OFFSET);
  const stopTime = startTime.plus(STANDARD_TIME_DELTA);

  beforeEach(async function() {
    this.sender = alice;
    this.recipient = bob;
    this.salary = STANDARD_SALARY.toString(10);
  });

  describe("when the swap exists", function() {
    beforeEach(async function() {
      this.opts = { from: this.company };
      await this.token.approve(this.streamedSwap.address, this.salary, this.opts);
      const result = await this.streamedSwap.createSwap(
        this.recipient,
        this.salary,
        this.salary,
        this.token1.address,
        this.token2.address,
        startTime,
        stopTime,
        this.opts,
      );
      this.swapId = Number(result.logs[0].args.swapId);
    });

    describe("when the caller is the sender", function() {
      beforeEach(async function() {
        this.opts = { from: this.sender };
      });

      runTests();
    });

    describe("when the caller is the recipient", function() {
      beforeEach(async function() {
        this.opts = { from: this.recipient };
      });

      runTests();
    });

    describe("when the caller is not the sender or the recipient", function() {
      const opts = { from: eve };

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.streamedSwap.cancelSwap(this.swapId, opts),
          "caller is not the sender or the recipient",
        );
      });
    });
  });

  describe("when the swap does not exist", function() {
    const opts = { from: alice };

    it("reverts", async function() {
      const swapId = new BigNumber(419863);
      await truffleAssert.reverts(this.streamedSwap.cancelSwap(swapId, opts), "swap does not exist");
    });
  });
}

module.exports = shouldBehaveLikeCancelSwap;
