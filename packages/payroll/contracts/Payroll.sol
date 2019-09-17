pragma solidity 0.5.10;

import "@openzeppelin/contracts-ethereum-package/contracts/GSN/bouncers/GSNBouncerSignature.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/GSN/GSNRecipient.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "@sablier/protocol/contracts/interfaces/IERC1620.sol";
import "@sablier/protocol/contracts/Types.sol";

import "@sablier/shared-contracts/compound/Exponential.sol";
import "@sablier/shared-contracts/interfaces/ICERC20.sol";

/// @title Payroll dapp contract
/// @author Paul Razvan Berg - <paul@sablier.app>

contract Payroll is Initializable, Ownable, GSNRecipient, GSNBouncerSignature {
    using SafeMath for uint256;

    struct Salary {
        address company;
        bool isCompounding;
        bool isEntity;
        uint256 streamId;
    }
    struct Token {
        uint256 listPointer;
        address cTokenAddress;
    }

    uint256 public earnings;
    uint256 public nextSalaryId;
    mapping(address => mapping(uint256 => bool)) public relayers;
    IERC1620 public sablier;
    mapping(uint256 => Salary) salaries;
    address[] public tokenList;
    mapping(address => Token) public tokenStructs;

    event CreateSalary(uint256 indexed salaryId, uint256 indexed streamId, bool isCompounding);
    event CancelSalary(uint256 indexed salaryId);
    event DiscardToken(address indexed tokenAddress);
    event WhitelistToken(address indexed tokenAddress, address cTokenAddress);
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
        nextSalaryId = 1;
    }

    /* Admin */

    function whitelistRelayer(address relayer, uint256 salaryId) external onlyOwner salaryExists(salaryId) {
        require(relayers[relayer][salaryId] == false, "relayer is whitelisted");
        relayers[relayer][salaryId] = true;
    }

    function discardRelayer(address relayer, uint256 salaryId) external onlyOwner salaryExists(salaryId) {
        require(relayers[relayer][salaryId] == true, "relayer is not whitelisted");
        relayers[relayer][salaryId] = false;
    }

    function whitelistToken(address tokenAddress, address cTokenAddress) external onlyOwner {
        require(!isWhitelistedToken(tokenAddress), "token is whitelisted");
        tokenStructs[cTokenAddress].cTokenAddress = cTokenAddress;
        tokenStructs[cTokenAddress].listPointer = tokenList.push(cTokenAddress).sub(1);
        emit WhitelistToken(tokenAddress, cTokenAddress);
    }

    function discardToken(address tokenAddress) external onlyOwner {
        require(isWhitelistedToken(tokenAddress), "token is not whitelisted");
        uint256 rowToDelete = tokenStructs[tokenAddress].listPointer;
        address keyToMove = tokenList[tokenList.length.sub(1)];
        tokenList[rowToDelete] = keyToMove;
        tokenStructs[keyToMove].listPointer = rowToDelete;
        tokenList.length = tokenList.length.sub(1);
        emit DiscardToken(tokenAddress);
    }

    /* View */

    function acceptRelayedCall(
        address relay,
        address from,
        bytes calldata encodedFunction,
        uint256 transactionFee,
        uint256 gasPrice,
        uint256 gasLimit,
        uint256 _nextSalaryId,
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
            _nextSalaryId, // Prevents replays on RelayHub
            getHubAddr(), // Prevents replays in multiple RelayHubs
            address(this) // Prevents replays in multiple recipients
        );
        if (keccak256(blob).toEthSignedMessageHash().recover(approvalData) == owner()) {
            return _approveRelayedCall();
        } else {
            return _rejectRelayedCall(uint256(GSNBouncerSignatureErrorCodes.INVALID_SIGNER));
        }
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
            bool isCompounding
        )
    {
        company = salaries[salaryId].company;
        (, employee, salary, tokenAddress, startTime, stopTime, balance, rate) = sablier.getStream(
            salaries[salaryId].streamId
        );
        isCompounding = salaries[salaryId].isCompounding;
    }

    function isWhitelistedToken(address tokenAddress) public view returns (bool isIndeed) {
        if (tokenList.length == 0) return false;
        return (tokenList[tokenStructs[tokenAddress].listPointer] == tokenAddress);
    }

    /* Public */

    function createSalary(
        address employee,
        uint256 salary,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        bool isCompounding
    ) external returns (uint256 salaryId) {
        require(IERC20(tokenAddress).transferFrom(_msgSender(), address(this), salary), "token transfer failure");
        if (!isCompounding) {
            salaryId = createSalaryInternal(employee, salary, tokenAddress, startTime, stopTime);
        } else {
            salaryId = createCompoundingSalaryInternal(employee, salary, tokenAddress, startTime, stopTime);
        }
    }

    function cancelSalary(uint256 salaryId) external salaryExists(salaryId) onlyCompanyOrEmployee(salaryId) {
        Salary memory salary = salaries[salaryId];
        (, , , address tokenAddress, , , , ) = sablier.getStream(salary.streamId);
        uint256 companyBalance = sablier.balanceOf(salary.streamId, address(this));

        deleteSalary(salaryId);
        emit CancelSalary(salaryId);
        sablier.cancelStream(salary.streamId);

        if (companyBalance > 0)
            require(IERC20(tokenAddress).transfer(salary.company, companyBalance), "company token transfer failure");
    }

    function deleteSalary(uint256 salaryId) public salaryExists(salaryId) onlyCompanyOrEmployee(salaryId) {
        salaries[salaryId].company = address(0x00);
        salaries[salaryId].isCompounding = false;
        salaries[salaryId].isEntity = false;
        salaries[salaryId].streamId = 0;
    }

    function withdrawFromSalary(uint256 salaryId, uint256 amount)
        external
        salaryExists(salaryId)
        onlyEmployeeOrRelayer(salaryId)
    {
        Salary memory salary = salaries[salaryId];
        sablier.withdrawFromStream(salary.streamId, amount);
        emit WithdrawFromSalary(salaryId, amount);
    }

    /* Internal */

    function createSalaryInternal(
        address employee,
        uint256 salary,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
    ) internal returns (uint256 salaryId) {
        require(IERC20(tokenAddress).approve(address(sablier), salary), "token approval failure");
        uint256 streamId = sablier.createStream(employee, salary, tokenAddress, startTime, stopTime);
        salaryId = nextSalaryId;
        salaries[nextSalaryId] = Salary({
            company: _msgSender(),
            isCompounding: false,
            isEntity: true,
            streamId: streamId
        });

        emit CreateSalary(nextSalaryId, streamId, false);
        nextSalaryId = nextSalaryId.add(1);
    }

    function createCompoundingSalaryInternal(
        address employee,
        uint256 salary,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
    ) internal returns (uint256 salaryId) {
        require(isWhitelistedToken(tokenAddress), "token not whitelisted");
        address cTokenAddress = tokenStructs[tokenAddress].cTokenAddress;
        ICERC20 cToken = ICERC20(cTokenAddress);
        uint256 preMintCTokenBalance = cToken.balanceOf(address(this));
        require(IERC20(tokenAddress).approve(cTokenAddress, salary), "token approval failure");
        require(cToken.mint(salary) == 0, "token minting failure");
        uint256 postMintCTokenBalance = cToken.balanceOf(address(this));
        uint256 mintAmount = postMintCTokenBalance.sub(preMintCTokenBalance);

        require(cToken.approve(address(sablier), mintAmount), "token approval failure");
        uint256 senderShare = 100;
        uint256 recipientShare = 0;
        uint256 streamId = sablier.createCompoundingStream(
            employee,
            mintAmount,
            tokenAddress,
            startTime,
            stopTime,
            senderShare,
            recipientShare
        );
        salaryId = nextSalaryId;
        salaries[nextSalaryId] = Salary({
            company: _msgSender(),
            isCompounding: true,
            isEntity: true,
            streamId: streamId
        });

        emit CreateSalary(nextSalaryId, streamId, true);
        nextSalaryId = nextSalaryId.add(1);
    }
}
