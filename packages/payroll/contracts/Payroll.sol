pragma solidity 0.5.11;

import "@openzeppelin/contracts-ethereum-package/contracts/GSN/bouncers/GSNBouncerSignature.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/GSN/GSNRecipient.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "@sablier/protocol/contracts/Sablier.sol";
import "@sablier/protocol/contracts/Types.sol";

import "@sablier/shared-contracts/compound/Exponential.sol";
import "@sablier/shared-contracts/interfaces/ICERC20.sol";
import "@sablier/shared-contracts/lifecycle/OwnableWithoutRenounce.sol";

/**
 * @title Payroll Proxy
 * @author Sablier
 */
contract Payroll is Initializable, OwnableWithoutRenounce, Exponential, GSNRecipient, GSNBouncerSignature {
    /*** Storage Properties ***/

    /**
     * @notice Container for salary information
     * @member company The address of the company which funded this salary
     * @member isEntity bool true=object exists, otherwise false
     * @member streamId The id of the stream in the Sablier contract
     */
    struct Salary {
        address company;
        bool isEntity;
        uint256 streamId;
    }

    /**
     * @notice Counter for new salary ids.
     */
    uint256 public nextSalaryId;

    /**
     * @notice Whitelist of accounts able to call the withdrawal function for a given stream so
     *  employees don't have to pay gas.
     */
    mapping(address => mapping(uint256 => bool)) public relayers;

    /**
     * @notice An instance of Sablier, the contract responsible for creating, withdrawing from and cancelling streams.
     */
    Sablier public sablier;

    /**
     * @notice The salary objects identifiable by their unsigned integer ids.
     */
    mapping(uint256 => Salary) private salaries;

    /*** Events ***/

    /**
     * @notice Emits when a salary is successfully created.
     */
    event CreateSalary(uint256 indexed salaryId, uint256 indexed streamId, address indexed company);

    /**
     * @notice Emits when the employee withdraws a portion or all their pro rata share of the stream.
     */
    event WithdrawFromSalary(uint256 indexed salaryId, uint256 indexed streamId, address indexed company);

    /**
     * @notice Emits when a salary is successfully cancelled and both parties get their pro rata
     *  share of the available funds.
     */
    event CancelSalary(uint256 indexed salaryId, uint256 indexed streamId, address indexed company);

    /**
     * @dev Throws if the caller is not the company or the employee.
     */
    modifier onlyCompanyOrEmployee(uint256 salaryId) {
        Salary memory salary = salaries[salaryId];
        (, address employee, , , , , , ) = sablier.getStream(salary.streamId);
        require(
            _msgSender() == salary.company || _msgSender() == employee,
            "caller is not the company or the employee"
        );
        _;
    }

    /**
     * @dev Throws if the caller is not the employee or an approved relayer.
     */
    modifier onlyEmployeeOrRelayer(uint256 salaryId) {
        Salary memory salary = salaries[salaryId];
        (, address employee, , , , , , ) = sablier.getStream(salary.streamId);
        require(
            _msgSender() == employee || relayers[_msgSender()][salaryId],
            "caller is not the employee or a relayer"
        );
        _;
    }

    /**
     * @dev Throws if the id does not point to a valid salary.
     */
    modifier salaryExists(uint256 salaryId) {
        require(salaries[salaryId].isEntity, "salary does not exist");
        _;
    }

    /*** Contract Logic Starts Here ***/

    /**
     * @notice Only called once after the contract is deployed. We ask for the owner and the signer address
     *  to be specified as parameters to avoid handling `msg.sender` directly.
     * @dev The `initializer` modifier ensures that the function can only be called once.
     * @param ownerAddress The address of the contract owner.
     * @param signerAddress The address of the account able to authorise relayed transactions.
     * @param sablierAddress The address of the Sablier contract.
     */
    function initialize(address ownerAddress, address signerAddress, address sablierAddress) public initializer {
        require(ownerAddress != address(0x00), "owner is the zero address");
        require(signerAddress != address(0x00), "signer is the zero address");
        require(sablierAddress != address(0x00), "sablier contract is the zero address");
        OwnableWithoutRenounce.initialize(ownerAddress);
        GSNRecipient.initialize();
        GSNBouncerSignature.initialize(signerAddress);
        sablier = Sablier(sablierAddress);
        nextSalaryId = 1;
    }

    /*** Admin ***/

    /**
     * @notice Whitelists a relayer to process withdrawals so the employee doesn't have to pay gas.
     * @dev Throws if the caller is not the owner of the contract.
     *  Throws if the id does not point to a valid salary.
     *  Throws if the relayer is whitelisted.
     * @param relayer The address of the relayer account.
     * @param salaryId The id of the salary to whitelist the relayer for.
     */
    function whitelistRelayer(address relayer, uint256 salaryId) external onlyOwner salaryExists(salaryId) {
        require(!relayers[relayer][salaryId], "relayer is whitelisted");
        relayers[relayer][salaryId] = true;
    }

    /**
     * @notice Discard a previously whitelisted relayer to prevent them from processing withdrawals.
     * @dev Throws if the caller is not the owner of the contract.
     *  Throws if the relayer is not whitelisted.
     * @param relayer The address of the relayer account.
     * @param salaryId The id of the salary to discard the relayer for.
     */
    function discardRelayer(address relayer, uint256 salaryId) external onlyOwner {
        require(relayers[relayer][salaryId], "relayer is not whitelisted");
        relayers[relayer][salaryId] = false;
    }

    /*** View Functions ***/

    /**
     * @dev Called by {IRelayHub} to validate if this recipient accepts being charged for a relayed call. Note that the
     * recipient will be charged regardless of the execution result of the relayed call (i.e. if it reverts or not).
     *
     * The relay request was originated by `from` and will be served by `relay`. `encodedFunction` is the relayed call
     * calldata, so its first four bytes are the function selector. The relayed call will be forwarded `gasLimit` gas,
     * and the transaction executed with a gas price of at least `gasPrice`. `relay`'s fee is `transactionFee`, and the
     * recipient will be charged at most `maxPossibleCharge` (in wei). `nonce` is the sender's (`from`) nonce for
     * replay attack protection in {IRelayHub}, and `approvalData` is a optional parameter that can be used to hold
     * a signature over all or some of the previous values.
     *
     * Returns a tuple, where the first value is used to indicate approval (0) or rejection (custom non-zero error code,
     * values 1 to 10 are reserved) and the second one is data to be passed to the other {IRelayRecipient} functions.
     *
     * {acceptRelayedCall} is called with 50k gas: if it runs out during execution, the request will be considered
     * rejected. A regular revert will also trigger a rejection.
     */
    function acceptRelayedCall(
        address relay,
        address from,
        bytes calldata encodedFunction,
        uint256 transactionFee,
        uint256 gasPrice,
        uint256 gasLimit,
        uint256 nonce,
        bytes calldata approvalData,
        uint256
    ) external view returns (uint256, bytes memory) {
        /**
         * `nonce` prevents replays on RelayHub
         * `getHubAddr` prevents replays in multiple RelayHubs
         * `address(this)` prevents replays in multiple recipients
         */
        bytes memory blob = abi.encodePacked(
            relay,
            from,
            encodedFunction,
            transactionFee,
            gasPrice,
            gasLimit,
            nonce,
            getHubAddr(),
            address(this)
        );
        if (keccak256(blob).toEthSignedMessageHash().recover(approvalData) == owner()) {
            return _approveRelayedCall();
        } else {
            return _rejectRelayedCall(uint256(GSNBouncerSignatureErrorCodes.INVALID_SIGNER));
        }
    }

    /**
     * @notice Returns the salary object with all its properties.
     * @dev Throws if the id does not point to a valid salary.
     * @param salaryId The id of the salary to query.
     * @return The salary object.
     */
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
            uint256 remainingBalance,
            uint256 rate
        )
    {
        company = salaries[salaryId].company;
        (, employee, salary, tokenAddress, startTime, stopTime, remainingBalance, rate) = sablier.getStream(
            salaries[salaryId].streamId
        );
    }

    /*** Public Effects & Interactions Functions ***/

    struct CreateSalaryLocalVars {
        MathError mathErr;
    }

    /**
     * @notice Creates a new salary funded by `msg.sender` and paid towards `employee`.
     * @dev Throws if there is a math error.
     *  Throws if there is a token transfer failure.
     * @param employee The address of the employee who receives the salary.
     * @param salary The amount of tokens to be streamed.
     * @param tokenAddress The ERC20 token to use as streaming currency.
     * @param startTime The unix timestamp for when the stream starts.
     * @param stopTime The unix timestamp for when the stream stops.
     * @return The uint256 id of the newly created salary.
     */
    function createSalary(address employee, uint256 salary, address tokenAddress, uint256 startTime, uint256 stopTime)
        external
        returns (uint256 salaryId)
    {
        /* Transfer the tokens to this contract. */
        require(IERC20(tokenAddress).transferFrom(_msgSender(), address(this), salary), "token transfer failure");

        /* Approve the Sablier contract to spend from our tokens. */
        require(IERC20(tokenAddress).approve(address(sablier), salary), "token approval failure");

        /* Create the stream. */
        uint256 streamId = sablier.createStream(employee, salary, tokenAddress, startTime, stopTime);
        salaryId = nextSalaryId;
        salaries[nextSalaryId] = Salary({ company: _msgSender(), isEntity: true, streamId: streamId });

        /* Increment the next salary id. */
        CreateSalaryLocalVars memory vars;
        (vars.mathErr, nextSalaryId) = addUInt(nextSalaryId, uint256(1));
        require(vars.mathErr == MathError.NO_ERROR, "next stream id calculation error");

        emit CreateSalary(salaryId, streamId, _msgSender());
    }

    /**
     * @notice Creates a new compounding salary funded by `msg.sender` and paid towards `employee`.
     * @dev There's a bit of redundancy between `createSalary` and this function, but one has to
     *  call `sablier.createStream` and the other `sablier.createCompoundingStream`, so it's not
     *  worth it to run DRY code.
     *  Throws if there is a math error.
     *  Throws if there is a token transfer failure.
     * @param employee The address of the employee who receives the salary.
     * @param salary The amount of tokens to be streamed.
     * @param tokenAddress The ERC20 token to use as streaming currency.
     * @param startTime The unix timestamp for when the stream starts.
     * @param stopTime The unix timestamp for when the stream stops.
     * @param senderSharePercentage The sender's share of the interest, as a percentage.
     * @param recipientSharePercentage The sender's share of the interest, as a percentage.
     * @return The uint256 id of the newly created compounding salary.
     */
    function createCompoundingSalary(
        address employee,
        uint256 salary,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        uint256 senderSharePercentage,
        uint256 recipientSharePercentage
    ) external returns (uint256 salaryId) {
        /* Transfer the tokens to this contract. */
        require(IERC20(tokenAddress).transferFrom(_msgSender(), address(this), salary), "token transfer failure");

        /* Approve the Sablier contract to spend from our tokens. */
        require(IERC20(tokenAddress).approve(address(sablier), salary), "token approval failure");

        /* Create the stream. */
        uint256 streamId = sablier.createCompoundingStream(
            employee,
            salary,
            tokenAddress,
            startTime,
            stopTime,
            senderSharePercentage,
            recipientSharePercentage
        );
        salaryId = nextSalaryId;
        salaries[nextSalaryId] = Salary({ company: _msgSender(), isEntity: true, streamId: streamId });

        /* Increment the next salary id. */
        CreateSalaryLocalVars memory vars;
        (vars.mathErr, nextSalaryId) = addUInt(nextSalaryId, uint256(1));
        require(vars.mathErr == MathError.NO_ERROR, "next stream id calculation error");

        /* We don't emit a different event for compounding salaries because we emit CreateCompoundingStream. */
        emit CreateSalary(salaryId, streamId, _msgSender());
    }

    struct CancelSalaryLocalVars {
        MathError mathErr;
        uint256 netCompanyBalance;
    }

    /**
     * @notice Withdraws from the contract to the employee's account.
     * @dev Throws if the id does not point to a valid salary.
     *  Throws if the caller is not the employee or a relayer.
     *  Throws if there is a token transfer failure.
     * @param salaryId The id of the salary to withdraw from.
     * @param amount The amount of tokens to withdraw.
     * @return bool true=success, false otherwise.
     */
    function withdrawFromSalary(uint256 salaryId, uint256 amount)
        external
        salaryExists(salaryId)
        onlyEmployeeOrRelayer(salaryId)
        returns (bool success)
    {
        Salary memory salary = salaries[salaryId];
        success = sablier.withdrawFromStream(salary.streamId, amount);
        emit WithdrawFromSalary(salaryId, salary.streamId, salary.company);
    }

    /**
     * @notice Cancels the salary and transfers the tokens back on a pro rata basis.
     * @dev Throws if the id does not point to a valid salary.
     *  Throws if the caller is not the company or the employee.
     *  Throws if there is a token transfer failure.
     * @param salaryId The id of the salary to cancel.
     * @return bool true=success, false otherwise.
     */
    function cancelSalary(uint256 salaryId)
        external
        salaryExists(salaryId)
        onlyCompanyOrEmployee(salaryId)
        returns (bool success)
    {
        Salary memory salary = salaries[salaryId];

        /* We avoid storing extraneous data twice, so we read the token address from Sablier. */
        (, address employee, , address tokenAddress, , , , ) = sablier.getStream(salary.streamId);
        uint256 companyBalance = sablier.balanceOf(salary.streamId, address(this));

        /**
         * The company gets all the money that has not been streamed yet, plus all the interest earned by what's left.
         * Not all streams are compounding and `companyBalance` coincides with `netCompanyBalance` then.
         */
        CancelSalaryLocalVars memory vars;
        if (!sablier.isCompoundingStream(salary.streamId)) {
            vars.netCompanyBalance = companyBalance;
        } else {
            uint256 employeeBalance = sablier.balanceOf(salary.streamId, employee);
            (uint256 companyInterest, , ) = sablier.interestOf(salary.streamId, employeeBalance);
            (vars.mathErr, vars.netCompanyBalance) = addUInt(companyBalance, companyInterest);
            require(vars.mathErr == MathError.NO_ERROR, "net company balance calculation error");
        }

        /* Delete the salary object to save gas. */
        delete salaries[salaryId];
        success = sablier.cancelStream(salary.streamId);

        /* Transfer the tokens to the company. */
        if (vars.netCompanyBalance > 0)
            require(
                IERC20(tokenAddress).transfer(salary.company, vars.netCompanyBalance),
                "company token transfer failure"
            );

        emit CancelSalary(salaryId, salary.streamId, salary.company);
    }
}
