

const { deployContract } = require("./utils/deployer");
const { start } = require('./utils/starter');

const { changeConstantInFiles } = require('./utils/utils');

const { redeploy } = require('../test/utils');


async function main() {

    const registry = await deployContract("DFSRegistry");
    const proxyAuth = await deployContract("ProxyAuth");

    await changeConstantInFiles(
        "./contracts",
        ["StrategyExecutor", "TaskManager", "ActionExecutor", "ActionBase", "ProxyAuth", "SubscriptionProxy"],
        "REGISTRY_ADDR",
         registry.address
    );

    await changeConstantInFiles(
        "./test",
        ["utils.js"],
        "REGISTRY_ADDR",
         registry.address
    );

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
    await redeploy("ActionExecutor", registry.address);
    await redeploy("TaskManager", registry.address);
}

start(main);
