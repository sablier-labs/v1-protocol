const truffleAssert = require("truffle-assertions");

function shouldBehaveLikeWhitelistCToken(alice, eve) {
  const admin = alice;

  describe("when the caller is the admin", function() {
    const opts = { from: admin };

    describe("when the cToken is not whitelisted", function() {
      it("whitelists the cToken", async function() {
        await this.cTokenManager.whitelistCToken(this.cToken.address, opts);
        const result = await this.cTokenManager.isCToken(this.cToken.address);
        result.should.be.equal(true);
      });

      it("emits a whitelistctoken event", async function() {
        const result = await this.cTokenManager.whitelistCToken(this.cToken.address, opts);
        await truffleAssert.eventEmitted(result, "WhitelistCToken");
      });
    });

    describe("when the token is not a cToken", function() {
      it("reverts", async function() {
        // Fails because `this.token` doesn't have the `isCToken` method
        await truffleAssert.reverts(
          this.cTokenManager.whitelistCToken(this.token.address, opts),
          truffleAssert.ErrorType.REVERT,
        );
      });
    });

    describe("when the cToken is whitelisted", function() {
      it("reverts", async function() {
        await this.cTokenManager.whitelistCToken(this.cToken.address, opts);
        await truffleAssert.reverts(
          this.cTokenManager.whitelistCToken(this.cToken.address, opts),
          "cToken is whitelisted",
        );
      });
    });
  });

  describe("when the caller is not the admin", function() {
    const opts = { from: eve };

    it("reverts", async function() {
      await truffleAssert.reverts(
        this.cTokenManager.whitelistCToken(this.cToken.address, opts),
        truffleAssert.ErrorType.REVERT,
      );
    });
  });
}

module.exports = shouldBehaveLikeWhitelistCToken;
