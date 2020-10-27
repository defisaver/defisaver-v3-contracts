

const { deployContract } = require("./utils/deployer");
const { start } = require('./utils/starter');

const { changeConstantInFiles } = require('./utils/utils');

async function main() {
    const registry = await deployContract("DFSRegistry");

    await changeConstantInFiles(
        "./contracts",
        ["StrategyExecutor", "ActionManager", "ActionExecutor", "ActionBase"],
        "REGISTRY_ADDR",
         registry.address
    );

    await run("compile");

    const strategyExecutor = await deployContract("StrategyExecutor");
    const subscriptionProxy = await deployContract("SubscriptionProxy");
    const subscriptions = await deployContract("Subscriptions");
    const actionExecutor = await deployContract("ActionExecutor");
    const actionManager = await deployContract("ActionManager");

    await registry.changeInstant(ethers.utils.keccak256(['StrategyExecutor']), strategyExecutor.address);
    await registry.changeInstant(ethers.utils.keccak256(['SubscriptionProxy']), subscriptionProxy.address);
    await registry.changeInstant(ethers.utils.keccak256(['Subscriptions']), subscriptions.address);
    await registry.changeInstant(ethers.utils.keccak256(['ActionExecutor']), actionExecutor.address);
    await registry.changeInstant(ethers.utils.keccak256(['ActionManager']), actionManager.address);

    // Actions deployment
    const flTaker = await deployContract("FLTaker");
    const dfsSell = await deployContract("DfsSell");
    const mcdGenerate = await deployContract("McdGenerate");
    const mcdPayback = await deployContract("McdPayback");
    const mcdSupply = await deployContract("McdSupply");
    const mcdWithdraw = await deployContract("McdWithdraw");

    await registry.changeInstant(ethers.utils.keccak256(['FLTaker']), flTaker.address);
    await registry.changeInstant(ethers.utils.keccak256(['DfsSell']), dfsSell.address);
    await registry.changeInstant(ethers.utils.keccak256(['McdGenerate']), mcdGenerate.address);
    await registry.changeInstant(ethers.utils.keccak256(['McdPayback']), mcdPayback.address);
    await registry.changeInstant(ethers.utils.keccak256(['McdSupply']), mcdSupply.address);
    await registry.changeInstant(ethers.utils.keccak256(['McdWithdraw']), mcdWithdraw.address);
}

start(main);
