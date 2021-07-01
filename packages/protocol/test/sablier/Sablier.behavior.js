const shouldBehaveLikeDeltaOf = require("./view/DeltaOf");
const shouldBehaveLikeBalanceOf = require("./view/BalanceOf");
const shouldBehaveLikeGetStream = require("./view/GetStream");

const shouldBehaveLikeERC1620CreateStream = require("./effects/stream/CreateStream");
const shouldBehaveLikeERC1620WithdrawFromStream = require("./effects/stream/WithdrawFromStream");
// eslint-disable-next-line max-len
const shouldBehaveLikeERC1620CancelStream = require("./effects/stream/CancelStream");

function shouldBehaveLikeSablier(alice, bob, carol, eve) {
  describe("view functions", function() {
    describe("getStream", function() {
      shouldBehaveLikeGetStream(alice);
    });

    describe("deltaOf", function() {
      shouldBehaveLikeDeltaOf(alice, bob);
    });

    describe("balanceOf", function() {
      shouldBehaveLikeBalanceOf(alice, bob, carol);
    });
  });

  describe("effects & interactions functions", function() {
    describe("createStream", function() {
      shouldBehaveLikeERC1620CreateStream(alice, bob);
    });

    describe("withdrawFromStream", function() {
      shouldBehaveLikeERC1620WithdrawFromStream(alice, bob, eve);
    });

    describe("cancelStream", function() {
      shouldBehaveLikeERC1620CancelStream(alice, bob, eve);
    });
  });
}

module.exports = shouldBehaveLikeSablier;
