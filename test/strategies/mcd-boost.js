const hre = require('hardhat');
const { expect } = require('chai');

const dfs = require('@defisaver/sdk');

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const {
    getProxy, redeploy, fetchAmountinUSDPrice, formatExchangeObj,
} = require('../utils');

const { createStrategy, addBotCaller } = require('../utils-strategies.js');

const { getRatio } = require('../utils-mcd.js');

const { subMcdBoostStrategy, callMcdBoostStrategy } = require('../strategies');

const { openVault } = require('../actions');

const { fetchMakerAddresses } = require('../utils-mcd');

describe('Mcd-Boost-Strategy', function () {
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
        await redeploy('ProxyAuth');
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

    it('... should make a new Mcd Boost strategy', async () => {
        const tokenData = getAssetInfo('WETH');
        vaultId = await openVault(
            makerAddresses,
            proxy,
            ethJoin,
            tokenData,
            fetchAmountinUSDPrice('WETH', '25000'),
            fetchAmountinUSDPrice('DAI', '12000'),
        );

        console.log('VaultId: ', vaultId);

        const mcdBoostStrategy = new dfs.Strategy('MakerBoostStrategy');
        mcdBoostStrategy.addSubSlot('&vaultId', 'uint256');
        mcdBoostStrategy.addSubSlot('&proxy', 'address');
        mcdBoostStrategy.addSubSlot('&targetRatio', 'uint256');

        const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
        mcdBoostStrategy.addTrigger(mcdRatioTrigger);

        const generateAction = new dfs.actions.maker.MakerGenerateAction(
            '&vaultId',
            '%generateAmount',
            '&proxy',
            '%managerAddr',
        );

        const sellAction = new dfs.actions.basic.SellAction(
            formatExchangeObj(
                '%daiAddr',
                '%wethAddr',
                '$1',
                '%wrapper',
            ),
            '&proxy',
            '&proxy',
        );

        const feeTakingAction = new dfs.actions.basic.GasFeeAction(
            '0', '%wethAddr', '$2',
        );

        const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(
            '&vaultId', // vaultId
            '$3', // amount
            '%ethJoin',
            '&proxy', // proxy
            '%mcdManager',
        );

        const mcdRatioCheckAction = new dfs.actions.checkers.MakerRatioCheckAction(
            '&targetRatio', // targetRatio
            '&vaultId', // vaultId
            '%nextPrice', // nextPrice
        );

        mcdBoostStrategy.addAction(generateAction);
        mcdBoostStrategy.addAction(sellAction);
        mcdBoostStrategy.addAction(feeTakingAction);
        mcdBoostStrategy.addAction(mcdSupplyAction);
        mcdBoostStrategy.addAction(mcdRatioCheckAction);

        const callData = mcdBoostStrategy.encodeForDsProxyCall();

        await createStrategy(proxy, ...callData);

        const rationOver = hre.ethers.utils.parseUnits('1.7', '18');
        const targetRatio = hre.ethers.utils.parseUnits('2', '18');

        strategyId = await subMcdBoostStrategy(proxy, vaultId, rationOver, targetRatio);
    });

    it('... should trigger a maker boost strategy', async () => {
        const ratioBefore = await getRatio(mcdView, vaultId);
        const boostAmount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('DAI', '400'), '18');

        await callMcdBoostStrategy(botAcc, strategyExecutor, strategyId, ethJoin, boostAmount);

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioBefore).to.be.gt(ratioAfter);
    });
});
