const hre = require('hardhat');
const { expect } = require('chai');

const dfs = require('@defisaver/sdk');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    formatExchangeObj,
    WETH_ADDRESS,
    depositToWeth,
    approve,
    YEARN_REGISTRY_ADDRESS,
    balanceOf,
} = require('../utils');

const {
    createStrategy,
    addBotCaller,
    setMCDPriceVerifier,
} = require('../utils-strategies');

const { getRatio } = require('../utils-mcd');

const { subMcdRepayStrategy, callMcdRepayFromYearnStrategy } = require('../strategies');

const { openVault, yearnSupply } = require('../actions');

describe('Mcd-Repay-Strategy', function () {
    this.timeout(120000);

    let senderAcc;
    let proxy;
    let botAcc;
    let strategyExecutor;
    let subId;
    let vaultId;
    let mcdView;
    let mcdRatioTriggerAddr;
    let strategySub;
    let yearnRegistry;

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
        await redeploy('YearnSupply');
        await redeploy('YearnWithdraw');
        await addBotCaller(botAcc.address);

        await setMCDPriceVerifier(mcdRatioTriggerAddr);
        yearnRegistry = await hre.ethers.getContractAt('IYearnRegistry', YEARN_REGISTRY_ADDRESS);

        proxy = await getProxy(senderAcc.address);
    });

    const createRepayStrategy = () => {
        const repayStrategy = new dfs.Strategy('McdRepayStrategy');

        repayStrategy.addSubSlot('&vaultId', 'uint256');
        repayStrategy.addSubSlot('&targetRatio', 'uint256');

        const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
        repayStrategy.addTrigger(mcdRatioTrigger);

        const yearnWithdrawAction = new dfs.actions.yearn.YearnWithdrawAction(
            '%yWETHAddr',
            '%amount',
            '&eoa',
            '&proxy',
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

        repayStrategy.addAction(yearnWithdrawAction);
        repayStrategy.addAction(feeTakingAction);
        repayStrategy.addAction(sellAction);
        repayStrategy.addAction(mcdPaybackAction);

        return repayStrategy.encodeForDsProxyCall();
    };

    it('... should create repay strategy using yearn funds', async () => {
        const repayStrategyEncoded = createRepayStrategy();

        await createStrategy(proxy, ...repayStrategyEncoded, true);
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
            proxy, bundleId, vaultId, ratioUnder, targetRatio, false,
        ));
    });

    it('... should trigger a maker repay strategy', async () => {
        await depositToWeth(hre.ethers.utils.parseUnits('1', 18));

        await approve(WETH_ADDRESS, proxy.address);

        await yearnSupply(WETH_ADDRESS, hre.ethers.utils.parseUnits('1', 18), senderAcc.address, senderAcc.address, proxy);

        const yToken = await yearnRegistry.latestVault(WETH_ADDRESS);
        const yTokenBalanceBefore = await balanceOf(yToken, senderAcc.address);
        console.log(yTokenBalanceBefore.toString());

        await approve(yToken, proxy.address);

        const ratioBefore = await getRatio(mcdView, vaultId);
        const repayAmount = yTokenBalanceBefore.mul(5).div(100);

        await callMcdRepayFromYearnStrategy(
            botAcc, strategyExecutor, 0, subId, strategySub, yToken, repayAmount,
        );

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioAfter).to.be.gt(ratioBefore);
    });
});
