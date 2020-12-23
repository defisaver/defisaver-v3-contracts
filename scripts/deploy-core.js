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

    // mcd actions
    await redeploy("McdSupply", registry.address);
    await redeploy("McdWithdraw", registry.address);
    await redeploy("McdGenerate", registry.address);
    await redeploy("McdPayback", registry.address);
    await redeploy("McdOpen", registry.address);

    // aave actions
    await redeploy("AaveSupply", registry.address);
    await redeploy("AaveWithdraw", registry.address);
    await redeploy("AaveBorrow", registry.address);
    await redeploy("AavePayback", registry.address);
    await redeploy("AavePaybackV1", registry.address);
    await redeploy("AaveWithdrawV1", registry.address);

    // comp actions
    await redeploy("CompSupply", registry.address);
    await redeploy("CompWithdraw", registry.address);
    await redeploy("CompBorrow", registry.address);
    await redeploy("CompPayback", registry.address);

    // util actions
    await redeploy("PullToken", registry.address);
    await redeploy("SendToken", registry.address);
    await redeploy("SumInputs", registry.address);

    // exchange actions
    await redeploy("DFSSell", registry.address);
    await redeploy("DFSBuy", registry.address);

    // flashloan actions
    await redeploy("FLAave", registry.address);
    await redeploy("FLDyDx", registry.address);
    await redeploy("FLAaveV2", registry.address);
    await redeploy("FLCustomAaveV2", registry.address);

}

start(main);
