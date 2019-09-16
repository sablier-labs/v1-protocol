const truffleAssert = require("truffle-assertions");

function shouldBehaveLikeDiscardCToken(alice, eve) {
  const admin = alice;

  describe("when the caller is the admin", function() {
    const opts = { from: admin };

    describe("when the ctoken is whitelisted", function() {
      beforeEach(async function() {
        await this.sablier.whitelistCToken(this.cToken.address, opts);
      });

      it("discards the ctoken", async function() {
        await this.sablier.discardCToken(this.cToken.address, opts);
        const result = await this.sablier.cTokens(this.cToken.address);
        result.should.be.equal(false);
      });

      it("emits a discardctoken event", async function() {
        const result = await this.sablier.discardCToken(this.cToken.address, opts);
        await truffleAssert.eventEmitted(result, "DiscardCToken");
      });
    });

    describe("when the ctoken is not whitelisted", function() {
      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.discardCToken(this.cToken.address, opts),
          "ctoken is not whitelisted",
        );
      });
    });
  });

  describe("when the caller is not the admin", function() {
    const opts = { from: eve };

    it("reverts", async function() {
      await truffleAssert.reverts(
        this.sablier.discardCToken(this.cToken.address, opts),
        truffleAssert.ErrorType.REVERT,
      );
    });
  });
}

module.exports = shouldBehaveLikeDiscardCToken;
