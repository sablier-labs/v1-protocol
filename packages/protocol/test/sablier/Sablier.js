const { devConstants } = require("@sablier/dev-utils");
const { shouldBehaveLikeERC1620 } = require("./Sablier.behavior");

const ERC20Mock = artifacts.require("./ERC20Mock.sol");
const NotERC20Mock = artifacts.require("./NotERC20Mock.sol");
const Sablier = artifacts.require("./Sablier.sol");

ERC20Mock.numberFormat = "BigNumber";
NotERC20Mock.numberFormat = "BigNumber";
Sablier.numberFormat = "BigNumber";

const { STANDARD_DEPOSIT } = devConstants;

contract("Sablier", function sablier([_, alice, bob, carol, dave, eve]) {
  beforeEach(async function() {
    this.token = await ERC20Mock.new();
    await this.token.mint(alice, STANDARD_DEPOSIT.toString(10));

    this.notERC20Token = await NotERC20Mock.new();
    this.notERC20Token.notMint(alice, STANDARD_DEPOSIT.toString(10));

    this.sablier = await Sablier.new();
  });

  shouldBehaveLikeERC1620(alice, bob, carol, dave, eve);
});
