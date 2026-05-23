// npx hardhat run scripts/logs.js --network localhost

const hre = require("hardhat");
const { getEnv } = require("@zeitnotbr/envjs");
const { EventMonitor } = require("@zeitnotbr/hardhat-watch");
// require("dotenv").config();

async function main() {

    const monitor =
        new EventMonitor(hre);

    await monitor.autoRegister();

    monitor.start();

    await new Promise(() => { });
}

main();