
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract DailyGift is Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using SafeERC20 for IERC20;

    // --- Configuration ---
    IERC20 public token;
    address public signer;

    // Gift Parameters
    uint256 public constant ENTRY_FEE = 0.0001 ether;
    uint256 public constant SIGNATURE_VALIDITY = 10 minutes;

    // --- State ---
    mapping(uint256 => uint256) public lastPlayedTime; // Tracks history (no cooldown)
    mapping(bytes32 => bool) public usedSignatures;

    // --- Events ---
    event GiftDistributed(uint256 indexed fid, address indexed recipient, uint256 amount);
    event SignerUpdated(address newSigner);
    event TokenUpdated(address newToken);

    // --- Errors ---
    error InvalidSignature();
    error SignatureExpired();
    error SignatureAlreadyUsed();
    error InvalidRecipient();
    error InvalidEntryFee();
    error InsufficientBalance();
    error ZeroAddress();

    constructor(
        address _token,
        address _signer
    ) Ownable(msg.sender) {
        if (_token == address(0)) revert ZeroAddress();
        if (_signer == address(0)) revert ZeroAddress();
        token = IERC20(_token);
        signer = _signer;
    }

    function claim(
        uint256 fid, 
        address recipient, 
        uint256 amount,
        uint256 deadline,
        bytes memory signature
    ) external payable nonReentrant whenNotPaused {
        if (msg.value != ENTRY_FEE) revert InvalidEntryFee();
        if (recipient == address(0)) revert InvalidRecipient();
        if (block.timestamp > deadline) revert SignatureExpired();
        
        // 1. Verify Signature
        // Hash includes 'amount' to prevent tampering with the prize
        bytes32 messageHash = keccak256(abi.encodePacked(fid, recipient, amount, deadline));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        if (usedSignatures[messageHash]) revert SignatureAlreadyUsed();
        if (ethSignedMessageHash.recover(signature) != signer) revert InvalidSignature();

        usedSignatures[messageHash] = true;
        
        // Update History
        lastPlayedTime[fid] = block.timestamp;

        // 2. Transfer Tokens (Instant Payout)
        uint256 balance = token.balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance();

        token.safeTransfer(recipient, amount);

        emit GiftDistributed(fid, recipient, amount);
    }

    // --- Admin ---

    function setSigner(address _signer) external onlyOwner {
        if (_signer == address(0)) revert ZeroAddress();
        signer = _signer;
        emit SignerUpdated(_signer);
    }

    function setToken(address _token) external onlyOwner {
        if (_token == address(0)) revert ZeroAddress();
        token = IERC20(_token);
        emit TokenUpdated(_token);
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
