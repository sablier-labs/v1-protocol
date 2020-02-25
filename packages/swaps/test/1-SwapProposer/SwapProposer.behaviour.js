const { devConstants } = require("@sablier/dev-utils");
const truffleAssert = require("truffle-assertions");

const SwapProposer = artifacts.require("./SwapProposer.sol");

const shouldBehaveLikeGetSwapProposal = require("./view/GetSwapProposal");
const shouldBehaveLikeProposeSwap = require("./effects/proposal/ProposeSwap");
const shouldBehaveLikeCancelProposedSwap = require("./effects/proposal/CancelProposedSwap");

const { ZERO_ADDRESS } = devConstants;

function shouldBehaveLikeSwapProposer(alice, bob, carol, eve) {
  describe("constructor", function() {

    it("reverts when the swap executor contract is the zero address", async function() {
      const opts = { from: alice };

      await truffleAssert.reverts(
        SwapProposer.new(ZERO_ADDRESS, opts),
        "SwapExecutor contract address is zero address.",
      );
    });
  });

  describe("view functions", function() {
    describe("getSwapProposal", function() {
      shouldBehaveLikeGetSwapProposal(alice);
    });
  });

  describe("effects & interactions functions", function() {
    describe("proposeSwap", function() {
      shouldBehaveLikeProposeSwap(alice, bob);
    });

    describe("cancelSwapProposal", function() {
      shouldBehaveLikeCancelProposedSwap(alice, bob, eve);
    });
  });
}

module.exports = {
  shouldBehaveLikeSwapProposer,
};
