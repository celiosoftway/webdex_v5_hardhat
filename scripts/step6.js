/// TESTE EIP-7702 - DELEGAÇÃO DE EXECUÇÃO PARA UM CONTRATO GENÉRICO

const { ethers, network, artifacts } = require("hardhat");
const { getEnv } = require("./utils/env.js");
require("dotenv").config();

async function main() {
  const [owner, , , , destino] = await ethers.getSigners();

  const SUB = getEnv("ADDR_WEBDEX_SUB_ACCOUNTS");
  const USDT = getEnv("ADDR_MOCK_USDT");

  const usdt = await ethers.getContractAt("MockUSDT", USDT);

  const amount = ethers.utils.parseUnits("1000", 6);

  console.log("\n=== TESTE EIP-7702 COMPLETO ===");

  await usdt.mint(SUB, amount);

  console.log("Antes:");
  console.log("SUB :", (await usdt.balanceOf(SUB)).toString());
  console.log("DEST:", (await usdt.balanceOf(destino.address)).toString());

  // deploy executor
  const Factory = await ethers.getContractFactory("GenericExecutor");
  const executor = await Factory.deploy();
  await executor.deployed();

  console.log("Executor:", executor.address);

  // network info
  const net = await ethers.provider.getNetwork();
  const chainId = net.chainId;

  const txNonce = await ethers.provider.getTransactionCount(owner.address);
  const authNonce = 0;

  // assinatura da autorização
  const authSig = await owner._signTypedData(
    {
      name: "EIP-7702",
      version: "1",
      chainId,
      verifyingContract: SUB
    },
    {
      Authorization: [
        { name: "chainId", type: "uint256" },
        { name: "address", type: "address" },
        { name: "nonce", type: "uint256" }
      ]
    },
    {
      chainId,
      address: executor.address,
      nonce: authNonce
    }
  );

  const sig = ethers.utils.splitSignature(authSig);

  // =========================
  // TX 1 - DELEGAÇÃO
  // =========================
  const txHash = await network.provider.send("eth_sendTransaction", [
    {
      from: owner.address,
      to: owner.address,
      value: "0x0",
      gas: "0x0f4240",
      nonce: ethers.utils.hexlify(txNonce),
      data: "0x",

      authorizationList: [
        {
          chainId: ethers.utils.hexlify(chainId),
          address: executor.address,
          nonce: ethers.utils.hexlify(authNonce),
          yParity: ethers.utils.hexlify(sig.recoveryParam),
          r: sig.r,
          s: sig.s
        }
      ]
    }
  ]);

  console.log("TX Delegação:", txHash);

  await ethers.provider.waitForTransaction(txHash);

  console.log("Delegação enviada.");

  // =========================
  // TX 2 - CHAMADA REAL
  // =========================
  const artifact = await artifacts.readArtifact("GenericExecutor");

  const subAsExecutor = new ethers.Contract(
    SUB,
    artifact.abi,
    owner
  );

  const tx2 = await subAsExecutor.execute(
    USDT,
    destino.address,
    amount,
    { gasLimit: 800000 }
  );

  console.log("TX Execute:", tx2.hash);

  await tx2.wait();

  console.log("\nDepois:");
  console.log("SUB :", (await usdt.balanceOf(SUB)).toString());
  console.log("DEST:", (await usdt.balanceOf(destino.address)).toString());
}

main().catch(console.error);

/*
const { ethers, network, artifacts } = require("hardhat");
const { getEnv } = require("./utils/env.js");
require("dotenv").config();

async function main() {
  const [owner, , , , destino] = await ethers.getSigners();

  const SUB = getEnv("ADDR_WEBDEX_SUB_ACCOUNTS");
  const USDT = getEnv("ADDR_MOCK_USDT");

  const usdt = await ethers.getContractAt("MockUSDT", USDT);

  const amount = ethers.utils.parseUnits("1000", 6);

  console.log("\n=== TESTE EIP-7702 ===");

  // saldo no endereço alvo
  await usdt.mint(SUB, amount);

  console.log("Antes:");
  console.log("SUB :", (await usdt.balanceOf(SUB)).toString());
  console.log("DEST:", (await usdt.balanceOf(destino.address)).toString());

  // bytecode/abi do executor
  const artifact = await artifacts.readArtifact("GenericExecutor");

  // deploy executor real (implementação)
  const Factory = await ethers.getContractFactory("GenericExecutor");
  const executor = await Factory.deploy();
  await executor.deployed();

  const executorAddress = await executor.address;

  console.log("Executor:", executorAddress);

  // -------------------------------------------------
  // EIP-7702 AUTHORIZATION
  // -------------------------------------------------
  // owner autoriza o endereço SUB a delegar para executorAddress
  // OBS: alguns ambientes usam campos diferentes.
  // Este formato funciona em stacks compatíveis recentes.
  // -------------------------------------------------

  const chainId = (await ethers.provider.getNetwork()).chainId;
  const nonce = await ethers.provider.getTransactionCount(SUB);

  const authorization = {
    chainId,
    address: executorAddress,
    nonce
  };

  // envia tx "vazia" com authorizationList
  // assinada pelo owner (ou signer autorizado no ambiente local)
  const tx = await owner.sendTransaction({
    to: SUB,
    value: 0,
    gasLimit: 1_000_000,
    authorizationList: [authorization]
  });

  await tx.wait();

  console.log("Delegação aplicada.");

  // -------------------------------------------------
  // Agora SUB se comporta como executor delegado
  // -------------------------------------------------

  const subAsExecutor = new ethers.Contract(
    SUB,
    artifact.abi,
    owner
  );

  const tx2 = await subAsExecutor.execute(
    USDT,
    destino.address,
    amount,
    { gasLimit: 800000 }
  );

  await tx2.wait();

  console.log("\nDepois:");
  console.log("SUB :", (await usdt.balanceOf(SUB)).toString());
  console.log("DEST:", (await usdt.balanceOf(destino.address)).toString());
}

main().catch(console.error);
*/