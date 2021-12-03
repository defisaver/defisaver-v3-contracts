const hre = require('hardhat');
const { expect } = require('chai');

const dfs = require('@defisaver/sdk');

const { ilks } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    formatExchangeObj,
    WETH_ADDRESS,
} = require('../utils');

const {
    createStrategy,
    createBundle,
    addBotCaller,
    setMCDPriceVerifier,
} = require('../utils-strategies');

const { getRatio, getNextEthPrice } = require('../utils-mcd');

const { subMcdRepayStrategy, callMcdRepayStrategy, callFLMcdRepayStrategy } = require('../strategies');

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

    const ethJoin = ilks[0].join;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        await redeploy('BotAuth');
        await redeploy('ProxyAuth');
        mcdRatioTriggerAddr = (await redeploy('McdRatioTrigger')).address;
        await redeploy('McdWithdraw');
        await redeploy('DFSSell');
        await redeploy('McdPayback');
        await redeploy('StrategyStorage');
        await redeploy('SubStorage');
        await redeploy('BundleStorage');
        await redeploy('TempStorage');

        mcdView = await redeploy('McdView');

        await redeploy('SubProxy');
        await redeploy('StrategyProxy');
        await redeploy('RecipeExecutor');
        await redeploy('GasFeeTaker');
        await redeploy('McdRatioCheck');
        await redeploy('GasFeeTaker');
        strategyExecutor = await redeploy('StrategyExecutor');

        await redeploy('McdSupply');
        await redeploy('McdWithdraw');
        await redeploy('McdGenerate');
        await redeploy('McdPayback');
        await redeploy('McdOpen');
        flDyDx = await redeploy('FLDyDx');

        await addBotCaller(botAcc.address);

        await setMCDPriceVerifier(mcdRatioTriggerAddr);

        proxy = await getProxy(senderAcc.address);
    });

    const createRepayStrategy = () => {
        const repayStrategy = new dfs.Strategy('McdRepayStrategy');

        repayStrategy.addSubSlot('&vaultId', 'uint256');
        repayStrategy.addSubSlot('&targetRatio', 'uint256');

        const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
        repayStrategy.addTrigger(mcdRatioTrigger);

        const withdrawAction = new dfs.actions.maker.MakerWithdrawAction(
            '&vaultId',
            '%withdrawAmount',
            '%ethJoin',
            '&proxy',
            '%mcdManager',
        );

        const feeTakingAction = new dfs.actions.basic.GasFeeAction(
            '0', '%wethAddr', '$1',
        );

        const sellAction = new dfs.actions.basic.SellAction(
            formatExchangeObj(
                '%wethAddr',
                '%daiAddr',
                '$2',
                '%exchangeWrapper',
            ),
            '&proxy',
            '&proxy',
        );

        const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
            '&vaultId',
            '$3',
            '&proxy',
            '%mcdManager',
        );

        const mcdRatioCheckAction = new dfs.actions.checkers.MakerRatioCheckAction(
            '%ratioState',
            '%checkTarget',
            '&targetRatio', // targetRatio
            '&vaultId', // vaultId
            '%nextPrice', // nextPrice
        );

        repayStrategy.addAction(withdrawAction);
        repayStrategy.addAction(feeTakingAction);
        repayStrategy.addAction(sellAction);
        repayStrategy.addAction(mcdPaybackAction);
        repayStrategy.addAction(mcdRatioCheckAction);

        return repayStrategy.encodeForDsProxyCall();
    };

    const createFLRepayStrategy = () => {
        const repayStrategy = new dfs.Strategy('MakerFLRepayStrategy');

        repayStrategy.addSubSlot('&vaultId', 'uint256');
        repayStrategy.addSubSlot('&targetRatio', 'uint256');

        const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
        repayStrategy.addTrigger(mcdRatioTrigger);

        const flAction = new dfs.actions.flashloan.DyDxFlashLoanAction('%amount', WETH_ADDRESS);

        const sellAction = new dfs.actions.basic.SellAction(
            formatExchangeObj(
                '%wethAddr',
                '%daiAddr',
                '$1',
                '%exchangeWrapper',
            ),
            '&proxy',
            '&proxy',
        );

        const feeTakingAction = new dfs.actions.basic.GasFeeAction(
            '0', '%daiAddr', '$2',
        );

        const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
            '&vaultId',
            '$3',
            '&proxy',
            '%mcdManager',
        );

        const withdrawAction = new dfs.actions.maker.MakerWithdrawAction(
            '&vaultId',
            '$1',
            '%ethJoin',
            '%flAddr',
            '%mcdManager',
        );

        const mcdRatioCheckAction = new dfs.actions.checkers.MakerRatioCheckAction(
            '%ratioState',
            '%checkTarget',
            '&targetRatio', // targetRatio
            '&vaultId', // vaultId
            '%nextPrice', // nextPrice
        );

        repayStrategy.addAction(flAction);
        repayStrategy.addAction(sellAction);
        repayStrategy.addAction(feeTakingAction);
        repayStrategy.addAction(mcdPaybackAction);
        repayStrategy.addAction(withdrawAction);
        repayStrategy.addAction(mcdRatioCheckAction);

        return repayStrategy.encodeForDsProxyCall();
    };

    it('... should create 2 repay strategies and create a bundle', async () => {
        const repayStrategyEncoded = createRepayStrategy();
        const flRepayStrategyEncoded = createFLRepayStrategy();

        await createStrategy(proxy, ...repayStrategyEncoded, true);
        await createStrategy(proxy, ...flRepayStrategyEncoded, true);

        await createBundle(proxy, [0, 1]);
    });

    it('... should sub the user to a repay bundle ', async () => {
        vaultId = await openVault(
            proxy,
            'ETH-A',
            fetchAmountinUSDPrice('WETH', '25000'),
            fetchAmountinUSDPrice('DAI', '12000'),
        );

        console.log('Vault id: ', vaultId);

        const ratioUnder = hre.ethers.utils.parseUnits('3', '18');
        const targetRatio = hre.ethers.utils.parseUnits('3.2', '18');

        const bundleId = 0;
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
