// npm run step1

const hre = require('hardhat');
const { updateEnv, getEnv } = require('./utils/env.js');

const ADDR_PROTOCOLO = getEnv('ADDR_PROTOCOLO');
const ADDR_EXECUTOR = getEnv('ADDR_EXECUTOR');
const ADDR_USUARIO1 = getEnv('ADDR_USUARIO1');

const ADDR_WEBDEX_FACTORY = getEnv('ADDR_WEBDEX_FACTORY');
const ADDR_WEBDEX_STRATEGIES = getEnv('ADDR_WEBDEX_STRATEGIES');
const ADDR_WEBDEX_SUB_ACCOUNTS = getEnv('ADDR_WEBDEX_SUB_ACCOUNTS');
const ADDR_WEBDEX_PAYMENTS = getEnv('ADDR_WEBDEX_PAYMENTS');
const ADDR_WEBDEX_NETWORK = getEnv('ADDR_WEBDEX_NETWORK');
const ADDR_WEBDEX_MANAGER = getEnv('ADDR_WEBDEX_MANAGER');

const ADDR_WEBDEX_TOKEN = getEnv('ADDR_WEBDEX_TOKEN');
const ADDR_MOCK_USDT = getEnv('ADDR_MOCK_USDT');
const ADDR_STRATEGY_CONSERVATIVE = getEnv('ADDR_STRATEGY_CONSERVATIVE');


async function logWallet(name, role, signer) {
    const balance = await signer.getBalance();
    const eth = hre.ethers.utils.formatEther(balance);

    console.log(
        `| [${role.padEnd(10)}] ${name.padEnd(18)} : ${signer.address} | Saldo: ${Number(eth).toFixed(4)} ETH`
    );
}

// =====================================================
// FUNÇÃO AUXILIAR - Mostrar getInfoUser()
// =====================================================

async function showUserInfo(manager) {

    const info = await manager.getInfoUser();
    const strategies = await manager.getStrategies();

    const strategyMap = {};
    for (const s of strategies) {
        strategyMap[s.tokenAddress.toLowerCase()] = s.name;
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 INFO DO USUÁRIO");
    console.log("=".repeat(80));

    console.log("Manager:", info.manager);
    console.log("Gas Balance:", hre.ethers.utils.formatEther(info.gasBalance));
    console.log("Pass Balance:", info.passBalance.toString());
    console.log("Bonus Balance:", info.bonusBalance.toString());

    console.log("\n📁 SUBCONTAS");

    for (let i = 0; i < info.SubAccounts.length; i++) {
        const sub = info.SubAccounts[i];

        console.log("\n" + "-".repeat(80));
        console.log(`[${i + 1}] ${sub.name}`);
        console.log("ID:", sub.id);

        if (!sub.strategies.length) {
            console.log("Sem estratégias.");
            continue;
        }

        for (const strat of sub.strategies) {
            const stratName =
                strategyMap[strat.strategyToken.toLowerCase()] ||
                strat.strategyToken;

            console.log(`\n🎯 Estratégia: ${stratName}`);

            if (!strat.balance.length) {
                console.log("Sem saldo.");
                continue;
            }

            for (const bal of strat.balance) {
                const amount = hre.ethers.utils.formatUnits(
                    bal.amount,
                    bal.decimals
                );

                console.log(`Moeda   : ${bal.name}`);
                console.log(`Saldo   : ${amount}`);
                console.log(`Paused  : ${bal.paused}`);
                console.log(`Status  : ${bal.status}`);
                console.log(`ICO     : ${bal.ico}`);
                console.log("");
            }
        }
    }

    console.log("=".repeat(80));
}

// =====================================================
// FUNÇÃO AUXILIAR - Snapshot de Saldos
// usuario1 | USDT | LPToken | Liquidez no contrato
// =====================================================

async function showBalances() {
    const manager = await hre.ethers.getContractAt(
        "WEbdEXSubAccountsV5",
        ADDR_WEBDEX_SUB_ACCOUNTS
    );

    const usdt = await hre.ethers.getContractAt(
        "MockUSDT",
        ADDR_MOCK_USDT
    );


    const ADDR_LP_USDT = getEnv("ADDR_LP_USDT");
    const lpToken = await hre.ethers.getContractAt(
        "LPToken",
        ADDR_LP_USDT
    );

    const saldoUserUSDT = await usdt.balanceOf(ADDR_USUARIO1);
    const saldoUserLP = await lpToken.balanceOf(ADDR_USUARIO1);
    const saldoContrato = await usdt.balanceOf(ADDR_WEBDEX_SUB_ACCOUNTS);

    console.log("\n" + "=".repeat(80));
    console.log("💰 SNAPSHOT DE SALDOS");
    console.log("=".repeat(80));

    console.log(
        "USDT Usuario1 :",
        hre.ethers.utils.formatUnits(saldoUserUSDT, 6)
    );

    console.log(
        "LP Usuario1   :",
        hre.ethers.utils.formatUnits(saldoUserLP, 6)
    );

    console.log(
        "USDT Contrato :",
        hre.ethers.utils.formatUnits(saldoContrato, 6)
    );

    console.log("=".repeat(80));
}

function findUnknownAddress(events, known) {
    for (const ev of events) {
        const addr = ev.address.toLowerCase();

        if (!known.includes(addr)) {
            return ev.address;
        }
    }
    return null;
}

async function main() {
    const [protocolo, executor, usuario1] = await hre.ethers.getSigners();

    console.log("\n" + "=".repeat(85));
    console.log("\n" + "=".repeat(85));
    console.log("📊 STEP 2 - VERIFICAÇÃO DE DEPLOY E CONFIGURAÇÕES INICIAIS");

    console.log("=".repeat(85));

    // =====================================================
    // STEP 2.1 - Mintar 10.000 USDT para usuario1
    // =====================================================

    const mockUSDT = await hre.ethers.getContractAt(
        "MockUSDT",
        ADDR_MOCK_USDT,
        protocolo
    );

    const valorMint = hre.ethers.utils.parseUnits("10000", 6);

    await mockUSDT.mint(ADDR_USUARIO1, valorMint);

    const saldo = await mockUSDT.balanceOf(ADDR_USUARIO1);

    console.log("\n💰 MINT REALIZADO");
    console.log("Usuário:", ADDR_USUARIO1);
    console.log(
        "Saldo USDT:",
        hre.ethers.utils.formatUnits(saldo, 6)
    );

    // =====================================================
    // STEP 2.2 - Registrar usuario1 no protocolo
    // =====================================================

    const webdexManager = await hre.ethers.getContractAt(
        "WEbdEXManagerV5",
        ADDR_WEBDEX_MANAGER,
        usuario1
    );

    // manager = address(0) -> sem afiliado/gerente acima
    await webdexManager.register(
        hre.ethers.constants.AddressZero,
        "Principal"
    );

    console.log("\n📝 USUÁRIO REGISTRADO COM SUCESSO");
    console.log("Usuário:", ADDR_USUARIO1);

    showUserInfo(webdexManager);

    // =====================================================
    // STEP 2.4 - Criar nova subconta
    // =====================================================

    await webdexManager.createSubAccount([
        "Reserva"
    ]);

    console.log("\n🆕 SUBCONTA CRIADA");

    // Mostrar estado atualizado
    await showUserInfo(webdexManager);

    // =====================================================
    // STEP 2.5 - Adicionar 1.000 USDT na conta Principal
    // =====================================================

    // Aprovar gasto do Manager
    const valorLiquidez = hre.ethers.utils.parseUnits("1000", 6);

    await mockUSDT.connect(usuario1).approve(
        ADDR_WEBDEX_MANAGER,
        valorLiquidez
    );

    const user = await webdexManager.getInfoUser();

    const subId = user.SubAccounts[0].id;

    const strategies = await webdexManager.getStrategies();
    const strategyToken = strategies[0].tokenAddress;

    const tx = await webdexManager.LiquidityAdd(
        [subId],
        ADDR_STRATEGY_CONSERVATIVE,
        ADDR_MOCK_USDT,
        valorLiquidez
    );

    const receipt = await tx.wait();

    const known = [
        ADDR_WEBDEX_MANAGER.toLowerCase(),
        ADDR_WEBDEX_SUB_ACCOUNTS.toLowerCase(),
        ADDR_WEBDEX_PAYMENTS.toLowerCase(),
        ADDR_WEBDEX_NETWORK.toLowerCase(),
        ADDR_WEBDEX_FACTORY.toLowerCase(),
        ADDR_MOCK_USDT.toLowerCase(),
        ADDR_STRATEGY_CONSERVATIVE.toLowerCase()
    ];

    const lpAddress = findUnknownAddress(receipt.events, known);

    console.log("LPToken:", lpAddress);
    updateEnv("ADDR_LP_USDT", lpAddress);

    console.log("\n💧 LIQUIDEZ ADICIONADA: 1000 USDT em Principal");

    // Mostrar estado atualizado
    await showUserInfo(webdexManager);
    await showBalances();


    // =====================================================
    // STEP 2.X - Abastecer PASS e GAS para usuario1
    // =====================================================

    // Contratos conectados
    const webdexToken = await hre.ethers.getContractAt(
        "webdex",
        ADDR_WEBDEX_TOKEN,
        protocolo // owner do token
    );

    const webdexManagerUser = await hre.ethers.getContractAt(
        "WEbdEXManagerV5",
        ADDR_WEBDEX_MANAGER,
        usuario1
    );

    // -----------------------------------------------------
    // 1. Enviar 1 WEbdEX para usuario1
    // -----------------------------------------------------
    const valorPass = hre.ethers.utils.parseUnits("1", 9);

    await webdexToken.transfer(
        ADDR_USUARIO1,
        valorPass
    );

    console.log("\n🎫 PASS enviado para usuario1");

    // -----------------------------------------------------
    // 2. Approve + passAdd()
    // -----------------------------------------------------
    await webdexToken.connect(usuario1).approve(
        ADDR_WEBDEX_MANAGER,
        valorPass
    );

    await webdexManagerUser.passAdd(valorPass);

    console.log("🎫 PASS creditado no protocolo");

    // -----------------------------------------------------
    // 3. Adicionar GAS (0.5 ETH)
    // -----------------------------------------------------
    const valorGas = hre.ethers.utils.parseEther("0.5");

    await webdexManagerUser.gasAdd({
        value: valorGas
    });

    console.log("⛽ GAS creditado no protocolo");

    // -----------------------------------------------------
    // 4. Verificar estado atualizado
    // -----------------------------------------------------
    await showUserInfo(webdexManagerUser);
    await showUserInfo(webdexManager);
    await showBalances();
}

main().catch((error) => {
    console.error("\n❌ ERRO DURANTE O DEPLOY:");
    console.error(error);
    process.exit(1);
});