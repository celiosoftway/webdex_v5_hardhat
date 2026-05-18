// scripts/step3.js
// Remove liquidez normal via wallet + pause antes
// npm run step3

const hre = require("hardhat");
const { getEnv } = require("./utils/env.js");

const ADDR_USUARIO1 = getEnv("ADDR_USUARIO1");
const ADDR_WEBDEX_MANAGER = getEnv("ADDR_WEBDEX_MANAGER");
const ADDR_MOCK_USDT = getEnv("ADDR_MOCK_USDT");
const ADDR_WEBDEX_SUB_ACCOUNTS = getEnv("ADDR_WEBDEX_SUB_ACCOUNTS");
const ADDR_LP_USDT = getEnv("ADDR_LP_USDT");
const ADDR_STRATEGY_CONSERVATIVE = getEnv("ADDR_STRATEGY_CONSERVATIVE");

async function main() {
  const signers = await hre.ethers.getSigners();

  const usuario1 = signers.find(
    s => s.address.toLowerCase() === ADDR_USUARIO1.toLowerCase()
  );

  if (!usuario1) {
    throw new Error("Usuario1 não encontrado.");
  }

  const manager = await hre.ethers.getContractAt(
    "WEbdEXManagerV5",
    ADDR_WEBDEX_MANAGER,
    usuario1
  );

  const usdt = await hre.ethers.getContractAt(
    "MockUSDT",
    ADDR_MOCK_USDT
  );

  const lp = await hre.ethers.getContractAt(
    "LPToken",
    ADDR_LP_USDT,
    usuario1
  );

  const amount = hre.ethers.utils.parseUnits("1000", 6);

  console.log("\n" + "=".repeat(85));
  console.log("📤 STEP 3 - REMOÇÃO NORMAL VIA WALLET");
  console.log("=".repeat(85));

  const info = await manager.getInfoUser();
  const subId = info.SubAccounts[0].id;

  console.log("Conta:", info.SubAccounts[0].name);
  console.log("ID   :", subId);

  // =========================
  // SNAPSHOT ANTES
  // =========================
  console.log("\n💰 ANTES");
  console.log(
    "USDT Usuario1 :",
    hre.ethers.utils.formatUnits(
      await usdt.balanceOf(ADDR_USUARIO1),
      6
    )
  );

  console.log(
    "LP Usuario1   :",
    hre.ethers.utils.formatUnits(
      await lp.balanceOf(ADDR_USUARIO1),
      6
    )
  );

  console.log(
    "USDT Contrato :",
    hre.ethers.utils.formatUnits(
      await usdt.balanceOf(ADDR_WEBDEX_SUB_ACCOUNTS),
      6
    )
  );

  // =========================
  // PAUSE
  // =========================
  console.log("\n⏸️ Pausando posição...");

  const txPause = await manager.togglePause(
    [subId],
    ADDR_STRATEGY_CONSERVATIVE,
    ADDR_MOCK_USDT,
    true
  );

  await txPause.wait();

  console.log("✅ Posição pausada.");

  // =========================
  // APPROVE LP
  // =========================
  await lp.approve(
    ADDR_WEBDEX_MANAGER,
    amount
  );

  console.log("✅ LP aprovado.");

  // =========================
  // REMOVE
  // =========================
  const tx = await manager.LiquidityRemove(
    [subId],
    ADDR_STRATEGY_CONSERVATIVE,
    ADDR_MOCK_USDT,
    amount
  );

  console.log("TX Remove:", tx.hash);
  await tx.wait();

  console.log("✅ Liquidez removida.");

  // =========================
  // SNAPSHOT DEPOIS
  // =========================
  console.log("\n💰 DEPOIS");
  console.log(
    "USDT Usuario1 :",
    hre.ethers.utils.formatUnits(
      await usdt.balanceOf(ADDR_USUARIO1),
      6
    )
  );

  console.log(
    "LP Usuario1   :",
    hre.ethers.utils.formatUnits(
      await lp.balanceOf(ADDR_USUARIO1),
      6
    )
  );

  console.log(
    "USDT Contrato :",
    hre.ethers.utils.formatUnits(
      await usdt.balanceOf(ADDR_WEBDEX_SUB_ACCOUNTS),
      6
    )
  );
}

main().catch((error) => {
  console.error("\n❌ ERRO:");
  console.error(error);
  process.exit(1);
});