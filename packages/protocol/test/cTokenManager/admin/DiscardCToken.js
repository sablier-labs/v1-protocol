const truffleAssert = require("truffle-assertions");

function shouldBehaveLikeDiscardCToken(alice, eve) {
  const admin = alice;

  describe("when the caller is the admin", function() {
    const opts = { from: admin };

    describe("when the cToken is whitelisted", function() {
      beforeEach(async function() {
        await this.cTokenManager.whitelistCToken(this.cToken.address, opts);
      });

      it("discards the cToken", async function() {
        await this.cTokenManager.discardCToken(this.cToken.address, opts);
        const result = await this.cTokenManager.isCToken(this.cToken.address);
        result.should.be.equal(false);
      });

      it("emits a discardctoken event", async function() {
        const result = await this.cTokenManager.discardCToken(this.cToken.address, opts);
        await truffleAssert.eventEmitted(result, "DiscardCToken");
      });
    });

    describe("when the cToken is not whitelisted", function() {
      it("reverts", async function() {
        await truffleAssert.reverts(
          this.cTokenManager.discardCToken(this.cToken.address, opts),
          "cToken is not whitelisted",
        );
      });
    });
  });

  describe("when the caller is not the admin", function() {
    const opts = { from: eve };

    it("reverts", async function() {
      await truffleAssert.reverts(
        this.cTokenManager.discardCToken(this.cToken.address, opts),
        truffleAssert.ErrorType.REVERT,
      );
    });
  });
}

module.exports = shouldBehaveLikeDiscardCToken;
