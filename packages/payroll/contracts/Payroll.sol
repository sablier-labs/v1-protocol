pragma solidity 0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/upgrades/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@sablier/protocol/contracts/interfaces/IERC1620.sol";
import "@sablier/protocol/contracts/Types.sol";

import "./interfaces/ICERC20.sol";

/// @title Payroll dapp contracts
/// @author Paul Berg - <paul@sablier.app>

contract Payroll is Initializable, OpenZeppelinUpgradesOwnable {
    using SafeMath for uint256;

    uint256 public constant MAX_ALLOWANCE = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    struct cToken {
        uint256 listPointer;
        address underlyingAddress;
    }
    struct Salary {
        address company;
        bool isAccruing;
        bool isEntity;
        uint256 streamId;
    }

    address[] public cTokenList;
    mapping(address => cToken) public cTokenStructs;
    uint256 public fee;
    uint256 public nonce;
    mapping(address => mapping(uint256 => bool)) relayers;
    IERC1620 public sablier;
    mapping(uint256 => Salary) salaries;

    event AddSalary(uint256 indexed salaryId, uint256 indexed streamId, bool isAccruing);
    event CancelSalary(uint256 indexed salaryId);
    event DiscardCToken(address indexed cTokenAddress);
    event WhitelistCToken(address indexed cTokenAddress, address underlyingAddress);

    modifier onlyCompanyOrEmployee(uint256 salaryId) {
        Salary memory salary = salaries[salaryId];
        (address company, address employee, , , , , , ) = sablier.getStream(salary.streamId);
        require(msg.sender == company || msg.sender == employee, "caller is not the company or the employee");
        _;
    }

    modifier onlyEmployeeOrRelayer(uint256 salaryId) {
        Salary memory salary = salaries[salaryId];
        (, address employee, , , , , , ) = sablier.getStream(salary.streamId);
        require(msg.sender == employee || relayers[msg.sender][salaryId], "caller is not the employee or a relayer");
        _;
    }

    modifier salaryExists(uint256 salaryId) {
        require(salaries[salaryId].isEntity, "salary does not exist");
        _;
    }

    // modifier salaryStreamed(uint256 salaryId) {
    //     Salary memory salary = salaries[salaryId];
    //     (, , , address token, uint256 startTime, uint256 stopTime , , ) = sablier.getStream(salary.streamId);
    //     require(stopTime < block.timestamp, "salary not streamed");
    //     _;
    // }

    function initialize(IERC1620 _sablier) public initializer {
        sablier = _sablier;
        nonce = 1;
    }

    function getSalary(uint256 salaryId)
        public
        view
        salaryExists(salaryId)
        returns (
            address company,
            address employee,
            uint256 deposit,
            address tokenAddress,
            uint256 startTime,
            uint256 stopTime,
            uint256 balance,
            uint256 rate,
            bool isAccruing
        )
    {
        company = salaries[salaryId].company;
        (, employee, deposit, tokenAddress, startTime, stopTime, balance, rate) = sablier.getStream(
            salaries[salaryId].streamId
        );
        isAccruing = salaries[salaryId].isAccruing;
    }

    function addRelayer(address relayer, uint256 salaryId) public onlyOwner salaryExists(salaryId) {
        relayers[relayer][salaryId] = true;
    }

    function addSalary(
        address employee,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        bool isAccruing
    ) public returns (uint256 salaryId) {
        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(msg.sender, address(this), deposit), "token transfer failure");

        uint256 streamId = sablier.create(employee, deposit, tokenAddress, startTime, stopTime);
        salaryId = nonce;
        salaries[nonce] = Salary({ company: msg.sender, isAccruing: isAccruing, isEntity: true, streamId: streamId });

        emit AddSalary(nonce, streamId, isAccruing);
        nonce = nonce.add(1);
    }

    function cancelSalary(uint256 salaryId) public
    salaryExists(salaryId)
    onlyCompanyOrEmployee(salaryId)
    {
        Salary memory salary = salaries[salaryId];
        (, , , address tokenAddress, , , , ) = sablier.getStream(salary.streamId);
        uint256 companyBalance = sablier.balanceOf(salary.streamId, address(this));

        emit CancelSalary(salaryId);
        deleteSalary(salaryId);
        sablier.cancel(salary.streamId);

        IERC20 token = IERC20(tokenAddress);
        if (companyBalance > 0)
            require(token.transfer(salary.company, companyBalance), "company token transfer failure");
    }

    function deleteSalary(uint256 salaryId) public
    salaryExists(salaryId)
    onlyCompanyOrEmployee(salaryId)
    {
        salaries[salaryId].company = address(0x00);
        salaries[salaryId].isAccruing = false;
        salaries[salaryId].isEntity = false;
        salaries[salaryId].streamId = 0;
    }

    function discardCToken(address cTokenAddress) public onlyOwner {
        require(isCToken(cTokenAddress), "ctoken does not exist");
        uint256 rowToDelete = cTokenStructs[cTokenAddress].listPointer;
        address keyToMove = cTokenList[cTokenList.length.sub(1)];
        cTokenList[rowToDelete] = keyToMove;
        cTokenStructs[keyToMove].listPointer = rowToDelete;
        cTokenList.length = cTokenList.length.sub(1);
        emit DiscardCToken(cTokenAddress);
    }

    function isCToken(address tokenAddress) public view returns (bool isIndeed) {
        if (cTokenList.length == 0) return false;
        return (cTokenList[cTokenStructs[tokenAddress].listPointer] == tokenAddress);
    }

    function removeRelayer(address relayer, uint256 salaryId) public onlyOwner {
        relayers[relayer][salaryId] = false;
    }

    function resetAllowance(address underlyingAddress, address cTokenAddress) public onlyOwner {
        // underlying to sablier
        IERC20 underlyingContract = IERC20(underlyingAddress);
        require(underlyingContract.approve(address(sablier), MAX_ALLOWANCE), "underlying to sablier approval failure");

        // ctoken to sablier
        IERC20 cTokenContract = IERC20(cTokenAddress);
        require(cTokenContract.approve(address(sablier), MAX_ALLOWANCE), "ctoken to sablier approval failure");

        // underling to ctoken
        require(underlyingContract.approve(cTokenAddress, MAX_ALLOWANCE), "underlying to ctoken approval failure");
    }

    function resetAllowances() public onlyOwner {
        uint256 length = cTokenList.length;
        for (uint256 i = 0; i < length; i = i.add(1)) {
            resetAllowance(cTokenStructs[cTokenList[i]].underlyingAddress, cTokenList[i]);
        }
    }

    function whitelistCToken(address cTokenAddress, address underlyingAddress) public onlyOwner {
        require(!isCToken(cTokenAddress), "ctoken already exists");
        cTokenStructs[cTokenAddress].underlyingAddress = underlyingAddress;
        cTokenStructs[cTokenAddress].listPointer = cTokenList.push(cTokenAddress).sub(1);
        resetAllowance(underlyingAddress, cTokenAddress);
        emit WhitelistCToken(cTokenAddress, underlyingAddress);
    }

    function withdrawFromSalary(uint256 salaryId, uint256 amount)
        public
        salaryExists(salaryId)
        onlyEmployeeOrRelayer(salaryId)
    {
        Salary memory salary = salaries[salaryId];
        sablier.withdraw(salary.streamId, amount);
    }
}
