const hre = require('hardhat');
const { expect } = require('chai');

const dfs = require('@defisaver/sdk');

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const { getProxy, redeploy, fetchAmountinUSDPrice } = require('../utils');

const { subTemplate, addBotCaller } = require('../utils-strategies.js');

const { getRatio } = require('../utils-mcd.js');

const { subMcdRepayStrategy, callMcdRepayStrategy } = require('../strategies');

const { openVault } = require('../actions');

const { fetchMakerAddresses } = require('../utils-mcd');

describe('Mcd-Boost-Recipe', function () {
    this.timeout(120000);

    let senderAcc;
    let proxy;
    let makerAddresses;
    let botAcc;
    let strategyExecutor;
    let strategyId;
    let vaultId;
    let mcdView;

    const ethJoin = ilks[0].join;

    before(async () => {
        // senderAcc = (await hre.ethers.getSigners())[0];
        // botAcc = (await hre.ethers.getSigners())[1];

        // await redeploy('BotAuth');
        // await redeploy('ProxyAuth');
        // await redeploy('McdRatioTrigger');
        // await redeploy('McdWithdraw');
        // await redeploy('DFSSell');
        // await redeploy('McdPayback');
        // await redeploy('Subscriptions');
        // mcdView = await redeploy('McdView');
        // await redeploy('SubscriptionProxy');
        // await redeploy('RecipeExecutor');
        // await redeploy('GasFeeTaker');
        // await redeploy('McdRatioCheck');
        // strategyExecutor = await redeploy('StrategyExecutor');

        // await redeploy('McdSupply');
        // await redeploy('McdWithdraw');
        // await redeploy('McdGenerate');
        // await redeploy('McdPayback');
        // await redeploy('McdOpen');

        // await addBotCaller(botAcc.address);

        // proxy = await getProxy(senderAcc.address);

        // makerAddresses = await fetchMakerAddresses();
    });

    it('... should make a new strategy', async () => {
        const boostStrategy = new dfs.Strategy('McdBoostStrategy');
        boostStrategy.addSubSlot('vaultId', 'uint256');
        boostStrategy.addSubSlot('proxy', 'address');
        boostStrategy.addSubSlot('targetRatio', 'uint256');

        boostStrategy.addTrigger();

        const feeTakingAction = new dfs.actions.basic.GasFeeAction(
            '0', '0x0', '0',
        );

        boostStrategy.addAction(feeTakingAction);

        boostStrategy.print();

        // const triggerIds = ['McdRatioTrigger'];
        // const actionIds = ['McdGenerate', 'GasFeeTaker', 'DFSSell', 'McdSupply', 'McdRatioCheck'];

        // // What are the users data?
        // // template.userData('vaultId', 'uint256');
        // // template.userData('proxy', 'address');
        // // template.userData('targetRatio, 'uint256');

        // const paramMapping = [
        //     [128, 0, 0, 129],
        //     [0, 0, 1],
        //     [0, 0, 2, 129, 129],
        //     [128, 3, 129],
        //     [130, 128, 0],
        // ];

        // const tokenData = getAssetInfo('WETH');
        // vaultId = await openVault(
        //     makerAddresses,
        //     proxy,
        //     ethJoin,
        //     tokenData,
        //     fetchAmountinUSDPrice('WETH', '16000'),
        //     fetchAmountinUSDPrice('DAI', '8000'),
        // );

        // await subTemplate(proxy, name, triggerIds, actionIds, paramMapping);

        // const rationUnder = hre.ethers.utils.parseUnits('2.5', '18');
        // const targetRatio = hre.ethers.utils.parseUnits('2.2', '18');

        // strategyId = await subMcdRepayStrategy(proxy, vaultId, rationUnder, targetRatio);
    });

    // it('... should trigger a maker repay strategy', async () => {
    //     const ratioBefore = await getRatio(mcdView, vaultId);
    //     const repayAmount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '800'), '18');

    //     await callMcdRepayStrategy(botAcc, strategyExecutor, strategyId, ethJoin, repayAmount);

    //     const ratioAfter = await getRatio(mcdView, vaultId);

    //     console.log(
    //         `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
    //     );

    //     expect(ratioAfter).to.be.gt(ratioBefore);
    // });
});
