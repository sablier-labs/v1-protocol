const { devConstants } = require("@sablier/dev-utils");
const shouldBehaveLikeSablier = require("./Sablier.behavior");

const ERC20Mock = artifacts.require("./ERC20Mock.sol");
const NonStandardERC20 = artifacts.require("./NonStandardERC20.sol");
const Sablier = artifacts.require("./Sablier.sol");

ERC20Mock.numberFormat = "BigNumber";
NonStandardERC20.numberFormat = "BigNumber";
Sablier.numberFormat = "BigNumber";

const { STANDARD_SALARY } = devConstants;

contract("Sablier", function sablier([alice, bob, carol, eve]) {
  beforeEach(async function() {
    const opts = { from: alice };
    this.token = await ERC20Mock.new(opts);
    await this.token.mint(alice, STANDARD_SALARY.multipliedBy(3).toString(10), opts);

    this.nonStandardERC20Token = await NonStandardERC20.new(opts);
    this.nonStandardERC20Token.mint(alice, STANDARD_SALARY.toString(10), opts);

    this.sablier = await Sablier.new(opts);
  });

  shouldBehaveLikeSablier(alice, bob, carol, eve);
});
