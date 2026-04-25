// 0xfee68b4d2945cb957cd698d339deaea9b0c5dba8

//SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "contracts/v5/interface/IFactory.sol";
import "contracts/v5/interface/IPayments.sol";
import "contracts/v5/interface/IStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WEbdEXFactoryV5 is Ownable {

    mapping(address => IFactory.Bot) internal bots;

    function _checkBot(address contractAddress) internal view virtual {
        require(
            bots[contractAddress].managerAddress != address(0),
            "Bot not found"
        );
    }

    function addBot(
        string memory name,
        string memory prefix,
        address owner,
        address contractAddress,
        address strategyAddress,
        address subAccountAddress,
        address paymentsAddress,
        address tokenPassAddress,
        address networkAddress,
        uint16 feeWithdrawNetwork,
        address feeCollectorNetworkAddress,
        IPayments.FeeTier[] memory newFeeTiers
    ) public onlyOwner {
        require(
            bots[contractAddress].managerAddress == address(0),
            "Bot already registered"
        );

        bots[contractAddress] = IFactory.Bot(
            prefix,
            name,
            owner,
            contractAddress,
            strategyAddress,
            subAccountAddress,
            paymentsAddress,
            tokenPassAddress,
            networkAddress,
            feeWithdrawNetwork,
            feeCollectorNetworkAddress
        );
        IPayments(bots[contractAddress].paymentsAddress).addFeeTiers(
            contractAddress,
            newFeeTiers
        );
    }

    function getBotInfo(
        address contractAddress
    ) public view returns (IFactory.Bot memory) {
        return bots[contractAddress];
    }

    function updateBot(
        address contractAddress,
        address strategyAddress,
        address subAccountAddress,
        address paymentsAddress,
        address networkAddress,
        address tokenPassAddress,
        address feeCollectorNetworkAddress
    ) public onlyOwner {
        _checkBot(contractAddress);
        if (strategyAddress != address(0)) {
            bots[contractAddress].strategyAddress = strategyAddress;
        }
        if (subAccountAddress != address(0)) {
            bots[contractAddress].subAccountAddress = subAccountAddress;
        }
        if (paymentsAddress != address(0)) {
            bots[contractAddress].paymentsAddress = paymentsAddress;
        }
        if (networkAddress != address(0)) {
            bots[contractAddress].networkAddress = networkAddress;
        }
        if (tokenPassAddress != address(0)) {
            ERC20 tokenPass = ERC20(bots[contractAddress].tokenPassAddress);
            ERC20 tokenOther = ERC20(tokenPassAddress);

            uint8 decimalsBot = tokenPass.decimals();
            uint8 decimalsOther = tokenOther.decimals();
            require(
                decimalsBot == decimalsOther,
                "The subscription token's decimals are invalid!"
            );
            bots[contractAddress].tokenPassAddress = tokenPassAddress;
        }
        if (feeCollectorNetworkAddress != address(0)){
            bots[contractAddress].feeCollectorNetworkAddress = feeCollectorNetworkAddress;
        }
    }

    function changeFeeWithdrawNetwork(
        address contractAddress,
        uint16 feeWithdrawNetwork
    ) public onlyOwner {
        _checkBot(contractAddress);
        bots[contractAddress].feeWithdrawNetwork = feeWithdrawNetwork;
    }

    function removeBot(address contractAddress) public onlyOwner {
        _checkBot(contractAddress);
        delete bots[contractAddress];
    }

    function currencyAllow(
        address contractAddress,
        address coin
    ) public onlyOwner {
        _checkBot(contractAddress);
        IPayments(bots[contractAddress].paymentsAddress).revokeOrAllowCurrency(
            contractAddress,
            coin,
            true
        );
    }

    function currencyRevoke(
        address contractAddress,
        address coin
    ) public onlyOwner {
        _checkBot(contractAddress);
        IPayments(bots[contractAddress].paymentsAddress).revokeOrAllowCurrency(
            contractAddress,
            coin,
            false
        );
    }

    function addStrategy(
        string memory name,
        string memory symbol,
        address contractAddress
    ) public onlyOwner {
        _checkBot(contractAddress);
        IStrategy(bots[contractAddress].strategyAddress).addStrategy(
            name,
            symbol,
            contractAddress
        );
    }

    function updateStrategyStatus(
        address contractAddress,
        address tokenAddress,
        bool isActive
    ) public onlyOwner {
        _checkBot(contractAddress);
        IStrategy(bots[contractAddress].strategyAddress).updateStrategyStatus(
            contractAddress,
            tokenAddress,
            isActive
        );
    }
}