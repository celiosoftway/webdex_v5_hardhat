const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.providers.JsonRpcProvider(
  process.env.RPC_1
);

async function main() {
  const hash = '0x99990f4ff88ca4533971396360310d7b31ba02cc3673937a4379048237266f66';
  const receipt = await provider.getTransactionReceipt(hash);
  console.log(receipt.logs);


  const sigs = [
    "networkWithdraw(address,uint256)",
    "rebalancePosition(address,int256,uint256,address,uint256)",
    "addLiquidity(address,string,address,uint256,address)",
    "removeLiquidity(address,string,address,uint256,address)",
    "payFee(address,address,string,address,uint256)"
  ];

  for (const s of sigs) {
    console.log(
      s,
      ethers.utils.id(s).slice(0, 10)
    );
  }

  const usdtAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
  const subAccount = "0x6995077c49d920d8516af7b87a38fdac5e2c957c";
  const zeroExSpender = "0x216b4B4Ba9F3e719726886d34a177484278BfcaE"; // Spender padrão do 0x no Polygon

  const usdt = await ethers.getContractAt([
    "function allowance(address owner, address spender) view returns (uint256)"
  ], usdtAddress);

  const allowance = await usdt.allowance(subAccount, zeroExSpender);
  console.log("VALOR DO ALLOWANCE:", allowance.toString());

}

main().catch(console.error);