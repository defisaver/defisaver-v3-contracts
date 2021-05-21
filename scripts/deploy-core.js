const { deployContract } = require('./utils/deployer');
const { start } = require('./utils/starter');

const { changeConstantInFiles } = require('./utils/utils');

const { redeploy } = require('../test/utils');

async function main() {
    const proxyAuth = await deployContract('ProxyAuth');

    await changeConstantInFiles(
        './contracts',
        ['StrategyExecutor'],
        'PROXY_AUTH_ADDR',
        proxyAuth.address,
    );

    await run('compile');

    // await redeploy('StrategyExecutor');
    // await redeploy('SubscriptionProxy');
    // await redeploy('Subscriptions');
    // await redeploy('TaskExecutor');

    // // mcd actions
    // await redeploy('McdSupply');
    // await redeploy('McdWithdraw');
    // await redeploy('McdGenerate');
    // await redeploy('McdPayback');
    // await redeploy('McdOpen');
    // await redeploy('McdGive');
    // await redeploy('McdMerge');

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
    // await redeploy('DFSBuy');

    // // flashloan actions
    // await redeploy('FLDyDx');
    // await redeploy('FLAaveV2');

    // // uniswap
    // await redeploy('UniSupply');
    // await redeploy('UniWithdraw');
}

start(main);
