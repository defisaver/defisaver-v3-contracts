const hre = require('hardhat');
const { expect } = require('chai');

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const { getProxy, redeploy, fetchAmountinUSDPrice, redeployRegistry } = require('../utils');

const { subTemplate, addBotCaller } = require('../utils-strategies.js');

const { getRatio } = require('../utils-mcd.js');

const { subMcdRepayStrategy, callMcdRepayStrategy } = require('../strategies');

const { openVault } = require('../actions');

const { fetchMakerAddresses } = require('../utils-mcd');

describe('Mcd-Repay', function () {
    this.timeout(120000);

    let senderAcc;
    let proxy;
    let makerAddresses;
    let botAcc;
    let strategyExecutor;
    let strategyId;
    let vaultId;
    let mcdView;
    let regAddr;

    const ethJoin = ilks[0].join;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        regAddr = await redeployRegistry();

        await redeploy('BotAuth', regAddr);
        await redeploy('ProxyAuth', regAddr);
        await redeploy('McdRatioTrigger', regAddr);
        await redeploy('McdWithdraw', regAddr);
        await redeploy('DFSSell', regAddr);
        await redeploy('McdPayback', regAddr);
        await redeploy('Subscriptions', regAddr);
        mcdView = await redeploy('McdView', regAddr);
        await redeploy('SubscriptionProxy', regAddr);
        await redeploy('RecipeExecutor', regAddr);
        await redeploy('GasFeeTaker', regAddr);
        await redeploy('McdRatioCheck', regAddr);
        strategyExecutor = await redeploy('StrategyExecutor', regAddr);

        await redeploy('McdSupply', regAddr);
        await redeploy('McdWithdraw', regAddr);
        await redeploy('McdGenerate', regAddr);
        await redeploy('McdPayback', regAddr);
        await redeploy('McdOpen', regAddr);

        await addBotCaller(regAddr, botAcc.address);

        proxy = await getProxy(senderAcc.address);

        makerAddresses = await fetchMakerAddresses();
    });

    it('... should make a new strategy', async () => {
        const name = 'McdRepayTemplate';
        const triggerIds = ['McdRatioTrigger'];
        const actionIds = ['McdWithdraw', 'GasFeeTaker', 'DFSSell', 'McdPayback', 'McdRatioCheck'];

        const paramMapping = [
            [128, 0, 0, 129],
            [0, 0, 1],
            [0, 0, 2, 129, 129],
            [128, 3, 129],
            [130, 128, 0],
        ];

        const tokenData = getAssetInfo('WETH');

        console.log('Hi');

        await subTemplate(regAddr, proxy, name, triggerIds, actionIds, paramMapping);

        vaultId = await openVault(
            makerAddresses,
            proxy,
            ethJoin,
            tokenData,
            fetchAmountinUSDPrice('WETH', '16000'),
            fetchAmountinUSDPrice('DAI', '8000'),
        );

        const rationUnder = hre.ethers.utils.parseUnits('2.5', '18');
        const targetRatio = hre.ethers.utils.parseUnits('2.2', '18');

        strategyId = await subMcdRepayStrategy(proxy, vaultId, rationUnder, targetRatio);
    });

    it('... should trigger a maker repay strategy', async () => {
        // const ratioBefore = await getRatio(mcdView, vaultId);
        // const repayAmount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '800'), '18');

        // await callMcdRepayStrategy(botAcc, strategyExecutor, strategyId, ethJoin, repayAmount);

        // const ratioAfter = await getRatio(mcdView, vaultId);

        // console.log(
        //     `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        // );

        // expect(ratioAfter).to.be.gt(ratioBefore);
    });
});
