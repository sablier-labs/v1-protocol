const helper = require("ganache-time-traveler");

function shouldBehaveLikePayroll() {
  let snapshotId;

  beforeEach(async () => {
    const snapshot = await helper.takeSnapshot();
    snapshotId = snapshot.result;
  });

  afterEach(async () => {
    await helper.revertToSnapShot(snapshotId);
  });
}

module.exports = {
  shouldBehaveLikePayroll,
};
