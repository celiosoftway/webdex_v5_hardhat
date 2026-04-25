// 0xfB2486E93E4Ab8A36d2e6C23004FacaAD3Bad5Db

//SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "contracts/v5/interface/IFactory.sol";
import "contracts/v5/interface/ISubAccount.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WEbdEXNetworkV5 {
    IFactory public factory;

    struct BalanceInfo {
        uint256 balance;
        address token;
    }

    struct Bot {
        mapping(address => mapping(address => BalanceInfo)) balances;
    }

    mapping(address => Bot) internal bots;

    event BalanceNetworkAdd(
        address indexed manager,
        address indexed user,
        string id,
        address coin,
        uint256 balance,
        uint256 value
    );

    event BalanceNetworkRemove(
        address indexed manager,
        address indexed user,
        address coin,
        uint256 balance,
        uint256 value,
        uint256 fee
    );

    constructor(IFactory _factory) {
        factory = _factory;
    }

    modifier onlySubAccount(address contractAddress) {
        IFactory.Bot memory botInfo = factory.getBotInfo(contractAddress);
        require(botInfo.subAccountAddress == msg.sender, "Not authorized");
        _;
    }

    modifier onlyManager() {
        IFactory.Bot memory botInfo = factory.getBotInfo(msg.sender);
        require(botInfo.managerAddress != address(0), "Not authorized");
        _;
    }

    function payFee(
        address contractAddress,
        address user,
        address token,
        uint256 amount,
        string memory id
    ) external onlySubAccount(contractAddress) {
        BalanceInfo storage balanceInfo = bots[contractAddress].balances[user][
            token
        ];

        if (balanceInfo.token == address(0)) {
            balanceInfo.token = token;
        }

        balanceInfo.balance += amount;
        emit BalanceNetworkAdd(
            contractAddress,
            user,
            id,
            token,
            balanceInfo.balance,
            amount
        );
    }

    function withdrawal(
        address contractAddress,
        address token,
        uint256 amount
    ) public {
        BalanceInfo storage balanceInfo = bots[contractAddress].balances[msg.sender][
            token
        ];

        require(
            balanceInfo.balance >= amount,
            "The amount must be less than or equal to the balance"
        );
        IFactory.Bot memory botInfo = factory.getBotInfo(contractAddress);
        uint256 fee = (amount * botInfo.feeWithdrawNetwork) / 100;

        balanceInfo.balance -= amount;
        ERC20(token).transfer(msg.sender, amount - fee);
        ERC20(token).transfer(botInfo.feeCollectorNetworkAddress, fee);

        emit BalanceNetworkRemove(
            contractAddress,
            msg.sender,
            token,
            balanceInfo.balance,
            amount,
            fee
        );
    }

    function getBalance(
        address contractAddress,
        address token,
        address user
    ) external view returns (uint256) {
        return bots[contractAddress].balances[user][token].balance;
    }
}