const hre = require('hardhat');
const { expect } = require('chai');

const dfs = require('@defisaver/sdk');

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    formatExchangeObj,
} = require('../utils');

const { createStrategy, addBotCaller } = require('../utils-strategies');

const { getRatio } = require('../utils-mcd');

const { subMcdRepayStrategy, callMcdRepayStrategy } = require('../strategies');

const { openVault } = require('../actions');

const { fetchMakerAddresses } = require('../utils-mcd');

describe('Mcd-Repay-Strategy', function () {
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
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        await redeploy('BotAuth');
        // await redeploy('ProxyAuth');
        await redeploy('McdRatioTrigger');
        await redeploy('McdWithdraw');
        await redeploy('DFSSell');
        await redeploy('McdPayback');
        await redeploy('StrategyStorage');
        await redeploy('SubStorage');
        mcdView = await redeploy('McdView');
        await redeploy('SubProxy');
        await redeploy('StrategyProxy');
        await redeploy('RecipeExecutor');
        await redeploy('GasFeeTaker');
        await redeploy('McdRatioCheck');
        strategyExecutor = await redeploy('StrategyExecutor');

        await redeploy('McdSupply');
        await redeploy('McdWithdraw');
        await redeploy('McdGenerate');
        await redeploy('McdPayback');
        await redeploy('McdOpen');

        await addBotCaller(botAcc.address);

        proxy = await getProxy(senderAcc.address);

        makerAddresses = await fetchMakerAddresses();
    });

    it('... should make a new strategy', async () => {
        const tokenData = getAssetInfo('WETH');

        vaultId = await openVault(
            makerAddresses,
            proxy,
            ethJoin,
            tokenData,
            fetchAmountinUSDPrice('WETH', '25000'),
            fetchAmountinUSDPrice('DAI', '12000'),
        );

        console.log('Vault id: ', vaultId);

        const repayStrategy = new dfs.Strategy('McdRepayStrategy');

        repayStrategy.addSubSlot('&vaultId', 'uint256');
        repayStrategy.addSubSlot('&targetRatio', 'uint256');
        repayStrategy.addSubSlot('&proxy', 'address');

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
            '&targetRatio',
            '&vaultId',
            '%nextPrice',
        );

        repayStrategy.addAction(withdrawAction);
        repayStrategy.addAction(feeTakingAction);
        repayStrategy.addAction(sellAction);
        repayStrategy.addAction(mcdPaybackAction);
        repayStrategy.addAction(mcdRatioCheckAction);

        const callData = repayStrategy.encodeForDsProxyCall();

        await createStrategy(proxy, ...callData, true);

        const rationUnder = hre.ethers.utils.parseUnits('2.6', '18');
        const targetRatio = hre.ethers.utils.parseUnits('2.2', '18');

        strategyId = await subMcdRepayStrategy(proxy, vaultId, rationUnder, targetRatio);
    });

    it('... should trigger a maker repay strategy', async () => {
        const ratioBefore = await getRatio(mcdView, vaultId);
        const repayAmount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '800'), '18');

        await callMcdRepayStrategy(botAcc, strategyExecutor, strategyId, ethJoin, repayAmount);

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioAfter).to.be.gt(ratioBefore);
    });
});
