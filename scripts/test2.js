/// TESTE EIP-7702 - DELEGAÇÃO DE EXECUÇÃO PARA UM CONTRATO GENÉRICO
// carteira delega -> backend executa

const { ethers, network, artifacts } = require("hardhat");

async function main() {
  const [user, backend, destino] = await ethers.getSigners();

  const amount = ethers.utils.parseUnits("1000", 6);

  // =====================================
  // DEPLOY TOKEN
  // =====================================
  const Token = await ethers.getContractFactory("MockUSDT");
  const token = await Token.deploy();
  await token.deployed();

  // =====================================
  // DEPLOY EXECUTOR
  // =====================================
  const Exec = await ethers.getContractFactory("GenericExecutor");
  const executor = await Exec.deploy();
  await executor.deployed();

  // saldo no USER
  await token.mint(user.address, amount);

  console.log("ANTES");
  console.log("USER   :", (await token.balanceOf(user.address)).toString());
  console.log("DEST   :", (await token.balanceOf(destino.address)).toString());

  // =====================================
  // DELEGAÇÃO
  // =====================================
  const chain = await ethers.provider.getNetwork();
  const chainId = chain.chainId;

  const authSig = await user._signTypedData(
    {
      name: "EIP-7702",
      version: "1",
      chainId,
      verifyingContract: user.address
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
      nonce: 0
    }
  );

  const sig = ethers.utils.splitSignature(authSig);

  const nonce1 = await ethers.provider.getTransactionCount(user.address);

  const txHash = await network.provider.send("eth_sendTransaction", [
    {
      from: user.address,
      to: user.address,
      value: "0x0",
      gas: "0x0f4240",
      nonce: ethers.utils.hexlify(nonce1),
      data: "0x",

      authorizationList: [
        {
          chainId: ethers.utils.hexlify(chainId),
          address: executor.address,
          nonce: "0x0",
          yParity: ethers.utils.hexlify(sig.recoveryParam),
          r: sig.r,
          s: sig.s
        }
      ]
    }
  ]);

  await ethers.provider.waitForTransaction(txHash);

  console.log("DELEGADO");

  // =====================================
  // BACKEND EXECUTA
  // =====================================
  const artifact = await artifacts.readArtifact("GenericExecutor");

  const delegated = new ethers.Contract(
    user.address,     // conta delegada
    artifact.abi,
    backend          // backend chama
  );

  const tx2 = await delegated.execute(
    token.address,
    destino.address,
    amount,
    { gasLimit: 800000 }
  );

  await tx2.wait();

  console.log("DEPOIS");
  console.log("USER   :", (await token.balanceOf(user.address)).toString());
  console.log("DEST   :", (await token.balanceOf(destino.address)).toString());
}

main().catch(console.error);