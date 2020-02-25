const { devConstants } = require("@sablier/dev-utils");
const truffleAssert = require("truffle-assertions");

// const shouldBehaveLikeGetSwap = require("../StreamedSwap/view/GetSwap");

// const shouldBehaveLikeExecuteSwap = require("../StreamedSwap/effects/swap/ExecuteSwap");
// const shouldBehaveLikeWithdrawFromSwap = require("../StreamedSwap/effects/swap/WithdrawFromSwap");
// const shouldBehaveLikeCancelSwap = require("../StreamedSwap/effects/swap/CancelSwap");

const SwapExecutor = artifacts.require("./SwapExecutor.sol");
const { ZERO_ADDRESS } = devConstants;

function shouldBehaveLikeSwapExecutor(alice, bob, carol, eve) {
  describe("constructor", function() {
    it("reverts when the sablier contract is the zero address", async function() {
      const opts = { from: alice };

      await truffleAssert.reverts(
        SwapExecutor.new(ZERO_ADDRESS, this.swapProposer.address, opts),
        "Sablier contract address is zero address.",
      );
    });

    it("reverts when the swap proposer contract is the zero address", async function() {
      const opts = { from: alice };

      await truffleAssert.reverts(
        SwapExecutor.new(this.sablier.address, ZERO_ADDRESS, opts),
        "SwapProposer contract address is zero address.",
      );
    });
  });

  // describe("view functions", function() {
  //   describe("getSwap", function() {
  //     shouldBehaveLikeGetSwap(alice);
  //   });
  // });

  // describe("effects & interactions functions", function() {
  //   describe("createSwap", function() {
  //     shouldBehaveLikeExecuteSwap(alice, bob);
  //   });

  //   /**
  //    * We don't run tests for compounding stream withdrawals because they behave exactly the same as normal stream
  //    * withdrawals, from the point of view of the payroll proxy.
  //    */
  //   describe("withdrawFromSwap", function() {
  //     shouldBehaveLikeWithdrawFromSwap(alice, bob, carol, eve);
  //   });

  //   describe("cancelSwap", function() {
  //     shouldBehaveLikeCancelSwap(alice, bob, eve);
  //   });
  // });
}

module.exports = {
  shouldBehaveLikeSwapExecutor,
};
