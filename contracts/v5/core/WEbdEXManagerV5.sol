// 0x9826a9727d5bb97a44bf14fe2e2b0b1d5a81c860

//SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "contracts/v5/interface/INetwork.sol";
import "contracts/v5/interface/ISubAccount.sol";
import "contracts/v5/interface/IFactory.sol";
import "contracts/v5/interface/IStrategy.sol";
import "contracts/v5/utils/LPToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WEbdEXManagerV5 {
    IFactory public factory;
    mapping(address => User) internal users;
    struct User {
        address manager;
        uint256 gasBalance;
        uint256 passBalance;
        uint256 bonusBalance;
        bool status;
    }

    struct UserDisplay {
        address manager;
        uint256 gasBalance;
        uint256 passBalance;
        uint256 bonusBalance;
        ISubAccount.SubAccountsDisplay[] SubAccounts;
    }

    mapping(address => Coin) internal listCoins;
    struct Coin {
        bool status;
        LPToken lp;
    }

    event Register(address indexed user, address indexed manager);

    event BalanceGas(
        address indexed user,
        uint256 balance,
        uint256 value,
        bool increase,
        bool is_operation
    );

    event BalancePass(
        address indexed user,
        uint256 balance,
        uint256 value,
        bool increase,
        bool is_operation
    );

    event BalanceBonus(
        address indexed user,
        uint256 balance,
        uint256 value,
        bool increase,
        bool is_operation
    );

    constructor(IFactory _factory) {
        factory = _factory;
    }

    modifier onlyPayments() {
        IFactory.Bot memory botInfo = factory.getBotInfo(address(this));
        require(
            botInfo.paymentsAddress == msg.sender,
            "You must the WEbdEXPaymentsV5"
        );
        _;
    }

    modifier onlyOwner() {
        IFactory.Bot memory botInfo = factory.getBotInfo(address(this));
        require(
            botInfo.owner == msg.sender || address(factory) == msg.sender,
            "Ownable: caller is not the owner nor the factory"
        );
        _;
    }

    modifier onlyRegistered() {
        require(users[msg.sender].status, "User not registered");
        _;
    }

    function register(address manager, string memory name) public {
        if (manager != address(0)) {
            require(users[manager].status, "Unregistered manager");
        }

        require(!users[msg.sender].status, "User already registered");
        users[msg.sender] = User(manager, 0, 0, 0, true);
        emit Register(msg.sender, manager);

        _createSubAccount(msg.sender, name);
    }

    function subAccount() internal view returns (ISubAccount) {
        address subAccountAddress = factory
            .getBotInfo(address(this))
            .subAccountAddress;
        return ISubAccount(subAccountAddress);
    }

    function _createSubAccount(address user, string memory name) internal {
        subAccount().create(user, name);
    }

    function createSubAccount(string[] memory names) public onlyRegistered {
        for (uint256 i = 0; i < names.length; i++) {
            _createSubAccount(msg.sender, names[i]);
        }
    }

    function getInfoUser() public view returns (UserDisplay memory) {
        ISubAccount SubAccount = subAccount();
        ISubAccount.SubAccounts[] memory subAccounts = SubAccount
            .getSubAccounts(address(this), msg.sender);

        uint256 subAccountCount = subAccounts.length;
        ISubAccount.SubAccountsDisplay[]
            memory accounts = new ISubAccount.SubAccountsDisplay[](
                subAccountCount
            );

        for (uint256 i = 0; i < subAccountCount; i++) {
            address[] memory _strategies = SubAccount.getStrategies(
                address(this),
                msg.sender,
                subAccounts[i].id
            );

            ISubAccount.StrategyDisplay[]
                memory strategies = new ISubAccount.StrategyDisplay[](
                    _strategies.length
                );

            for (uint256 j = 0; j < _strategies.length; j++) {
                ISubAccount.BalanceStrategy[] memory balances = SubAccount
                    .getBalances(
                        address(this),
                        msg.sender,
                        subAccounts[i].id,
                        _strategies[j]
                    );
                strategies[j] = ISubAccount.StrategyDisplay(
                    _strategies[j],
                    balances
                );
            }
            accounts[i] = ISubAccount.SubAccountsDisplay(
                subAccounts[i].id,
                subAccounts[i].name,
                strategies
            );
        }

        return
            UserDisplay(
                users[msg.sender].manager,
                users[msg.sender].gasBalance,
                users[msg.sender].passBalance,
                users[msg.sender].bonusBalance,
                accounts
            );
    }

    function getStrategies() public view returns (IStrategy.Strategy[] memory) {
        return strategy().getStrategies(address(this));
    }

    function strategy() internal view returns (IStrategy) {
        address strategyAddress = factory
            .getBotInfo(address(this))
            .strategyAddress;
        return IStrategy(strategyAddress);
    }

    function _lpMint(
        address to,
        address coin,
        uint256 amount
    ) internal returns (address) {
        listCoins[coin].lp.mint(to, amount);
        return address(listCoins[coin].lp);
    }

    function LiquidityAdd(
        string[] memory accountId,
        address strategyToken,
        address coin,
        uint256 amount
    ) public onlyRegistered {
        require(
            strategy().findStrategy(address(this), strategyToken).isActive,
            "Strategy not found"
        );
        require(coin != address(0), "Invalid contract address");

        ERC20 erc20 = ERC20(coin);
        if (!listCoins[coin].status) {
            listCoins[coin] = Coin(
                true,
                new LPToken(
                    erc20.name(),
                    erc20.symbol(),
                    erc20.decimals(),
                    coin
                )
            );
        }

        ISubAccount SubAccount = subAccount();
        for (uint256 i = 0; i < accountId.length; i++) {
            SubAccount.addLiquidity(
                msg.sender,
                accountId[i],
                strategyToken,
                amount / accountId.length,
                coin
            );
        }

        erc20.transferFrom(msg.sender, address(SubAccount), amount);
        _lpMint(msg.sender, coin, amount);
    }

    function LiquidityRemove(
        string[] memory accountId,
        address strategyToken,
        address coin,
        uint256 amount
    ) public onlyRegistered {
        require(
            strategy().findStrategy(address(this), strategyToken).isActive,
            "Strategy not found"
        );
        require(coin != address(0), "Invalid contract address");

        for (uint256 i = 0; i < accountId.length; i++) {
            subAccount().removeLiquidity(
                msg.sender,
                accountId[i],
                strategyToken,
                amount,
                coin
            );
        }

        ERC20 erc20 = ERC20(coin);
        listCoins[coin].lp.burnFrom(msg.sender, amount * accountId.length);
        erc20.transfer(msg.sender, amount * accountId.length);
    }

    function togglePause(
        string[] memory accountId,
        address strategyToken,
        address coin,
        bool paused
    ) public onlyRegistered {
        require(
            strategy().findStrategy(address(this), strategyToken).isActive,
            "Strategy not found"
        );
        require(coin != address(0), "Invalid contract address");

        for (uint256 i = 0; i < accountId.length; i++) {
            subAccount().togglePause(
                msg.sender,
                accountId[i],
                strategyToken,
                coin,
                paused
            );
        }
    }

    function gasRemove(uint256 amount) public onlyRegistered {
        require(
            users[msg.sender].gasBalance >= amount,
            "Insufficient gas balance"
        );

        users[msg.sender].gasBalance -= amount;

        payable(msg.sender).transfer(amount);

        emit BalanceGas(
            msg.sender,
            users[msg.sender].gasBalance,
            amount,
            false,
            false
        );
    }

    function gasAdd() public payable onlyRegistered {
        require(msg.value >= 0, "Insufficient value");
        users[msg.sender].gasBalance += msg.value;

        emit BalanceGas(
            msg.sender,
            users[msg.sender].gasBalance,
            msg.value,
            true,
            false
        );
    }

    function gasBalance() public view returns (uint256) {
        return users[msg.sender].gasBalance;
    }

    function passAdd(uint256 amount) public onlyRegistered {
        users[msg.sender].passBalance += amount;
        address token = factory.getBotInfo(address(this)).tokenPassAddress;

        ERC20 erc20 = ERC20(token);
        erc20.transferFrom(msg.sender, address(this), amount);

        emit BalancePass(
            msg.sender,
            users[msg.sender].passBalance,
            amount,
            true,
            false
        );
    }

    function passRemove(uint256 amount) public onlyRegistered {
        require(
            users[msg.sender].passBalance >= amount,
            "Insufficient pass balance"
        );
        users[msg.sender].passBalance -= amount;
        address token = factory.getBotInfo(address(this)).tokenPassAddress;

        ERC20 erc20 = ERC20(token);
        erc20.transfer(msg.sender, amount);

        emit BalancePass(
            msg.sender,
            users[msg.sender].passBalance,
            amount,
            false,
            false
        );
    }

    function bonusAdd(uint256 amount, address user) public onlyOwner {
        require(users[user].status, "User not registered");
        users[user].bonusBalance += amount;
        emit BalanceBonus(user, users[user].bonusBalance, amount, true, false);
    }

    function bonusRemove(uint256 amount, address user) public onlyOwner {
        require(users[user].status, "User not registered");
        require(
            users[user].bonusBalance >= amount,
            "Insufficient pass balance"
        );
        users[user].bonusBalance -= amount;
        emit BalanceBonus(user, users[user].bonusBalance, amount, false, false);
    }

    function networkBalance(address coin) public view returns (uint256) {
        address networkAddress = factory
            .getBotInfo(address(this))
            .networkAddress;
        return
            INetwork(networkAddress).getBalance(
                address(this),
                coin,
                msg.sender
            );
    }

    function networkWithdraw(
        address coin,
        uint256 amount
    ) public onlyRegistered {
        address networkAddress = factory
            .getBotInfo(address(this))
            .networkAddress;
        INetwork(networkAddress).withdraw(msg.sender, coin, amount);
    }

    function passBalance() public view returns (uint256) {
        return users[msg.sender].passBalance;
    }

    function bonusBalance() public view returns (uint256) {
        return users[msg.sender].bonusBalance;
    }

    function mint(
        address user,
        address coin,
        uint256 amount
    ) external onlyPayments {
        require(listCoins[coin].status, "Coin not active");
        require(amount > 0, "Amount must be greater than zero");
        listCoins[coin].lp.mint(user, amount);
    }

    function burn(
        address user,
        address coin,
        uint256 amount
    ) external onlyPayments {
        require(listCoins[coin].status, "Coin not active");
        require(amount > 0, "Amount must be greater than zero");
        listCoins[coin].lp.burnFrom(user, amount);
    }

    function commissionPass(uint256 amount) public onlyPayments {
        IFactory.Bot memory botInfo = factory.getBotInfo(address(this));
        ERC20 erc20 = ERC20(botInfo.tokenPassAddress);
        erc20.transfer(botInfo.subAccountAddress, amount);
    }

    function rebalancePosition(
        address user,
        int256 amount,
        uint256 gas,
        address coin,
        uint256 fee
    ) public onlyPayments {
        require(users[user].gasBalance >= gas, "Insufficient gas balance");
        require(
            users[user].passBalance + users[user].bonusBalance >= fee,
            "Insufficient pass balance"
        );

        uint256 remainingFee = fee;
        if (users[user].bonusBalance > 0) {
            if (users[user].bonusBalance >= fee) {
                users[user].bonusBalance -= fee;
                remainingFee = 0;
            } else {
                remainingFee -= users[user].bonusBalance;
                users[user].bonusBalance = 0;
            }
            emit BalanceBonus(
                user,
                users[user].bonusBalance,
                fee - remainingFee,
                false,
                true
            );
        }

        if (remainingFee > 0) {
            users[user].passBalance -= remainingFee;
            emit BalancePass(
                user,
                users[user].passBalance,
                remainingFee,
                false,
                true
            );
        }

        users[user].gasBalance -= gas;

        if (amount > 0) {
            listCoins[coin].lp.mint(user, uint256(amount));
        } else {
            listCoins[coin].lp.burnFrom(user, uint256(-1 * amount));
        }

        IFactory.Bot memory botInfo = factory.getBotInfo(address(this));
        payable(botInfo.owner).transfer(gas);

        emit BalanceGas(user, users[user].gasBalance, gas, false, true);
    }
}