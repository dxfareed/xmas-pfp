// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
// VRF V2.5 Imports
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title DailyGiftVRF
 * @notice Distributes random ERC20 tokens using Chainlink VRF V2.5.
 */
contract DailyGiftVRF is VRFConsumerBaseV2Plus, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using SafeERC20 for IERC20;

    // --- Configuration ---
    IERC20 public token;
    
    // VRF Parameters
    uint256 public subscriptionId; // V2.5 uses uint256
    bytes32 public keyHash; // Gas lane
    uint32 public callbackGasLimit = 100000;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 1;

    // Gift Parameters
    address public signer;
    uint256 public minAmount;
    uint256 public maxAmount;
    uint256 public constant ENTRY_FEE = 0.0001 ether;
    // Signature validity window (e.g. 10 mins)
    uint256 public constant SIGNATURE_VALIDITY = 10 minutes;

    // --- State ---
    mapping(uint256 => bool) public hasPendingRequest;
    mapping(uint256 => uint256) public lastPlayedTime; // Tracks history (no cooldown)

    struct RequestInfo {
        uint256 fid;
        address recipient;
    }
    mapping(uint256 => RequestInfo) public requests;
    mapping(bytes32 => bool) public usedSignatures;

    // --- Events ---
    event ClaimInitiated(uint256 indexed requestId, uint256 indexed fid, address indexed recipient);
    event GiftDistributed(uint256 indexed fid, address indexed recipient, uint256 amount);
    event ParametersUpdated(uint256 min, uint256 max);
    event SignerUpdated(address newSigner);

    // --- Errors ---
    error InvalidSignature();
    error SignatureExpired();
    error RequestAlreadyPending();
    error InvalidRecipient();
    error InvalidAmountRange();
    error InvalidDistribution();
    error SignatureAlreadyUsed();
    error InvalidEntryFee();

    constructor(
        address _vrfCoordinator,
        address _token,
        address _signer,
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint256 _minAmount,
        uint256 _maxAmount
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        token = IERC20(_token);
        signer = _signer;
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        minAmount = _minAmount;
        maxAmount = _maxAmount;
    }

    function claim(
        uint256 fid, 
        address recipient, 
        uint256 deadline,
        bytes memory signature
    ) external payable nonReentrant whenNotPaused {
        if (msg.value != ENTRY_FEE) revert InvalidEntryFee();
        if (recipient == address(0)) revert InvalidRecipient();
        if (block.timestamp > deadline) revert SignatureExpired();
        
        // 1. Verify Signature
        bytes32 messageHash = keccak256(abi.encodePacked(fid, recipient, deadline));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        if (usedSignatures[messageHash]) revert SignatureAlreadyUsed();
        if (ethSignedMessageHash.recover(signature) != signer) revert InvalidSignature();

        usedSignatures[messageHash] = true;

        if (hasPendingRequest[fid]) revert RequestAlreadyPending();
        hasPendingRequest[fid] = true;
        lastPlayedTime[fid] = block.timestamp;

        // 2. Request Randomness (VRF V2.5)
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
            })
        );

        requests[requestId] = RequestInfo(fid, recipient);
        emit ClaimInitiated(requestId, fid, recipient);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        RequestInfo memory req = requests[requestId];
        uint256 fid = req.fid;
        address recipient = req.recipient;

        delete requests[requestId];
        hasPendingRequest[fid] = false;

        uint256 range = maxAmount - minAmount + 1;
        uint256 randomAmount = (randomWords[0] % range) + minAmount;

        require(token.transfer(recipient, randomAmount), "Transfer failed");

        emit GiftDistributed(fid, recipient, randomAmount);
    }

    function setGiftParams(uint256 _min, uint256 _max) external onlyOwner {
        if (_min > _max) revert InvalidAmountRange();
        minAmount = _min;
        maxAmount = _max;
        emit ParametersUpdated(_min, _max);
    }

    function setSigner(address _signer) external onlyOwner {
        signer = _signer;
        emit SignerUpdated(_signer);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawETH() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    function withdrawToken(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(msg.sender, _amount);
    }

    function getLastPlayed(uint256 fid) external view returns (uint256) {
        return lastPlayedTime[fid];
    }
}
