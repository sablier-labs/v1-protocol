const BigNumber = require("bignumber.js");
const truffleAssert = require("truffle-assertions");

function shouldBehaveLikeGetSwapProposal(alice) {
  describe("when the swap proposal does not exist", function() {
    const company = alice;
    const opts = { from: company };

    it("reverts", async function() {
      const swapId = new BigNumber(419863);
      await truffleAssert.reverts(this.swapProposer.getSwapProposal(swapId, opts), "swap proposal does not exist");
    });
  });
}

module.exports = shouldBehaveLikeGetSwapProposal;
