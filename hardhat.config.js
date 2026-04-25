require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.28", settings: { optimizer: { enabled: true, runs: 200 },viaIR: true } },
      { version: "0.6.6" },
      { version: "0.5.16" }
    ]
  },
  networks: {
    hardhat: {
      chainId: 137,
      allowUnlimitedContractSize: true
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    polygon: {
      url: process.env.ALCHEMY_URL,
      accounts: process.env.PRIVATE_KEYS.split(",")
    }
  }
};