// npm run step1

const hre = require('hardhat');
const { updateEnv, getEnv } = require('./utils/env.js');
const { showDecodedEvents } = require('./utils/util.js');

async function logWallet(name, role, signer) {
    const balance = await signer.getBalance();
    const eth = hre.ethers.utils.formatEther(balance);

    console.log(
        `| [${role.padEnd(10)}] ${name.padEnd(18)} : ${signer.address} | Saldo: ${Number(eth).toFixed(4)} ETH`
    );
}

async function main() {
    const [protocolo, executor, usuario1, executor1] = await hre.ethers.getSigners();

    console.log("\n" + "=".repeat(85));
    console.log("📊 STEP 1 - MONITORAMENTO DE CARTEIRAS INICIAL");

    console.log("=".repeat(85));

    await logWallet("Admin do Sistema", "PROTOCOLO", protocolo); // Account #0
    await logWallet("Bot de Operações", "EXECUTOR", executor);   // Account #1
    await logWallet("Dono dos Fundos", "USUÁRIO 1", usuario1);     // Account #2
    await logWallet("Executor Adicional", "EXECUTOR 1", executor1); // Account #3

    updateEnv('ADDR_PROTOCOLO', protocolo.address);
    updateEnv('ADDR_EXECUTOR', executor.address);
    updateEnv('ADDR_USUARIO1', usuario1.address);
    updateEnv('ADDR_EXECUTOR1', executor1.address);

    console.log("-".repeat(85));

    console.log("\n🚀 INICIANDO DEPLOY DA INFRAESTRUTURA...");

    // 1- WEbdEXFactoryV5
    console.log("\n" + "=".repeat(85));
    console.log("DEPLOY WEbdEX FACTORY");
    console.log("=".repeat(85));

    const WEbdEXFactory = await hre.ethers.getContractFactory("WEbdEXFactoryV5", protocolo);
    const webdexFactory = await WEbdEXFactory.deploy();
    await webdexFactory.deployed();

    console.log(`\n[CONTRACT] WEbdEXFactoryV5     -> ${webdexFactory.address} (Fábrica de Bots)`);
    updateEnv('ADDR_WEBDEX_FACTORY', webdexFactory.address);

    // 2- WEbdEXStrategiesV5
    console.log("\n" + "=".repeat(85));
    console.log("DEPLOY WEbdEX STRATEGIES");
    console.log("=".repeat(85));

    const WebdexStrategies = await hre.ethers.getContractFactory("WEbdEXStrategiesV5", protocolo);
    const webdexstrategies = await WebdexStrategies.deploy(webdexFactory.address);
    await webdexstrategies.deployed();

    console.log(`\n[CONTRACT] WEbdEXStrategiesV5 -> ${webdexstrategies.address} (Gerenciador de Estratégias)`);
    updateEnv('ADDR_WEBDEX_STRATEGIES', webdexstrategies.address);

    // 3 - WEbdEXSubAccountsV5
    console.log("\n" + "=".repeat(85));
    console.log("DEPLOY WEbdEX SUB ACCOUNTS");
    console.log("=".repeat(85));

    const WEbdEXSubAccounts = await hre.ethers.getContractFactory("WEbdEXSubAccountsV5", protocolo);
    const webdexSubAccounts = await WEbdEXSubAccounts.deploy(webdexFactory.address);
    await webdexSubAccounts.deployed();

    console.log(`\n[CONTRACT] WEbdEXSubAccountsV5 -> ${webdexSubAccounts.address} (Gerenciador de Contas Subordinadas)`);
    updateEnv('ADDR_WEBDEX_SUB_ACCOUNTS', webdexSubAccounts.address);

    // 4 - WEbdEXPaymentsV5
    console.log("\n" + "=".repeat(85));
    console.log("DEPLOY WEbdEX PAYMENTS");
    console.log("=".repeat(85));

    const WEbdEXPayments = await hre.ethers.getContractFactory("WEbdEXPaymentsV5", protocolo);
    const webdexPayments = await WEbdEXPayments.deploy(webdexFactory.address);
    await webdexPayments.deployed();

    console.log(`\n[CONTRACT] WEbdEXPaymentsV5 -> ${webdexPayments.address} (Gerenciador de Pagamentos)`);
    updateEnv('ADDR_WEBDEX_PAYMENTS', webdexPayments.address);

    // 5 - WEbdEXNetworkV5
    console.log("\n" + "=".repeat(85));
    console.log("DEPLOY WEbdEX NETWORK");
    console.log("=".repeat(85));

    const WEbdEXNetwork = await hre.ethers.getContractFactory("WEbdEXNetworkV5", protocolo);
    const webdexNetwork = await WEbdEXNetwork.deploy(webdexFactory.address);
    await webdexNetwork.deployed();

    console.log(`\n[CONTRACT] WEbdEXNetworkV5 -> ${webdexNetwork.address} (Gerenciador de Rede)`);
    updateEnv('ADDR_WEBDEX_NETWORK', webdexNetwork.address);

    // 6 - WEbdEXManagerV5
    console.log("\n" + "=".repeat(85));
    console.log("DEPLOY WEbdEX MANAGER");
    console.log("=".repeat(85));

    const WEbdEXManager = await hre.ethers.getContractFactory("WEbdEXManagerV5", protocolo);
    const webdexManager = await WEbdEXManager.deploy(webdexFactory.address);
    await webdexManager.deployed();

    console.log(`\n[CONTRACT] WEbdEXManagerV5 -> ${webdexManager.address} (Gerenciador de Gerentes)`);
    updateEnv('ADDR_WEBDEX_MANAGER', webdexManager.address);

    // 7 - Token pass webdex
    console.log("\n" + "=".repeat(85));
    console.log("DEPLOY DE WEBDEX TOKEN");
    console.log("=".repeat(85));

    const WEbdEX = await hre.ethers.getContractFactory("webdex", protocolo);
    const webdexToken = await WEbdEX.deploy();
    await webdexToken.deployed();

    console.log(`\n[CONTRACT] WEbdEX -> ${webdexToken.address} (Token Principal)`);
    updateEnv('ADDR_WEBDEX_TOKEN', webdexToken.address);

    // 8 - MockUSDT
    console.log("\n" + "=".repeat(85));
    console.log("DEPLOY DE MOCKUSDT");
    console.log("=".repeat(85));

    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT", protocolo);
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.deployed();

    console.log(`\n[CONTRACT] MockUSDT -> ${mockUSDT.address} (Token de Teste)`);
    updateEnv('ADDR_MOCK_USDT', mockUSDT.address);


    // 9 - inicia o ambiente
    // Fee tiers vazio inicialmente
    console.log("\n" + "=".repeat(85));
    console.log("CONFIGURAÇÕES INICIAIS");
    console.log("=".repeat(85));

    const feeTiers = [
        {
            limit: hre.ethers.utils.parseUnits("1000000000", 6),
            fee: "9630000"
        }
    ];

    await webdexFactory.addBot(
        "WEbdEX Local",                 // name
        "WDX",                         // prefix
        protocolo.address,             // owner
        webdexManager.address,         // contractAddress (Manager)
        webdexstrategies.address,      // strategyAddress
        webdexSubAccounts.address,     // subAccountAddress
        webdexPayments.address,        // paymentsAddress
        webdexToken.address,           // tokenPassAddress
        webdexNetwork.address,         // networkAddress
        100,                           // feeWithdrawNetwork (ex: 1.00%)
        protocolo.address,             // feeCollectorNetworkAddress
        feeTiers                       // newFeeTiers
    );

    console.log(`\n[SETUP] addBot executado com sucesso`);

    await webdexFactory.currencyAllow(
        webdexManager.address,
        mockUSDT.address
    );

    console.log("[SETUP] MockUSDT autorizado");

    // 10 - vincula estrategia
    console.log("\n" + "=".repeat(85));
    console.log("VINCULAR ESTRATÉGIA");
    console.log("=".repeat(85));

    await webdexFactory.addStrategy(
        "Conservative",
        "CONS",
        webdexManager.address
    );

    console.log("[SETUP] Estratégia 'Conservative' adicionada");

    const strategies = await webdexManager.getStrategies();
    // console.log(strategies);

    updateEnv("ADDR_STRATEGY_CONSERVATIVE", strategies[0].tokenAddress);

    console.log("\n✅ DEPLOY E CONFIGURAÇÕES INICIAIS CONCLUÍDAS COM SUCESSO!");

    // 11 - vincula um executor à whitelist do payments (executor1)
    console.log("\n" + "=".repeat(85));
    console.log("VINCULAR EXECUTOR");
    console.log("=".repeat(85));

    console.log("\n👤 OWNER      :", protocolo.address);
    console.log("🤖 EXECUTOR 1 :", executor1.address);

    // Payments conectado como owner
    const payments = await hre.ethers.getContractAt(
        "WEbdEXPaymentsV5",
        webdexPayments.address,
        protocolo
    );

    console.log("\n🔗 Adicionando executor à whitelist...");

    const tx = await payments.addAddressToWhitelist(
        webdexManager.address,
        executor1.address
    );

    const receipt = await tx.wait();

    console.log("\n✅ EXECUTOR VINCULADO");
    console.log("🆔 TX HASH:", receipt.transactionHash);
}

main().catch((error) => {
    console.error("\n❌ ERRO DURANTE O DEPLOY:");
    console.error(error);
    process.exit(1);
});