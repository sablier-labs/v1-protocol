pragma solidity 0.5.10;

import "@openzeppelin/contracts-ethereum-package/contracts/GSN/bouncers/GSNBouncerSignature.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/GSN/GSNRecipient.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "@sablier/protocol/contracts/interfaces/IERC1620.sol";
import "@sablier/protocol/contracts/Types.sol";

/// @title Payroll dapp contracts
/// @author Paul Razvan Berg - <paul@sablier.app>

contract Payroll is Initializable, Ownable, GSNRecipient, GSNBouncerSignature {
    using SafeMath for uint256;

    struct Salary {
        address company;
        bool isAccruing;
        bool isEntity;
        uint256 streamId;
    }

    uint256 public constant MAX_ALLOWANCE = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    uint256 public fee;
    uint256 public nonce;
    mapping(address => mapping(uint256 => bool)) public relayers;
    IERC1620 public sablier;
    mapping(uint256 => Salary) salaries;

    event AddSalary(uint256 indexed salaryId, uint256 indexed streamId, bool isAccruing);
    event CancelSalary(uint256 indexed salaryId);
    event DiscardCToken(address indexed cTokenAddress);
    event WhitelistCToken(address indexed cTokenAddress, address underlyingAddress);
    event WithdrawFromSalary(uint256 indexed salaryId, uint256 amount);

    modifier onlyCompanyOrEmployee(uint256 salaryId) {
        Salary memory salary = salaries[salaryId];
        (, address employee, , , , , , ) = sablier.getStream(salary.streamId);
        require(
            _msgSender() == salary.company || _msgSender() == employee,
            "caller is not the company or the employee"
        );
        _;
    }

    modifier onlyEmployeeOrRelayer(uint256 salaryId) {
        Salary memory salary = salaries[salaryId];
        (, address employee, , , , , , ) = sablier.getStream(salary.streamId);
        require(
            _msgSender() == employee || relayers[_msgSender()][salaryId],
            "caller is not the employee or a relayer"
        );
        _;
    }

    modifier salaryExists(uint256 salaryId) {
        require(salaries[salaryId].isEntity, "salary does not exist");
        _;
    }

    function initialize(address _owner, IERC1620 _sablier) public initializer {
        Ownable.initialize(_owner);
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
            uint256 salary,
            address tokenAddress,
            uint256 startTime,
            uint256 stopTime,
            uint256 balance,
            uint256 rate,
            bool isAccruing
        )
    {
        company = salaries[salaryId].company;
        (, employee, salary, tokenAddress, startTime, stopTime, balance, rate) = sablier.getStream(
            salaries[salaryId].streamId
        );
        isAccruing = salaries[salaryId].isAccruing;
    }

    function resetSablierAllowance(address tokenAddress) public onlyOwner {
        IERC20 tokenContract = IERC20(tokenAddress);
        require(tokenContract.approve(address(sablier), MAX_ALLOWANCE), "token approval failure");
    }

    function addSalary(
        address employee,
        uint256 salary,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        bool isAccruing
    ) public returns (uint256 salaryId) {
        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(_msgSender(), address(this), salary), "token transfer failure");

        uint256 streamId = sablier.create(employee, salary, tokenAddress, startTime, stopTime);
        salaryId = nonce;
        salaries[nonce] = Salary({ company: _msgSender(), isAccruing: isAccruing, isEntity: true, streamId: streamId });

        emit AddSalary(nonce, streamId, isAccruing);
        nonce = nonce.add(1);
    }

    function cancelSalary(uint256 salaryId) public salaryExists(salaryId) onlyCompanyOrEmployee(salaryId) {
        Salary memory salary = salaries[salaryId];
        (, , , address tokenAddress, , , , ) = sablier.getStream(salary.streamId);
        uint256 companyBalance = sablier.balanceOf(salary.streamId, address(this));

        deleteSalary(salaryId);
        emit CancelSalary(salaryId);
        sablier.cancel(salary.streamId);

        if (companyBalance > 0)
            require(IERC20(tokenAddress).transfer(salary.company, companyBalance), "company token transfer failure");
    }

    function deleteSalary(uint256 salaryId) public salaryExists(salaryId) onlyCompanyOrEmployee(salaryId) {
        salaries[salaryId].company = address(0x00);
        salaries[salaryId].isAccruing = false;
        salaries[salaryId].isEntity = false;
        salaries[salaryId].streamId = 0;
    }

    function withdrawFromSalary(uint256 salaryId, uint256 amount)
        public
        salaryExists(salaryId)
        onlyEmployeeOrRelayer(salaryId)
    {
        Salary memory salary = salaries[salaryId];
        sablier.withdraw(salary.streamId, amount);
        emit WithdrawFromSalary(salaryId, amount);
    }

    /* Sablier Relayer Network */

    function addRelayer(address relayer, uint256 salaryId) public onlyOwner salaryExists(salaryId) {
        require(relayers[relayer][salaryId] == false, "relayer exists");
        relayers[relayer][salaryId] = true;
    }

    function removeRelayer(address relayer, uint256 salaryId) public onlyOwner salaryExists(salaryId) {
        require(relayers[relayer][salaryId] == true, "relayer does not exist");
        relayers[relayer][salaryId] = false;
    }

    /* Gas Station Network */

    function acceptRelayedCall(
        address relay,
        address from,
        bytes calldata encodedFunction,
        uint256 transactionFee,
        uint256 gasPrice,
        uint256 gasLimit,
        uint256 _nonce,
        bytes calldata approvalData,
        uint256
    ) external view returns (uint256, bytes memory) {
        bytes memory blob = abi.encodePacked(
            relay,
            from,
            encodedFunction,
            transactionFee,
            gasPrice,
            gasLimit,
            _nonce, // Prevents replays on RelayHub
            getHubAddr(), // Prevents replays in multiple RelayHubs
            address(this) // Prevents replays in multiple recipients
        );
        if (keccak256(blob).toEthSignedMessageHash().recover(approvalData) == owner()) {
            return _approveRelayedCall();
        } else {
            return _rejectRelayedCall(uint256(GSNBouncerSignatureErrorCodes.INVALID_SIGNER));
        }
    }
}
