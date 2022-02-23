const hre = require('hardhat');
const { expect } = require('chai');

const { ilks } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    openStrategyAndBundleStorage,
} = require('../utils');

const {
    createStrategy,
    createBundle,
    addBotCaller,
    setMCDPriceVerifier,
} = require('../utils-strategies');

const { getRatio } = require('../utils-mcd');

const { callMcdRepayStrategy, callFLMcdRepayStrategy } = require('../strategy-calls');
const { subMcdRepayStrategy } = require('../strategy-subs');
const { createRepayStrategy, createFLRepayStrategy } = require('../strategies');

const { openVault } = require('../actions');

describe('Mcd-Repay-Strategy', function () {
    this.timeout(120000);

    let senderAcc;
    let proxy;
    let botAcc;
    let flDyDx;
    let strategyExecutor;
    let subId;
    let vaultId;
    let mcdView;
    let mcdRatioTriggerAddr;
    let strategySub;
    let bundleId;

    const ethJoin = ilks[0].join;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        mcdRatioTriggerAddr = (await redeploy('McdRatioTrigger')).address;
        await redeploy('DFSSell');
        await redeploy('McdPayback');

        mcdView = await redeploy('McdView');

        await redeploy('GasFeeTaker');
        await redeploy('McdRatioCheck');
        strategyExecutor = await redeploy('StrategyExecutor');

        await redeploy('McdSupply');
        await redeploy('McdWithdraw');
        await redeploy('McdGenerate');
        await redeploy('McdPayback');
        await redeploy('McdOpen');
        await redeploy('McdRatio');
        flDyDx = await redeploy('FLDyDx');

        await addBotCaller(botAcc.address);

        await setMCDPriceVerifier(mcdRatioTriggerAddr);

        proxy = await getProxy(senderAcc.address);
    });

    it('... should create 2 repay strategies and create a bundle', async () => {
        const repayStrategyEncoded = createRepayStrategy();
        const flRepayStrategyEncoded = createFLRepayStrategy();

        await openStrategyAndBundleStorage();

        const strategyId1 = await createStrategy(proxy, ...repayStrategyEncoded, true);
        const strategyId2 = await createStrategy(proxy, ...flRepayStrategyEncoded, true);

        bundleId = await createBundle(proxy, [strategyId1, strategyId2]);
    });

    it('... should sub the user to a repay bundle ', async () => {
        vaultId = await openVault(
            proxy,
            'ETH-A',
            fetchAmountinUSDPrice('WETH', '40000'),
            fetchAmountinUSDPrice('DAI', '18000'),
        );

        console.log('Vault id: ', vaultId);

        const ratioUnder = hre.ethers.utils.parseUnits('3', '18');
        const targetRatio = hre.ethers.utils.parseUnits('3.2', '18');

        ({ subId, strategySub } = await subMcdRepayStrategy(
            proxy, bundleId, vaultId, ratioUnder, targetRatio, true,
        ));
    });

    it('... should trigger a maker repay strategy', async () => {
        const ratioBefore = await getRatio(mcdView, vaultId);
        const repayAmount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '800'), '18');

        await callMcdRepayStrategy(
            botAcc, strategyExecutor, 0, subId, strategySub, ethJoin, repayAmount,
        );

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioAfter).to.be.gt(ratioBefore);
    });

    it('... should trigger a maker FL repay strategy', async () => {
        const ratioBefore = await getRatio(mcdView, vaultId);
        const repayAmount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '1000'), '18');

        // eslint-disable-next-line max-len
        await callFLMcdRepayStrategy(
            botAcc, strategyExecutor, 1, subId, strategySub, flDyDx.address, ethJoin, repayAmount,
        );

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioAfter).to.be.gt(ratioBefore);
    });
});
