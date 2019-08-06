const shouldBehaveLikeERC1620Create = require("./behaviors/Create.behavior");
const shouldBehaveLikeERC1620Withdraw = require("./behaviors/Withdraw.behavior");
const shouldBehaveLikeERC1620Cancel = require("./behaviors/Cancel.behavior");

function shouldBehaveLikeERC1620(alice, bob, _carol, _dave, eve) {
  let snapshot;
  let snapshotId;

  beforeEach(async () => {
    snapshot = await web3.utils.takeSnapshot();
    snapshotId = snapshot.result;
  });

  afterEach(async () => {
    await web3.utils.revertToSnapshot(snapshotId);
  });

  describe("create", function() {
    shouldBehaveLikeERC1620Create(alice, bob);
  });

  describe("withdraw", function() {
    shouldBehaveLikeERC1620Withdraw(alice, bob, eve);
  });

  describe("cancel", function() {
    shouldBehaveLikeERC1620Cancel(alice, bob, eve);
  });
}

module.exports = {
  shouldBehaveLikeERC1620,
  shouldBehaveLikeERC1620Create,
  shouldBehaveLikeERC1620Withdraw,
  shouldBehaveLikeERC1620Cancel,
};
