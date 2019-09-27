function shouldBehaveLikeIsCToken(alice) {
  const admin = alice;
  const opts = { from: admin };

  describe("when the cToken is whitelisted", function() {
    beforeEach(async function() {
      await this.cTokenManager.whitelistCToken(this.cToken.address, opts);
    });

    it("returns true", async function() {
      const result = await this.cTokenManager.isCToken(this.cToken.address, opts);
      result.should.be.equal(true);
    });
  });

  describe("when the cToken is not whitelisted", function() {
    it("returns false", async function() {
      const result = await this.cTokenManager.isCToken(this.cToken.address, opts);
      result.should.be.equal(false);
    });
  });
}

module.exports = shouldBehaveLikeIsCToken;
