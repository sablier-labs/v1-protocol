const { devConstants } = require("@sablier/dev-utils");
const { shouldBehaveLikePayroll } = require("./Payroll.behavior");

const ERC20Mock = artifacts.require("./ERC20Mock.sol");
const NotERC20Mock = artifacts.require("./NotERC20Mock.sol");
const Payroll = artifacts.require("./Payroll.sol");
const Sablier = artifacts.require("./Sablier.sol");

ERC20Mock.numberFormat = "BigNumber";
NotERC20Mock.numberFormat = "BigNumber";
Sablier.numberFormat = "BigNumber";
Payroll.numberFormat = "BigNumber";

const { STANDARD_SALARY } = devConstants;

contract("Payroll", function([_, alice, bob, carol, eve]) {
  beforeEach(async function() {
    this.token = await ERC20Mock.new();
    await this.token.mint(alice, STANDARD_SALARY.toString(10));

    this.notERC20Token = await NotERC20Mock.new();
    this.notERC20Token.notMint(alice, STANDARD_SALARY.toString(10));

    this.sablier = await Sablier.new();
    this.payroll = await Payroll.new();
    await this.payroll.initialize(alice, this.sablier.address);
  });

  shouldBehaveLikePayroll(alice, bob, carol, eve);
});
