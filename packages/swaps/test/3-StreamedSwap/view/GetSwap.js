const BigNumber = require("bignumber.js");
const truffleAssert = require("truffle-assertions");

function shouldBehaveLikeGetSwap(alice) {
  describe("when the swap does not exist", function() {
    const company = alice;
    const opts = { from: company };

    it("reverts", async function() {
      const swapId = new BigNumber(419863);
      await truffleAssert.reverts(this.streamedSwap.getSwap(swapId, opts), "swap does not exist");
    });
  });
}

module.exports = shouldBehaveLikeGetSwap;
