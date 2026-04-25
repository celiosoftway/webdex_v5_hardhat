// =====================================================
// STEP 3 - OpenPosition Contábil Completo
// =====================================================
const hre = require('hardhat');
const { updateEnv, getEnv } = require('./utils/env.js');
const { showDecodedEvents } = require('./utils/util.js');


const ADDR_WEBDEX_PAYMENTS = getEnv("ADDR_WEBDEX_PAYMENTS");
const ADDR_WEBDEX_MANAGER = getEnv("ADDR_WEBDEX_MANAGER");
const ADDR_WEBDEX_SUB_ACCOUNTS = getEnv("ADDR_WEBDEX_SUB_ACCOUNTS");
const ADDR_WEBDEX_TOKEN = getEnv("ADDR_WEBDEX_TOKEN");
const ADDR_MOCK_USDT = getEnv("ADDR_MOCK_USDT");
const ADDR_STRATEGY_CONSERVATIVE = getEnv("ADDR_STRATEGY_CONSERVATIVE");
const ADDR_USUARIO1 = getEnv("ADDR_USUARIO1");
const ADDR_LP_USDT = getEnv("ADDR_LP_USDT");

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

async function step3OpenPosition() {
    console.log("\n" + "=".repeat(85));
    console.log("\n" + "=".repeat(85));
    console.log("📊 STEP 3 - EXECUÇÃO DE OPEN POSITION - MANAGER EXECUTOR");

    const [protocolo, executor, usuario1] = await hre.ethers.getSigners();

    const payments = await hre.ethers.getContractAt(
        "WEbdEXPaymentsV5",
        ADDR_WEBDEX_PAYMENTS,
        protocolo
    );

    const manager = await hre.ethers.getContractAt(
        "WEbdEXManagerV5",
        ADDR_WEBDEX_MANAGER,
        usuario1
    );

    const usdt = await hre.ethers.getContractAt(
        "MockUSDT",
        ADDR_MOCK_USDT
    );

    const passToken = await hre.ethers.getContractAt(
        "webdex",
        ADDR_WEBDEX_TOKEN
    );

    console.log("\n" + "=".repeat(90));
    console.log("🚀 STEP 3 - OPEN POSITION CONTÁBIL");
    console.log("=".repeat(90));

    // -------------------------------------------------
    // BEFORE SNAPSHOT
    // -------------------------------------------------
    const before = await manager.getInfoUser();

    const sub = before.SubAccounts[0];
    const accountId = sub.id;

    if (!sub.strategies.length) {
        throw new Error("Subconta sem strategy");
    }

    const strat = sub.strategies[0];
    const bal = strat.balance[0];

    const oldBalance = bal.amount; // saldo interno atual
    const tokenDecimals = bal.decimals;

    const userUsdtBefore = await usdt.balanceOf(ADDR_USUARIO1);
    const subUsdtBefore = await usdt.balanceOf(ADDR_WEBDEX_SUB_ACCOUNTS);
    const passBefore = before.passBalance;
    const gasBefore = before.gasBalance;

    // -------------------------------------------------
    // PARÂMETROS CONTÁBEIS
    // -------------------------------------------------

    // valor base da posição
    const amount = 73248;

    // taxa fixa descoberta
    const feeExpected = hre.ethers.utils.parseUnits("0.00963", 9);

    // lucro simulado
    const simulatedProfit = hre.ethers.BigNumber.from("73248"); // 0.073248

    // gas zero como no ataque 2
    const gas = 0;

    const currencys = [
        {
            from: ADDR_MOCK_USDT,
            to: ADDR_MOCK_USDT
        }
    ];

    console.log("\n⚙️ PARÂMETROS");
    console.log("Amount :", hre.ethers.utils.formatUnits(amount, tokenDecimals));
    console.log("Fee    :", hre.ethers.utils.formatUnits(feeExpected, 9));
    console.log("Profit :", hre.ethers.utils.formatUnits(simulatedProfit, 6));
    console.log("Gas    :", gas);

    // -------------------------------------------------
    // EXECUTAR
    // -------------------------------------------------
    try {
        console.log("\n📌 BEFORE");
        await showBalances()

        const tx = await payments.openPosition(
            ADDR_WEBDEX_MANAGER,
            accountId,
            ADDR_STRATEGY_CONSERVATIVE,
            ADDR_USUARIO1,
            amount,
            currencys,
            gas,
            ADDR_MOCK_USDT,
            "BOT-LOCAL-001"
        );

        const receipt = await tx.wait();

        console.log("\n✅ OPEN POSITION EXECUTADA");
        console.log("🆔 TX HASH:", receipt.transactionHash);
        showDecodedEvents(receipt);

        //  console.log("Logs :", receipt);

    } catch (err) {
        console.log("\n❌ FALHA OPEN POSITION");
        console.log(err.reason || err.message);
        return;
    }

    // -------------------------------------------------
    // AFTER SNAPSHOT
    // -------------------------------------------------
    const after = await manager.getInfoUser();

    const subAfter = after.SubAccounts[0];
    const balAfter = subAfter.strategies[0].balance[0];

    const userUsdtAfter = await usdt.balanceOf(ADDR_USUARIO1);
    const subUsdtAfter = await usdt.balanceOf(ADDR_WEBDEX_SUB_ACCOUNTS);

    console.log("\n📌 AFTER");
    await showBalances()

    console.log("\n📈 DELTAS");

    console.log(
        "Internal Δ:",
        hre.ethers.utils.formatUnits(
            balAfter.amount.sub(oldBalance),
            tokenDecimals
        )
    );

    console.log(
        "Pass Δ:",
        hre.ethers.utils.formatUnits(
            passBefore.sub(after.passBalance),
            9
        )
    );

    console.log(
        "Gas Δ:",
        hre.ethers.utils.formatEther(
            gasBefore.sub(after.gasBalance)
        )
    );
}

async function main() {

    await step3OpenPosition();
}

main().catch((error) => {
    console.error("\n❌ ERRO STEP3:");
    console.error(error);
    process.exit(1);
});