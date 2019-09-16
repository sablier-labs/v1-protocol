const truffleAssert = require("truffle-assertions");

function shouldBehaveLikeWhitelistCToken(alice, eve) {
  const admin = alice;

  describe("when the caller is the admin", function() {
    const opts = { from: admin };

    describe("when the ctoken is not whitelisted", function() {
      it("whitelists the ctoken", async function() {
        await this.sablier.whitelistCToken(this.cToken.address, opts);
        const result = await this.sablier.cTokens(this.cToken.address);
        result.should.be.equal(true);
      });

      it("emits a whitelistctoken event", async function() {
        const result = await this.sablier.whitelistCToken(this.cToken.address, opts);
        await truffleAssert.eventEmitted(result, "WhitelistCToken");
      });
    });

    describe("when the token is not a ctoken", function() {
      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.whitelistCToken(this.token.address, opts),
          truffleAssert.ErrorType.REVERT,
        );
      });
    });

    describe("when the ctoken is whitelisted", function() {
      it("reverts", async function() {
        await this.sablier.whitelistCToken(this.cToken.address, opts);
        await truffleAssert.reverts(this.sablier.whitelistCToken(this.cToken.address, opts), "ctoken is whitelisted");
      });
    });
  });

  describe("when the caller is not the admin", function() {
    const opts = { from: eve };

    it("reverts", async function() {
      await truffleAssert.reverts(
        this.sablier.whitelistCToken(this.cToken.address, opts),
        truffleAssert.ErrorType.REVERT,
      );
    });
  });
}

module.exports = shouldBehaveLikeWhitelistCToken;
