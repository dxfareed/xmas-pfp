
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract DailyGift is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // --- Configuration ---
    IERC20 public token;
    uint256 public constant ENTRY_FEE = 0.0001 ether;

    // --- State ---
    mapping(uint256 => uint256) public lastPlayedTime;

    // --- Events ---
    event Played(uint256 indexed fid, address indexed player, uint256 timestamp);
    event Payout(uint256 indexed fid, address indexed player, uint256 amount);
    event TokenUpdated(address newToken);
    event EntryFeePaid(uint256 indexed fid, address indexed player, uint256 amount, uint256 timestamp);

    // --- Errors ---
    error InvalidEntryFee();
    error InsufficientBalance();
    error ZeroAddress();

    constructor(address _token) Ownable(msg.sender) {
        if (_token == address(0)) revert ZeroAddress();
        token = IERC20(_token);
    }

    // 1. User Commits (Pays Fee)
    function play(uint256 fid) external payable nonReentrant whenNotPaused {
        if (msg.value != ENTRY_FEE) revert InvalidEntryFee();
        
        lastPlayedTime[fid] = block.timestamp;
        emit EntryFeePaid(fid, msg.sender, msg.value, block.timestamp);
        emit Played(fid, msg.sender, block.timestamp);
    }

    // 2. Server Reveals (Pays Prize)
    function payout(uint256 fid, address recipient, uint256 amount) external onlyOwner nonReentrant {
        uint256 balance = token.balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance();

        token.safeTransfer(recipient, amount);
        emit Payout(fid, recipient, amount);
    }

    // --- Admin ---

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
