// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "contracts/v5/interface/IFactory.sol";
import "contracts/v5/interface/IPayments.sol";
import "contracts/v5/interface/IStrategy.sol";
import "contracts/v5/interface/IManager.sol";
import "contracts/v5/interface/ISubAccount.sol";

contract WEbdEXPaymentsV5 {
    IFactory public factory;

    mapping(address => IPayments.Bot) internal bots;
    struct Currencys {
        address from;
        address to;
    }
    event Trader(address indexed manager, address from, address to);
    event CurrencyStatus(address indexed manager, address token, bool status);
    event FeeTiersUpdated(
        address indexed manager,
        IPayments.FeeTier[] feeTier,
        bool added
    );

    struct PositionDetails {
        address strategy;
        address coin;
        string botId;
        uint256 oldBalance;
        uint256 fee;
        uint256 gas;
        int256 profit;
    }

    mapping(string => bool) internal processedFee;
    struct PayFee {
        address user;
        string id;
        address coin;
        uint256 amount;
    }

    event OpenPosition(
        address indexed manager,
        address user,
        string accountId,
        PositionDetails details
    );

    mapping(address => bool) private allowedAddresses;

    event AddressAddedToWhitelist(address indexed addr);
    event AddressRemovedFromWhitelist(address indexed addr);

    constructor(IFactory _factory) {
        factory = _factory;
    }

    modifier onlyOwner(address contractAddress) {
        IFactory.Bot memory botInfo = factory.getBotInfo(contractAddress);
        require(
            botInfo.owner == msg.sender || address(factory) == msg.sender,
            "Ownable: caller is not the owner nor the factory"
        );
        _;
    }

    modifier onlyAuthorized(address contractAddress) {
        IFactory.Bot memory botInfo = factory.getBotInfo(contractAddress);
        require(
            botInfo.owner == msg.sender ||
                address(factory) == msg.sender ||
                allowedAddresses[msg.sender],
            "Ownable: caller is not authorized"
        );
        _;
    }

    function manager(address contractAddress) internal view returns (IManager) {
        address managerAddress = factory
            .getBotInfo(contractAddress)
            .managerAddress;
        return IManager(managerAddress);
    }

    function strategy(
        address contractAddress
    ) internal view returns (IStrategy) {
        address strategyAddress = factory
            .getBotInfo(contractAddress)
            .strategyAddress;
        return IStrategy(strategyAddress);
    }

    function subAccount(
        address contractAddress
    ) internal view returns (ISubAccount) {
        address subAccountAddress = factory
            .getBotInfo(contractAddress)
            .subAccountAddress;
        return ISubAccount(subAccountAddress);
    }

    function revokeOrAllowCurrency(
        address contractAddress,
        address coin,
        bool status
    ) public onlyOwner(contractAddress) {
        require(
            status != bots[contractAddress].coins[coin].status,
            "The status must be different"
        );
        if (!bots[contractAddress].coins[coin].status) {
            ERC20 erc20 = ERC20(coin);
            bots[contractAddress].coins[coin] = IPayments.Coins(
                erc20.name(),
                erc20.symbol(),
                erc20.decimals(),
                true
            );
        }

        bots[contractAddress].coins[coin].status = status;
        emit CurrencyStatus(contractAddress, coin, status);
    }

    function addFeeTiers(
        address contractAddress,
        IPayments.FeeTier[] memory newFeeTiers
    ) public onlyOwner(contractAddress) {
        if (bots[contractAddress].feeTiers.length > 0) {
            emit FeeTiersUpdated(
                contractAddress,
                bots[contractAddress].feeTiers,
                false
            );
            delete bots[contractAddress].feeTiers;
        }

        for (uint256 i = 0; i < newFeeTiers.length; i++) {
            bots[contractAddress].feeTiers.push(newFeeTiers[i]);
        }
        emit FeeTiersUpdated(
            contractAddress,
            bots[contractAddress].feeTiers,
            true
        );
    }

    function calculateFee(
        address contractAddress,
        uint256 value
    ) internal view returns (uint256) {
        IPayments.FeeTier[] memory feeTiers = bots[contractAddress].feeTiers;
        for (uint256 i = 0; i < feeTiers.length; i++) {
            if (value <= feeTiers[i].limit) {
                return feeTiers[i].fee;
            }
        }
        return feeTiers[feeTiers.length - 1].fee;
    }

    function openPosition(
        address contractAddress,
        string memory accountId,
        address strategyToken,
        address user,
        int256 amount,
        Currencys[] memory currrencys,
        uint256 gas,
        address coin,
        string memory botId
    ) public onlyAuthorized(contractAddress) {
        IFactory.Bot memory botInfo = factory.getBotInfo(contractAddress);
        require(
            strategy(contractAddress)
                .findStrategy(botInfo.managerAddress, strategyToken)
                .isActive,
            "Strategy not found"
        );

        for (uint256 index = 0; index < currrencys.length; index++) {
            require(
                bots[contractAddress].coins[currrencys[index].from].status &&
                    bots[contractAddress].coins[currrencys[index].to].status,
                "One of the coins is not a valid ERC20 token"
            );
        }

        uint256 oldBalance = subAccount(contractAddress).position(
            botInfo.managerAddress,
            user,
            accountId,
            strategyToken,
            coin,
            amount
        );
        uint256 fee = calculateFee(contractAddress, oldBalance);

        manager(contractAddress).rebalancePosition(
            user,
            amount,
            gas,
            coin,
            fee
        );

        PositionDetails memory details = PositionDetails(
            strategyToken,
            coin,
            botId,
            oldBalance,
            fee,
            gas,
            amount
        );

        emit OpenPosition(contractAddress, user, accountId, details);

        for (uint256 index = 0; index < currrencys.length; index++) {
            emit Trader(
                contractAddress,
                currrencys[index].from,
                currrencys[index].to
            );
        }
    }

    function payFee(
        address contractAddress,
        uint256 totalPass,
        PayFee[] memory list
    ) public onlyAuthorized(contractAddress) {
        IFactory.Bot memory botInfo = factory.getBotInfo(contractAddress);
        ISubAccount SubAccount = subAccount(contractAddress);
        manager(contractAddress).commissionPass(totalPass);

        for (uint256 i = 0; i < list.length; i++) {
            PayFee memory details = list[i];
            require(!processedFee[details.id], "already for this ID");
            SubAccount.payFee(
                botInfo.managerAddress,
                details.user,
                details.id,
                details.coin,
                details.amount
            );

            processedFee[details.id] = true;
        }
    }

    function addAddressToWhitelist(
        address contractAddress,
        address addr
    ) public onlyOwner(contractAddress) {
        require(!allowedAddresses[addr], "Address already whitelisted");
        allowedAddresses[addr] = true;
        emit AddressAddedToWhitelist(addr);
    }

    function removeAddressFromWhitelist(
        address contractAddress,
        address addr
    ) public onlyOwner(contractAddress) {
        require(allowedAddresses[addr], "Address not in whitelist");
        allowedAddresses[addr] = false;
        emit AddressRemovedFromWhitelist(addr);
    }
}