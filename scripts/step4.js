// =====================================================
// STEP 4 - OpenPosition via EXECUTOR1
// =====================================================
const hre = require('hardhat');
const { getEnv } = require('./utils/env.js');
const { showDecodedEvents } = require('./utils/util.js');

const ADDR_WEBDEX_PAYMENTS = getEnv("ADDR_WEBDEX_PAYMENTS");
const ADDR_WEBDEX_MANAGER = getEnv("ADDR_WEBDEX_MANAGER");
const ADDR_WEBDEX_SUB_ACCOUNTS = getEnv("ADDR_WEBDEX_SUB_ACCOUNTS");
const ADDR_WEBDEX_TOKEN = getEnv("ADDR_WEBDEX_TOKEN");
const ADDR_MOCK_USDT = getEnv("ADDR_MOCK_USDT");
const ADDR_STRATEGY_CONSERVATIVE = getEnv("ADDR_STRATEGY_CONSERVATIVE");
const ADDR_USUARIO1 = getEnv("ADDR_USUARIO1");
const ADDR_LP_USDT = getEnv("ADDR_LP_USDT");
const ADDR_EXECUTOR1 = getEnv("ADDR_EXECUTOR1");

// =====================================================
// SNAPSHOT
// =====================================================
async function showBalances() {
    const usdt = await hre.ethers.getContractAt(
        "MockUSDT",
        ADDR_MOCK_USDT
    );

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

// =====================================================
// STEP 4
// =====================================================
async function step4OpenPosition() {
    console.log("\n" + "=".repeat(90));
    console.log("🚀 STEP 4 - OPEN POSITION VIA EXECUTOR1");
    console.log("=".repeat(90));

    const [protocolo, executor, usuario1, executor1] =
        await hre.ethers.getSigners();

    const payments = await hre.ethers.getContractAt(
        "WEbdEXPaymentsV5",
        ADDR_WEBDEX_PAYMENTS,
        executor1
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

    // -------------------------------------------------
    // BEFORE
    // -------------------------------------------------
    const before = await manager.getInfoUser();

    const sub = before.SubAccounts[0];
    const accountId = sub.id;
    const oldBalance = sub.strategies[0].balance[0].amount;
    const tokenDecimals = sub.strategies[0].balance[0].decimals;

    const passBefore = before.passBalance;
    const gasBefore = before.gasBalance;

    const amount = "73248";
    const gas = 0;

    const currencys = [
        {
            from: ADDR_MOCK_USDT,
            to: ADDR_MOCK_USDT
        }
    ];

    console.log("\n👤 Caller:", executor1.address);
    console.log("🎯 Usuário:", ADDR_USUARIO1);
    console.log("🆔 Conta :", accountId);

    console.log("\n📌 BEFORE");
    await showBalances();

    // -------------------------------------------------
    // EXECUTA
    // -------------------------------------------------
    try {
        const tx = await payments.openPosition(
            ADDR_WEBDEX_MANAGER,
            accountId,
            ADDR_STRATEGY_CONSERVATIVE,
            ADDR_USUARIO1,
            amount,
            currencys,
            gas,
            ADDR_MOCK_USDT,
            "BOT-EXECUTOR-001"
        );

        const receipt = await tx.wait();

        console.log("\n✅ OPEN POSITION EXECUTADA");
        console.log("🆔 TX HASH:", receipt.transactionHash);

        await showDecodedEvents(receipt);

    } catch (err) {
        console.log("\n❌ FALHA OPEN POSITION");
        console.log(err.reason || err.message);
        return;
    }

    // -------------------------------------------------
    // AFTER
    // -------------------------------------------------
    const after = await manager.getInfoUser();

    const newBalance =
        after.SubAccounts[0].strategies[0].balance[0].amount;

    console.log("\n📌 AFTER");
    await showBalances();

    console.log("\n📈 DELTAS");

    console.log(
        "Internal Δ:",
        hre.ethers.utils.formatUnits(
            newBalance.sub(oldBalance),
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
    await step4OpenPosition();
}

main().catch((error) => {
    console.error("\n❌ ERRO STEP4:");
    console.error(error);
    process.exit(1);
});