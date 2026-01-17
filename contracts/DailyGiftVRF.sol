// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title DailyGiftVRF
 * @notice Distributes random ERC20 tokens using Chainlink VRF.
 * @dev Implements EIP-712 compatible signing (via simple hash checks) and VRF integration.
 */
contract DailyGiftVRF is VRFConsumerBaseV2, Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using SafeERC20 for IERC20;

    // --- Configuration ---
    VRFCoordinatorV2Interface COORDINATOR;
    IERC20 public token;
    
    // VRF Parameters
    uint64 public subscriptionId;
    bytes32 public keyHash; // Gas lane
    uint32 public callbackGasLimit = 100000;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 1;

    // Gift Parameters
    address public signer;
    uint256 public minAmount; // e.g. 0.001 USDC (1000)
    uint256 public maxAmount; // e.g. 1 USDC (1000000)
    uint256 public claimInterval;
    uint256 public constant SIGNATURE_VALIDITY = 10 minutes;

    // --- State ---
    
    // FID => last claim timestamp (time when the request was Initiated)
    mapping(uint256 => uint256) public lastClaimTime;
    
    // FID => is currently waiting for VRF?
    mapping(uint256 => bool) public hasPendingRequest;

    // RequestID => User Request Info
    struct RequestInfo {
        uint256 fid;
        address recipient;
    }
    mapping(uint256 => RequestInfo) public requests;
    
    // Track used signatures
    mapping(bytes32 => bool) public usedSignatures;

    // --- Events ---
    event ClaimInitiated(uint256 indexed requestId, uint256 indexed fid, address indexed recipient);
    event GiftRevealed(uint256 indexed requestId, uint256 indexed fid, address indexed recipient, uint256 amount);
    event GiftFailed(uint256 indexed requestId, uint256 indexed fid, string reason);
    
    event ParametersUpdated(uint256 minAmount, uint256 maxAmount, uint256 claimInterval);
    event VRFConfigUpdated(uint64 subId, bytes32 keyHash, uint32 gasLimit);
    event SignerUpdated(address newSigner);

    // --- Errors ---
    error InvalidSigner();
    error InvalidRecipient();
    error InvalidSignature();
    error SignatureExpired();
    error SignatureAlreadyUsed();
    error ClaimTooSoon(uint256 timeRemaining);
    error RequestAlreadyPending();
    error InsufficientContractBalance();
    error ZeroAddress();
    error InvalidAmountRange();

    constructor(
        address _vrfCoordinator,
        address _token,
        address _signer,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint256 _minAmount,
        uint256 _maxAmount
    ) VRFConsumerBaseV2(_vrfCoordinator) Ownable(msg.sender) {
        if (_token == address(0) || _signer == address(0)) revert ZeroAddress();
        
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        token = IERC20(_token);
        signer = _signer;
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        minAmount = _minAmount;
        maxAmount = _maxAmount;
        claimInterval = 24 hours;
    }

    /**
     * @notice Initiates a claim process.
     * @param fid The Farcaster ID of the user.
     * @param recipient The wallet receiving funds.
     * @param deadline Expiry of the backend signature.
     * @param signature Backend signature authorizing this claim.
     */
    function claim(
        uint256 fid, 
        address recipient, 
        uint256 deadline,
        bytes memory signature
    ) external nonReentrant whenNotPaused {
        if (recipient == address(0)) revert InvalidRecipient();
        if (block.timestamp > deadline) revert SignatureExpired();
        
        // Check interval
        if (block.timestamp < lastClaimTime[fid] + claimInterval) {
            revert ClaimTooSoon((lastClaimTime[fid] + claimInterval) - block.timestamp);
        }

        // Check pending
        if (hasPendingRequest[fid]) revert RequestAlreadyPending();

        // Verify Signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(fid, recipient, deadline, block.chainid, address(this))
        );
        
        if (usedSignatures[messageHash]) revert SignatureAlreadyUsed();
        
        // EIP-191 check
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        if (ethSignedHash.recover(signature) != signer) revert InvalidSignature();

        // Mark signature used
        usedSignatures[messageHash] = true;
        
        // Check contract balance (Prevent locking user request if empty)
        if (token.balanceOf(address(this)) < maxAmount) revert InsufficientContractBalance();

        // Request Random Words
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            REQUEST_CONFIRMATIONS,
            callbackGasLimit,
            NUM_WORDS
        );

        requests[requestId] = RequestInfo({
            fid: fid,
            recipient: recipient
        });
        
        hasPendingRequest[fid] = true;
        lastClaimTime[fid] = block.timestamp; // Mark claimed now to prevent spam

        emit ClaimInitiated(requestId, fid, recipient);
    }

    /**
     * @notice Callback from Chainlink VRF.
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        RequestInfo memory req = requests[requestId];
        if (req.recipient == address(0)) return; // Should not happen

        hasPendingRequest[req.fid] = false;

        // Clean up request storage to refund gas
        delete requests[requestId];

        // Calculate amount
        // Range: [min, max]
        // (random % (max - min + 1)) + min
        uint256 range = maxAmount - minAmount + 1;
        uint256 randomAmount = (randomWords[0] % range) + minAmount;

        // Transfer
        if (token.balanceOf(address(this)) >= randomAmount) {
            token.safeTransfer(req.recipient, randomAmount);
            emit GiftRevealed(requestId, req.fid, req.recipient, randomAmount);
        } else {
            // Edge case: ran out of funds during callback
            emit GiftFailed(requestId, req.fid, "Insufficient balance");
        }
    }

    // --- Admin ---

    function setGiftParams(uint256 _min, uint256 _max, uint256 _interval) external onlyOwner {
        if (_min > _max) revert InvalidAmountRange();
        minAmount = _min;
        maxAmount = _max;
        claimInterval = _interval;
        emit ParametersUpdated(_min, _max, _interval);
    }

    function setVRFParams(uint64 _subId, bytes32 _keyHash, uint32 _gas) external onlyOwner {
        subscriptionId = _subId;
        keyHash = _keyHash;
        callbackGasLimit = _gas;
        emit VRFConfigUpdated(_subId, _keyHash, _gas);
    }

    function setSigner(address _signer) external onlyOwner {
        if (_signer == address(0)) revert ZeroAddress();
        signer = _signer;
        emit SignerUpdated(_signer);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawTokens(uint256 amount) external onlyOwner {
        token.safeTransfer(owner(), amount);
    }
}
