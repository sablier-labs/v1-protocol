const { devConstants } = require("@sablier/dev-utils");
const { shouldBehaveLikePayroll } = require("./Payroll.behavior");

const ERC20Mock = artifacts.require("./ERC20Mock.sol");
const NonStandardERC20 = artifacts.require("./NonStandardERC20.sol");
const Payroll = artifacts.require("./Payroll.sol");
const Sablier = artifacts.require("./Sablier.sol");

ERC20Mock.numberFormat = "BigNumber";
NonStandardERC20.numberFormat = "BigNumber";
Payroll.numberFormat = "BigNumber";
Sablier.numberFormat = "BigNumber";

const { STANDARD_SALARY } = devConstants;

contract("Payroll", function([_, alice, bob, carol, eve]) {
  beforeEach(async function() {
    this.token = await ERC20Mock.new();
    await this.token.mint(alice, STANDARD_SALARY.toString(10));

    this.nonStandardERC20Token = await NonStandardERC20.new();
    this.nonStandardERC20Token.nonStandardMint(alice, STANDARD_SALARY.toString(10));

    this.sablier = await Sablier.new();
    this.payroll = await Payroll.new();
    await this.payroll.initialize(alice, this.sablier.address);
  });

  shouldBehaveLikePayroll(alice, bob, carol, eve);
});
