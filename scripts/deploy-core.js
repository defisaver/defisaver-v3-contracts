const { deployContract, deployAsOwner } = require('./utils/deployer');
const { start } = require('./utils/starter');

const { changeConstantInFiles } = require('./utils/utils');

const { redeploy } = require('../test/utils');

async function main() {
    const proxyAuth = await deployContract('ProxyAuth');
    const reg = await deployAsOwner('DFSRegistry');

    // await changeConstantInFiles(
    //     './contracts',
    //     ['StrategyExecutor'],
    //     'PROXY_AUTH_ADDR',
    //     proxyAuth.address,
    // );

    // await run('compile');

    // await redeploy('StrategyExecutor');
    // await redeploy('SubscriptionProxy');
    // await redeploy('Subscriptions');
    // await redeploy('RecipeExecutor');

    // // mcd actions
    await redeploy('McdSupply', reg.address);
    await redeploy('McdWithdraw', reg.address);
    await redeploy('McdGenerate', reg.address);
    await redeploy('McdPayback', reg.address);
    await redeploy('McdOpen', reg.address);
    await redeploy('McdGive', reg.address);
    await redeploy('McdMerge', reg.address);

    // // aave actions
    // await redeploy('AaveSupply');
    // await redeploy('AaveWithdraw');
    // await redeploy('AaveBorrow');
    // await redeploy('AavePayback');

    // // comp actions
    // await redeploy('CompSupply');
    // await redeploy('CompWithdraw');
    // await redeploy('CompBorrow');
    // await redeploy('CompPayback');
    // await redeploy('CompClaim');

    // // util actions
    // await redeploy('PullToken');
    // await redeploy('SendToken');
    // await redeploy('SumInputs');
    // await redeploy('WrapEth');
    // await redeploy('UnwrapEth');

    // // exchange actions
    // await redeploy('DFSSell');

    // // flashloan actions
    // await redeploy('FLDyDx');
    // await redeploy('FLAaveV2');

    // // uniswap
    // await redeploy('UniSupply');
    // await redeploy('UniWithdraw');
}

start(main);
