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

contract("Payroll", function([alice, bob, carol, eve]) {
  beforeEach(async function() {
    const opts = { from: alice };
    this.token = await ERC20Mock.new(opts);
    await this.token.mint(alice, STANDARD_SALARY.toString(10), opts);

    this.nonStandardERC20Token = await NonStandardERC20.new(opts);
    this.nonStandardERC20Token.nonStandardMint(alice, STANDARD_SALARY.toString(10), opts);

    this.sablier = await Sablier.new(opts);
    this.payroll = await Payroll.new(opts);

    await this.payroll.methods["initialize(address)"](this.sablier.address, opts);
  });

  shouldBehaveLikePayroll(alice, bob, carol, eve);
});
