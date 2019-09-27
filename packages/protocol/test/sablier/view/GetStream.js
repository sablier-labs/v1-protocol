const BigNumber = require("bignumber.js");
const truffleAssert = require("truffle-assertions");

function shouldBehaveLikeGetStream(alice) {
  const sender = alice;
  const opts = { from: sender };

  describe("when the stream does not exist", function() {
    it("reverts", async function() {
      const streamId = new BigNumber(419863);
      await truffleAssert.reverts(this.sablier.getStream(streamId, opts), "stream does not exist");
    });
  });
}

module.exports = shouldBehaveLikeGetStream;
