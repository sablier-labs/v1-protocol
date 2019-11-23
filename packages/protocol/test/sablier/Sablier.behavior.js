const { devConstants } = require("@sablier/dev-utils");
const truffleAssert = require("truffle-assertions");

const shouldBehaveLikeUpdateFee = require("./admin/UpdateFee");
const shouldBehaveLikeTakeEarnings = require("./admin/TakeEarnings");

const shouldBehaveLikeDeltaOf = require("./view/DeltaOf");
const shouldBehaveLikeBalanceOf = require("./view/BalanceOf");
const shouldBehaveLikeGetStream = require("./view/GetStream");
const shouldBehaveLikeGetCompoundingStream = require("./view/GetCompoundingStream");
const shouldBehaveLikeInterestOf = require("./view/InterestOf");
const shouldBehaveLikeGetEarnings = require("./view/GetEarnings");
const shouldBehaveLikeIsCompoundingStream = require("./view/IsCompoundingStream");

const shouldBehaveLikeERC1620CreateStream = require("./effects/stream/CreateStream");
const shouldBehaveLikeCreateCompoundingStream = require("./effects/compoundingStream/CreateCompoundingStream");
const shouldBehaveLikeERC1620WithdrawFromStream = require("./effects/stream/WithdrawFromStream");
// eslint-disable-next-line max-len
const shouldBehaveLikeWithdrawFromCompoundingStream = require("./effects/compoundingStream/WithdrawFromCompoundingStream");
const shouldBehaveLikeERC1620CancelStream = require("./effects/stream/CancelStream");
const shouldBehaveLikeCancelCompoundingStream = require("./effects/compoundingStream/CancelCompoundingStream");

const Sablier = artifacts.require("./Sablier.sol");
const { ZERO_ADDRESS } = devConstants;

function shouldBehaveLikeSablier(alice, bob, carol, eve) {
  describe("initialization", function() {
    it("reverts when the cTokenManager contract is the zero address", async function() {
      const opts = { from: alice };
      await truffleAssert.reverts(Sablier.new(ZERO_ADDRESS, opts), "cTokenManager contract is the zero address");
    });
  });

  describe("admin functions", function() {
    describe("updateFee", function() {
      shouldBehaveLikeUpdateFee(alice, eve);
    });

    describe("takeEarnings", function() {
      shouldBehaveLikeTakeEarnings(alice, bob, eve);
    });
  });

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

    describe("isCompoundingStream", function() {
      shouldBehaveLikeIsCompoundingStream(alice, bob);
    });

    describe("getCompoundingStream", function() {
      shouldBehaveLikeGetCompoundingStream(alice, bob);
    });

    describe("interestOf", function() {
      shouldBehaveLikeInterestOf(alice, bob);
    });

    describe("getEarnings", function() {
      shouldBehaveLikeGetEarnings(alice);
    });
  });

  describe("effects & interactions functions", function() {
    describe("createStream", function() {
      shouldBehaveLikeERC1620CreateStream(alice, bob);
    });

    describe("createCompoundingStream", function() {
      shouldBehaveLikeCreateCompoundingStream(alice, bob);
    });

    describe("withdrawFromStream", function() {
      shouldBehaveLikeERC1620WithdrawFromStream(alice, bob, eve);
    });

    describe("withdrawFromCompoundingStream", function() {
      shouldBehaveLikeWithdrawFromCompoundingStream(alice, bob, eve);
    });

    describe("cancelStream", function() {
      shouldBehaveLikeERC1620CancelStream(alice, bob, eve);
    });

    describe("cancelCompoundingStream", function() {
      shouldBehaveLikeCancelCompoundingStream(alice, bob, eve);
    });
  });
}

module.exports = shouldBehaveLikeSablier;
