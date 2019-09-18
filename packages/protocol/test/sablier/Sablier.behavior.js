const traveler = require("ganache-time-traveler");

const shouldBehaveLikeWhitelistCToken = require("./admin/WhitelistCToken");
const shouldBehaveLikeDiscardCToken = require("./admin/DiscardCToken");
const shouldBehaveLikeUpdateFee = require("./admin/UpdateFee");
const shouldBehaveLikeTakeEarnings = require("./admin/TakeEarnings");

const shouldBehaveLikeBalanceOf = require("./view/BalanceOf");
const shouldBehaveLikeDeltaOf = require("./view/DeltaOf");
const shouldBehaveLikeGetStream = require("./view/GetStream");
const shouldBehaveLikeGetCompoundingStreamVars = require("./view/GetCompoundingStreamVars");

const shouldBehaveLikeERC1620CreateStream = require("./effects/stream/CreateStream");
const shouldBehaveLikeCreateCompoundingStream = require("./effects/compoundingStream/CreateCompoundingStream");
const shouldBehaveLikeERC1620WithdrawFromStream = require("./effects/stream/WithdrawFromStream");
// eslint-disable-next-line max-len
const shouldBehaveLikeWithdrawFromCompoundingStream = require("./effects/compoundingStream/WithdrawFromCompoundingStream");
const shouldBehaveLikeERC1620CancelStream = require("./effects/stream/CancelStream");
const shouldBehaveLikeCancelCompoundingStream = require("./effects/compoundingStream/CancelCompoundingStream");

function shouldBehaveLikeSablier(alice, bob, carol, eve) {
  let snapshot;
  let snapshotId;

  before(async () => {
    snapshot = await traveler.takeSnapshot();
    snapshotId = snapshot.result;
  });

  after(async () => {
    await traveler.revertToSnapshot(snapshotId);
  });

  describe("admin functions", function() {
    describe("whitelistCToken", function() {
      shouldBehaveLikeWhitelistCToken(alice, eve);
    });

    describe("discardCToken", function() {
      shouldBehaveLikeDiscardCToken(alice, eve);
    });

    describe("updateFee", function() {
      shouldBehaveLikeUpdateFee(alice, eve);
    });

    describe("takeEarnings", function() {
      shouldBehaveLikeTakeEarnings(alice, bob, eve);
    });
  });

  describe("view functions", function() {
    describe("balanceOf", function() {
      shouldBehaveLikeBalanceOf(alice, bob, carol);
    });

    describe("deltaOf", function() {
      shouldBehaveLikeDeltaOf(alice, bob);
    });

    describe("getStream", function() {
      shouldBehaveLikeGetStream(alice);
    });

    describe("getCompoundingStreamVars", function() {
      shouldBehaveLikeGetCompoundingStreamVars(alice, bob);
    });
  });

  describe("effects & interactions functions", function() {
    describe("createStream", function() {
      shouldBehaveLikeERC1620CreateStream(alice, bob);
    });

    describe("createCompoundingStream", function() {
      shouldBehaveLikeCreateCompoundingStream(alice, bob);
    });

    describe("withdraw", function() {
      shouldBehaveLikeERC1620WithdrawFromStream(alice, bob, eve);
    });

    describe("withdrawFromCompoundingStream", function() {
      shouldBehaveLikeWithdrawFromCompoundingStream(alice, bob, eve);
    });

    describe("cancel", function() {
      shouldBehaveLikeERC1620CancelStream(alice, bob, eve);
    });

    describe("cancelCompoundingStream", function() {
      shouldBehaveLikeCancelCompoundingStream(alice, bob, eve);
    });
  });
}

module.exports = {
  shouldBehaveLikeSablier,
};
