const { ethers, network, artifacts } = require("hardhat");
const { getEnv } = require("./utils/env.js");
require("dotenv").config();

async function main() {
  const [owner, , usuario1, , destino] = await ethers.getSigners();

  const SUB = getEnv("ADDR_WEBDEX_SUB_ACCOUNTS");
  const USDT = getEnv("ADDR_MOCK_USDT");
  const MANAGER = getEnv("ADDR_WEBDEX_MANAGER");

  const usdt = await ethers.getContractAt("MockUSDT", USDT);
  const manager = await ethers.getContractAt("WEbdEXManagerV5", MANAGER);

  const amount = ethers.utils.parseUnits("1000", 6);

  console.log("\n=== TESTE REALISTA: CONTEXTO ALTERADO NO SUB ===");

  // saldo no contrato custodiante
  await usdt.mint(SUB, amount);

  console.log("Antes:");
  console.log("SUB:", (await usdt.balanceOf(SUB)).toString());
  console.log("DEST:", (await usdt.balanceOf(destino.address)).toString());

  // injeta executor no endereço do SUB
  const artifact = await artifacts.readArtifact("GenericExecutor");

  await network.provider.send("hardhat_setCode", [
    SUB,
    artifact.deployedBytecode
  ]);

  // owner chama o SUB
  const subAsExecutor = new ethers.Contract(
    SUB,
    artifact.abi,
    owner
  );

  const selector =
    subAsExecutor.interface.getSighash(
      "execute(address,address,uint256)"
    );

  console.log("Selector execute:", selector);

  const tx = await subAsExecutor.execute(
    USDT,
    destino.address,
    amount,
    { gasLimit: 800000 }
  );

  const receipt = await tx.wait();

  console.log("\nLogs totais:", receipt.logs.length);

  const tokenLogs = receipt.logs.filter(
    l => l.address.toLowerCase() === USDT.toLowerCase()
  );

  console.log("Logs USDT:", tokenLogs.length);

  console.log("\nDepois:");
  console.log("SUB:", (await usdt.balanceOf(SUB)).toString());
  console.log("DEST:", (await usdt.balanceOf(destino.address)).toString());

  try {
    const info = await manager.connect(usuario1).getInfoUser();
    console.log(
      "Contabilidade:",
      info.SubAccounts[0].strategies[0].balance[0].amount.toString()
    );
  } catch {}

  console.log("\nSe DEST subiu e SUB caiu sem logs internos,");
  console.log("você simulou exatamente a separação entre");
  console.log("saldo real ERC20 e sistema interno.");
}

main().catch(console.error);