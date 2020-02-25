const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_DELTA, STANDARD_TIME_OFFSET } = devConstants;
const { contextForStreamDidStartButNotEnd } = mochaContexts;

function runTests() {
  contextForStreamDidStartButNotEnd(function() {
    const streamedAmount = FIVE_UNITS.toString(10);

    it("cancels the proposal", async function() {
      await this.swapProposer.cancelProposedSwap(this.swapId, this.opts);
      await truffleAssert.reverts(this.swapProposer.getSwapProposal(this.swapId), "swap proposal does not exist");
    });

    it("refunds the tokens to the sender of the swap", async function() {
      const balance = await this.token1.balanceOf(this.sender);
      await this.swapProposer.cancelProposedSwap(this.swapId, this.opts);
      const newBalance = await this.token1.balanceOf(this.sender);
      newBalance.should.be.bignumber.equal(balance.plus(this.salary));
    });

    it("emits a cancelswap event", async function() {
      const result = await this.swapProposer.cancelProposedSwap(this.swapId, this.opts);
      truffleAssert.eventEmitted(result, "CancelProposal");
    });
  });
}

function shouldBehaveLikeCancelProposedSwap(alice, bob, eve) {
  const now = new BigNumber(dayjs().unix());
  const duration = STANDARD_TIME_DELTA;

  beforeEach(async function() {
    this.sender = alice;
    this.recipient = bob;
    this.salary = STANDARD_SALARY.toString(10);
  });

  describe("when the swap proposal exists", function() {
    beforeEach(async function() {
      this.senderOpts = { from: this.sender };
      this.recipientOpts = { from: this.recipient };

      await this.token1.approve(this.swapProposer.address, this.salary, this.senderOpts);

      const result = await this.swapProposer.proposeSwap(
        this.recipient,
        this.salary,
        this.salary,
        this.token1.address,
        this.token2.address,
        duration,
        this.senderOpts,
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
          this.swapProposer.cancelProposedSwap(this.swapId, opts),
          "caller is not the sender or recipient",
        );
      });
    });
  });

  describe("when the swap proposal does not exist", function() {
    const opts = { from: alice };

    it("reverts", async function() {
      const swapId = new BigNumber(419863);
      await truffleAssert.reverts(this.swapProposer.cancelProposedSwap(swapId, opts), "swap proposal does not exist");
    });
  });
}

module.exports = shouldBehaveLikeCancelProposedSwap;
