const { devConstants } = require("@sablier/dev-utils");
const { shouldBehaveLikeERC1620 } = require("./Sablier.behavior");

const ERC20Mock = artifacts.require("./ERC20Mock.sol");
const NonStandardERC20Mock = artifacts.require("./NonStandardERC20Mock.sol");
const Sablier = artifacts.require("./Sablier.sol");

ERC20Mock.numberFormat = "BigNumber";
NonStandardERC20Mock.numberFormat = "BigNumber";
Sablier.numberFormat = "BigNumber";

const { STANDARD_SALARY } = devConstants;

contract("Sablier", function sablier([_, alice, bob, carol, eve]) {
  beforeEach(async function() {
    this.token = await ERC20Mock.new();
    await this.token.mint(alice, STANDARD_SALARY.toString(10));

    this.nonStandardERC20Token = await NonStandardERC20Mock.new();
    this.nonStandardERC20Token.nonStandardMint(alice, STANDARD_SALARY.toString(10));

    this.sablier = await Sablier.new();
  });

  shouldBehaveLikeERC1620(alice, bob, carol, eve);
});
