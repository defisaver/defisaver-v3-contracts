const hre = require("hardhat");
const { deployContract } = require("./utils/deployer");
const { start } = require('./utils/starter');

const { changeConstantInFiles } = require('./utils/utils');

const { redeploy } = require('../test/utils');

async function main() {

    const registry = await deployContract("DFSRegistry");
    const proxyAuth = await deployContract("ProxyAuth");

    await changeConstantInFiles(
        "./contracts",
        ["StrategyExecutor"],
        "PROXY_AUTH_ADDR",
        proxyAuth.address
    );

    await run("compile");

    await redeploy("StrategyExecutor", registry.address);
    await redeploy("SubscriptionProxy", registry.address);
    await redeploy("Subscriptions", registry.address);
    await redeploy("TaskExecutor", registry.address);

}

start(main);
