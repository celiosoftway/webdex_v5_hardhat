const hre = require('hardhat');
const { updateEnv, getEnv } = require('./env.js');

const ADDR_WEBDEX_PAYMENTS = getEnv("ADDR_WEBDEX_PAYMENTS");
const ADDR_WEBDEX_MANAGER = getEnv("ADDR_WEBDEX_MANAGER");
const ADDR_WEBDEX_SUB_ACCOUNTS = getEnv("ADDR_WEBDEX_SUB_ACCOUNTS");
const ADDR_WEBDEX_TOKEN = getEnv("ADDR_WEBDEX_TOKEN");
const ADDR_MOCK_USDT = getEnv("ADDR_MOCK_USDT");
const ADDR_STRATEGY_CONSERVATIVE = getEnv("ADDR_STRATEGY_CONSERVATIVE");
const ADDR_USUARIO1 = getEnv("ADDR_USUARIO1");
const ADDR_LP_USDT = getEnv("ADDR_LP_USDT");

async function showDecodedEvents(receipt) {
    const map = {};

    // =====================================================
    // Endereço => nome + artifact
    // =====================================================
    map[getEnv("ADDR_WEBDEX_PAYMENTS").toLowerCase()] = {
        label: "WEBDEX_PAYMENTS",
        abi: (await hre.artifacts.readArtifact("WEbdEXPaymentsV5")).abi
    };

    map[getEnv("ADDR_WEBDEX_MANAGER").toLowerCase()] = {
        label: "WEBDEX_MANAGER",
        abi: (await hre.artifacts.readArtifact("WEbdEXManagerV5")).abi
    };

    map[getEnv("ADDR_WEBDEX_SUB_ACCOUNTS").toLowerCase()] = {
        label: "WEBDEX_SUB_ACCOUNTS",
        abi: (await hre.artifacts.readArtifact("WEbdEXSubAccountsV5")).abi
    };

    map[getEnv("ADDR_LP_USDT").toLowerCase()] = {
        label: "LP_USDT",
        abi: (await hre.artifacts.readArtifact("LPToken")).abi
    };

    // =====================================================
    // Loop logs
    // =====================================================
    console.log("\n📦 EVENTOS");

    for (const log of receipt.logs) {
        const addr = log.address.toLowerCase();
        const item = map[addr];

        console.log("-".repeat(60));

        if (!item) {
            console.log(`Address: ${log.address}`);
            console.log("Contrato: Desconhecido");
            console.log("Event   : Sem ABI");
            continue;
        }

        const iface = new hre.ethers.utils.Interface(item.abi);

        try {
            const parsed = iface.parseLog(log);

            console.log(
                `Address: ${log.address} (${item.label})`
            );

            console.log("Event  :", parsed.name);

            for (const key of Object.keys(parsed.args)) {
                if (!isNaN(key)) continue;

                const val = parsed.args[key];

                console.log(
                    `${key}:`,
                    val.toString ? val.toString() : val
                );
            }

        } catch (err) {
            console.log(`Address: ${log.address} (${item.label})`);
            console.log("Event  : Não decodificado");
        }
    }
}

module.exports = { showDecodedEvents };
