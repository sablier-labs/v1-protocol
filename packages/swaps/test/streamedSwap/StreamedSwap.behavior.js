const { devConstants } = require("@sablier/dev-utils");
const truffleAssert = require("truffle-assertions");

const shouldBehaveLikeGetSwap = require("./view/GetSwap");

const shouldBehaveLikeCreateSwap = require("./effects/salary/CreateSwap");
const shouldBehaveLikeWithdrawFromSwap = require("./effects/salary/WithdrawFromSwap");
const shouldBehaveLikeCancelSwap = require("./effects/salary/CancelSwap");

const StreamedSwap = artifacts.require("./StreamedSwap.sol");
const { ZERO_ADDRESS } = devConstants;

function shouldBehaveLikeStreamedSwap(alice, bob, carol, eve) {
  describe("constructor", function() {
    it("reverts when the sablier contract is the zero address", async function() {
      const opts = { from: alice };

      await truffleAssert.reverts(
        StreamedSwap.new(ZERO_ADDRESS, opts),
        "Sablier contract address is zero address.",
      );
    });
  });

  describe("view functions", function() {
    describe("getSwap", function() {
      shouldBehaveLikeGetSwap(alice);
    });
  });

  describe("effects & interactions functions", function() {
    describe("createSwap", function() {
      shouldBehaveLikeCreateSwap(alice, bob);
    });

    /**
     * We don't run tests for compounding stream withdrawals because they behave exactly the same as normal stream
     * withdrawals, from the point of view of the payroll proxy.
     */
    describe("withdrawFromSwap", function() {
      shouldBehaveLikeWithdrawFromSwap(alice, bob, carol, eve);
    });

    describe("cancelSwap", function() {
      shouldBehaveLikeCancelSwap(alice, bob, eve);
    });
  });
}

module.exports = {
  shouldBehaveLikeStreamedSwap,
};