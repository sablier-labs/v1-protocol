const shouldBehaveLikeWhitelistCToken = require("./admin/WhitelistCToken");
const shouldBehaveLikeDiscardCToken = require("./admin/DiscardCToken");

const shouldBehaveLikeIsCToken = require("./view/IsCToken");

function shouldBehaveLikeCTokenManager(alice, bob, carol, eve) {
  describe("admin functions", function() {
    describe("whitelistCToken", function() {
      shouldBehaveLikeWhitelistCToken(alice, eve);
    });

    describe("discardCToken", function() {
      shouldBehaveLikeDiscardCToken(alice, eve);
    });
  });

  describe("view functions", function() {
    describe("isCToken", function() {
      shouldBehaveLikeIsCToken(alice);
    });
  });
}

module.exports = shouldBehaveLikeCTokenManager;
