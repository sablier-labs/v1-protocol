const truffleAssert = require("truffle-assertions");

function shouldBehaveLikeGetEarnings(alice) {
  const sender = alice;
  const opts = { from: sender };

  describe("when the ctoken is not whitelisted", function() {
    it("reverts", async function() {
      await truffleAssert.reverts(this.sablier.getEarnings(this.token.address, opts), "token is not cToken");
    });
  });
}

module.exports = shouldBehaveLikeGetEarnings;
