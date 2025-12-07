// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DailyGift
 */
contract DailyGift is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public signer;
    uint256 public dailyAmount;
    uint256 public constant CLAIM_INTERVAL = 24 hours;
    uint256 public constant SIGNATURE_VALIDITY = 5 minutes;

    // FID => last claim timestamp
    mapping(uint256 => uint256) public lastClaim;
    
    // Track used signatures to prevent replay attacks
    mapping(bytes32 => bool) public usedSignatures;

    event Claimed(uint256 indexed fid, address indexed recipient, uint256 amount);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event DailyAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    error InvalidSigner();
    error InvalidRecipient();
    error InvalidSignature();
    error SignatureExpired();
    error SignatureAlreadyUsed();
    error ClaimTooSoon(uint256 timeRemaining);
    error InsufficientBalance();
    error ZeroAddress();
    error ZeroAmount();

    constructor(
        address _token, 
        address _signer, 
        uint256 _dailyAmount
    ) Ownable(msg.sender) {
        if (_token == address(0)) revert ZeroAddress();
        if (_signer == address(0)) revert ZeroAddress();
        if (_dailyAmount == 0) revert ZeroAmount();
        
        token = IERC20(_token);
        signer = _signer;
        dailyAmount = _dailyAmount;
    }

    function claim(
        uint256 fid, 
        address recipient, 
        uint256 deadline,
        bytes memory signature
    ) external nonReentrant {
        if (recipient == address(0)) revert InvalidRecipient();
        if (block.timestamp > deadline) revert SignatureExpired();
        
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                fid, 
                recipient, 
                deadline,
                block.chainid,
                address(this)
            )
        );
        
        if (usedSignatures[messageHash]) revert SignatureAlreadyUsed();
        
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        if (recoveredSigner != signer) revert InvalidSignature();
        
        usedSignatures[messageHash] = true;

        uint256 lastClaimTime = lastClaim[fid];
        if (block.timestamp < lastClaimTime + CLAIM_INTERVAL) {
            revert ClaimTooSoon(lastClaimTime + CLAIM_INTERVAL - block.timestamp);
        }

        lastClaim[fid] = block.timestamp;

        token.safeTransfer(recipient, dailyAmount);

        emit Claimed(fid, recipient, dailyAmount);
    }

    function canClaim(uint256 fid) external view returns (bool) {
        return block.timestamp >= lastClaim[fid] + CLAIM_INTERVAL;
    }

    function timeUntilNextClaim(uint256 fid) external view returns (uint256) {
        uint256 nextClaimTime = lastClaim[fid] + CLAIM_INTERVAL;
        if (block.timestamp >= nextClaimTime) return 0;
        return nextClaimTime - block.timestamp;
    }

    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function setSigner(address _signer) external onlyOwner {
        if (_signer == address(0)) revert ZeroAddress();
        address oldSigner = signer;
        signer = _signer;
        emit SignerUpdated(oldSigner, _signer);
    }

    function setDailyAmount(uint256 _amount) external onlyOwner {
        if (_amount == 0) revert ZeroAmount();
        uint256 oldAmount = dailyAmount;
        dailyAmount = _amount;
        emit DailyAmountUpdated(oldAmount, _amount);
    }

    function withdrawTokens(uint256 amount) external onlyOwner {
        token.safeTransfer(owner(), amount);
    }

    function rescueTokens(address _token, uint256 amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), amount);
        emit EmergencyWithdraw(_token, amount);
    }
}
