
export const dailyGiftAbi = [
    {
        "inputs": [
            { "internalType": "address", "name": "_token", "type": "address" }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "fid", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "Played",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "fid", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "Payout",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": false, "internalType": "address", "name": "newToken", "type": "address" }
        ],
        "name": "TokenUpdated",
        "type": "event"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "fid", "type": "uint256" }],
        "name": "play",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "fid", "type": "uint256" },
            { "internalType": "address", "name": "recipient", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "payout",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "fid", "type": "uint256" }],
        "name": "getLastPlayed",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "token",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_token", "type": "address" }],
        "name": "setToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "withdrawETH",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_token", "type": "address" },
            { "internalType": "uint256", "name": "_amount", "type": "uint256" }
        ],
        "name": "withdrawToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;
