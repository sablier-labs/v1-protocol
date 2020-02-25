const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_DELTA, STANDARD_TIME_OFFSET } = devConstants;
const { contextForStreamDidStartButNotEnd } = mochaContexts;

function runTests() {
  contextForStreamDidStartButNotEnd(function() {
    describe("when the withdrawal amount is within the available balance", function() {

      it("makes the withdrawal", async function() {
        const balance = await this.token.balanceOf(this.opts.from);
        await this.streamedSwap.withdrawFromSwap(this.swapId, FIVE_UNITS, this.opts);
        const newBalance = await this.token.balanceOf(this.opts.from);
        newBalance.should.be.bignumber.equal(balance.plus(FIVE_UNITS));
      });

      it("emits a withdrawfromswap event", async function() {
        const result = await this.streamedSwap.withdrawFromSwap(this.swapId, FIVE_UNITS, this.opts);
        truffleAssert.eventEmitted(result, "WithdrawFromSwap");
      });

      it("decreases the stream balance", async function() {
        const streamBalance = await this.streamedSwap.balanceOf(this.swapId, this.opts.from)
        await this.streamedSwap.withdrawFromSwap(this.swapId, FIVE_UNITS, this.opts);
        const newStreamBalance = await this.streamedSwap.balanceOf(this.swapId, this.opts.from)
        if (this.token == this.token1) {
          newStreamBalance.balance1.should.tolerateTheBlockTimeVariation(streamBalance.balance1.minus(FIVE_UNITS), STANDARD_SCALE);
        } else if (this.token == this.token2) {
          newStreamBalance.balance2.should.tolerateTheBlockTimeVariation(streamBalance.balance2.minus(FIVE_UNITS), STANDARD_SCALE);
        }
      });
    });

    describe("when the withdrawal amount is not within the available balance", function() {
      const withdrawalAmount = STANDARD_SALARY.multipliedBy(2).toString(10);

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.streamedSwap.withdrawFromSwap(this.swapId, withdrawalAmount, this.opts),
          "amount exceeds the available balance",
        );
      });
    });
  });
}

function shouldBehaveLikeWithdrawFromSwap(alice, bob, carol, eve) {
  const now = new BigNumber(dayjs().unix());

  describe("when the swap exists", function() {
    let swapId;
    const sender = alice;
    const receiver = bob;
    const salary = STANDARD_SALARY.toString(10);
    const duration = STANDARD_TIME_DELTA;
    // let streamId;

    beforeEach(async function() {
      const optsSender = { from: sender };
      const optsReceiver = { from: receiver };

      await this.token1.approve(this.streamedSwap.address, salary, optsSender);
      await this.token2.approve(this.streamedSwap.address, salary, optsReceiver);
      const result = await this.streamedSwap.proposeSwap(
        receiver,
        salary,
        salary,
        this.token1.address,
        this.token2.address,
        duration,
        optsSender,
      );
      this.swapId = Number(result.logs[0].args.swapId);
      await this.streamedSwap.executeSwap(this.swapId, optsReceiver);
      // streamId = Number(result.logs[0].args.streamId);
    });

    describe("when the caller is the sender", function() {
      beforeEach(async function() {
        this.opts = { from: sender };
        this.token = this.token2;
      });

      runTests();
    });

    describe("when the caller is the receiver", function() {
      beforeEach(async function() {
        this.opts = { from: receiver };
        this.token = this.token1;
      });

      runTests();
    });

    describe("when the caller is not the sender or receiver", function() {
      const opts = { from: eve };

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.streamedSwap.withdrawFromSwap(this.swapId, FIVE_UNITS, opts),
          "caller is not the sender or recipient"
        );
      });
    });
  });

  describe("when the swap does not exist", function() {
    const opts = { from: bob };

    it("reverts", async function() {
      const swapId = new BigNumber(419863);
      await truffleAssert.reverts(
        this.streamedSwap.withdrawFromSwap(swapId, FIVE_UNITS, opts),
        "swap does not exist",
      );
    });
  });
}

module.exports = shouldBehaveLikeWithdrawFromSwap;
