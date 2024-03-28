/* eslint-disable camelcase */
const { getAssetInfo } = require('@defisaver/tokens');
const hre = require('hardhat');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { supplyAave, borrowAave } = require('../../actions');
const {
    createAaveV2BoostStrategy,
    createAaveV2RepayStrategy,
    createAaveFLV2BoostStrategy,
    createAaveFLV2RepayStrategy,
} = require('../../strategies');

const {
    callAaveV2BoostStrategy,
    callAaveV2RepayStrategy,
    callAaveFLV2BoostStrategy,
    callAaveFLV2RepayStrategy,
} = require('../../strategy-calls');

const { subAaveV2AutomationStrategy } = require('../../strategy-subs');
const {
    getContractFromRegistry,
    setNetwork,
    openStrategyAndBundleStorage,
    getProxy,
    setNewExchangeWrapper,
    fetchAmountinUSDPrice,
    approve,
    setBalance,
    redeploy,
    REGISTRY_ADDR,
    AAVE_V2_MARKET_ADDR,
    redeployCore,
} = require('../../utils');
const { createStrategy, addBotCaller, createBundle } = require('../../utils-strategies');

const VARIABLE_RATE_MODE = 2;

const createBundleAndStrategy = async (proxy) => {
    const repayAaveStrategyEncoded = createAaveV2RepayStrategy();
    const repayFLAaveStrategyEncoded = createAaveFLV2RepayStrategy();

    const boostAaveStrategyEncoded = createAaveV2BoostStrategy();
    const boostFLAaveStrategyEncoded = createAaveFLV2BoostStrategy();

    await openStrategyAndBundleStorage(false);

    const repayId1 = await createStrategy(proxy, ...repayAaveStrategyEncoded, true);
    const repayId2 = await createStrategy(proxy, ...repayFLAaveStrategyEncoded, true);

    const boostId1 = await createStrategy(proxy, ...boostAaveStrategyEncoded, true);
    const boostId2 = await createStrategy(proxy, ...boostFLAaveStrategyEncoded, true);

    const repayBundleId = await createBundle(
        proxy,
        [repayId1, repayId2],
    );

    const boostBundleId = await createBundle(
        proxy,
        [boostId1, boostId2],
    );
    await redeploy('AaveSubProxy', REGISTRY_ADDR, false, false, repayBundleId, boostBundleId);
    return { repayBundleId, boostBundleId };
};

const testPairs = [
    {
        collSymbol: 'WETH',
        debtSymbol: 'DAI',
    },
    {
        collSymbol: 'WBTC',
        debtSymbol: 'USDC',
    },
    {
        collSymbol: 'DAI',
        debtSymbol: 'WETH',
    },
];

const aaveV2BoostTest = () => describe('Aave-Boost-Strategy', function () {
    this.timeout(1000000);

    let senderAcc;
    let proxy;
    let view;

    let botAcc;
    let strategyExecutor;
    let exchangeWrapper;

    let subData;
    let flAddr;

    before(async () => {
        setNetwork('mainnet');
        [senderAcc] = await ethers.getSigners();
        proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);

        botAcc = (await ethers.getSigners())[1];
        strategyExecutor = await redeployCore();

        await redeploy('AaveBorrow');
        await redeploy('AaveSupply');
        await redeploy('AaveV2RatioTrigger');
        await redeploy('AaveV2RatioCheck');
        await redeploy('SafeModuleAuth');
        await redeploy('DFSSell');

        flAddr = await redeploy('FLAction');
        view = await getContractFromRegistry('AaveView');

        ({ address: exchangeWrapper } = await getContractFromRegistry('UniswapWrapperV3'));
        await setNewExchangeWrapper(senderAcc, exchangeWrapper);
        await addBotCaller(botAcc.address);

        await createBundleAndStrategy(proxy);
    });

    for (let i = 0; i < testPairs.length; i++) {
        const { collSymbol, debtSymbol } = testPairs[i];

        const collAsset = getAssetInfo(collSymbol);
        const debtAsset = getAssetInfo(debtSymbol);

        const collAmount = ethers.utils.parseUnits(
            fetchAmountinUSDPrice(collAsset.symbol, '20000'),
            collAsset.decimals,
        );
        const debtAmount = ethers.utils.parseUnits(
            fetchAmountinUSDPrice(debtAsset.symbol, '5000'),
            debtAsset.decimals,
        );

        console.log(collAmount.toString(), debtAmount.toString());

        it('... should make a new Aave position and sub', async () => {
            await setBalance(collAsset.address, senderAcc.address, collAmount);
            await approve(collAsset.address, proxy.address);

            await supplyAave(
                proxy,
                AAVE_V2_MARKET_ADDR,
                collAmount,
                collAsset.address,
                senderAcc.address,
            );

            await borrowAave(
                proxy,
                AAVE_V2_MARKET_ADDR,
                debtAsset.address,
                debtAmount,
                VARIABLE_RATE_MODE,
                senderAcc.address,
            );

            subData = await subAaveV2AutomationStrategy(proxy, 120, 200, 150, 150, true);
        });

        it('... should trigger a Aave Boost strategy', async () => {
            const boostAmount = debtAmount.div(20);

            const loanDataBefore = await view.getLoanData(AAVE_V2_MARKET_ADDR, proxy.address);

            console.log(loanDataBefore.ratio / 1e16);

            await callAaveV2BoostStrategy(
                botAcc,
                strategyExecutor,
                0, // strategyIndex
                subData.boostSubId,
                subData.boostSub,
                collAsset.address,
                debtAsset.address,
                boostAmount,
                exchangeWrapper,
            );

            const loanDataAfter = await view.getLoanData(AAVE_V2_MARKET_ADDR, proxy.address);

            expect(loanDataAfter.ratio).to.be.lt(loanDataBefore.ratio);
        });

        it('... should trigger a Aave FL Boost strategy', async () => {
            const boostAmount = debtAmount.div(10);

            const loanDataBefore = await view.getLoanData(AAVE_V2_MARKET_ADDR, proxy.address);

            console.log(loanDataBefore.ratio / 1e16);

            await callAaveFLV2BoostStrategy(
                botAcc,
                strategyExecutor,
                1, // strategyIndex
                subData.boostSubId,
                subData.boostSub,
                collAsset.address,
                debtAsset.address,
                boostAmount,
                exchangeWrapper,
                flAddr.address,
            );

            const loanDataAfter = await view.getLoanData(AAVE_V2_MARKET_ADDR, proxy.address);

            expect(loanDataAfter.ratio).to.be.lt(loanDataBefore.ratio);
        });
    }
});

const aaveV2RepayTest = () => describe('Aave-Repay-Strategy', function () {
    this.timeout(1000000);

    let senderAcc;
    let proxy;
    let view;

    let botAcc;
    let strategyExecutor;
    let exchangeWrapper;

    let subData;
    let flAddr;

    before(async () => {
        setNetwork('mainnet');
        [senderAcc] = await ethers.getSigners();
        proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);

        botAcc = (await ethers.getSigners())[1];
        strategyExecutor = await redeployCore();

        await redeploy('AaveWithdraw');
        await redeploy('AavePayback');
        await redeploy('AaveV2RatioTrigger');
        await redeploy('AaveV2RatioCheck');
        await redeploy('SafeModuleAuth');
        await redeploy('DFSSell');

        flAddr = await redeploy('FLAction');
        view = await getContractFromRegistry('AaveView');

        flAddr = await getContractFromRegistry('FLAction');
        view = await getContractFromRegistry('AaveView');

        ({ address: exchangeWrapper } = await getContractFromRegistry('UniswapWrapperV3'));
        await setNewExchangeWrapper(senderAcc, exchangeWrapper);
        await addBotCaller(botAcc.address);

        await createBundleAndStrategy(proxy);
    });

    for (let i = 0; i < testPairs.length; i++) {
        const { collSymbol, debtSymbol } = testPairs[i];

        const collAsset = getAssetInfo(collSymbol);
        const debtAsset = getAssetInfo(debtSymbol);

        const collAmount = ethers.utils.parseUnits(
            fetchAmountinUSDPrice(collAsset.symbol, '20000'),
            collAsset.decimals,
        );
        const debtAmount = ethers.utils.parseUnits(
            fetchAmountinUSDPrice(debtAsset.symbol, '10000'),
            debtAsset.decimals,
        );

        it('... should make a new Aave position and sub', async () => {
            await setBalance(collAsset.address, senderAcc.address, collAmount);
            await approve(collAsset.address, proxy.address);

            await supplyAave(
                proxy,
                AAVE_V2_MARKET_ADDR,
                collAmount,
                collAsset.address,
                senderAcc.address,
            );

            await borrowAave(
                proxy,
                AAVE_V2_MARKET_ADDR,
                debtAsset.address,
                debtAmount,
                VARIABLE_RATE_MODE,
                senderAcc.address,
            );

            subData = await subAaveV2AutomationStrategy(proxy, 200, 300, 250, 250, true);
        });

        it('... should trigger a Aave Repay strategy', async () => {
            const repayAmount = collAmount.div(20);

            const loanDataBefore = await view.getLoanData(AAVE_V2_MARKET_ADDR, proxy.address);

            console.log(loanDataBefore.ratio / 1e16);

            await callAaveV2RepayStrategy(
                botAcc,
                strategyExecutor,
                0, // strategyIndex
                subData.repaySubId,
                subData.repaySub,
                collAsset.address,
                debtAsset.address,
                repayAmount,
                exchangeWrapper,
            );

            const loanDataAfter = await view.getLoanData(AAVE_V2_MARKET_ADDR, proxy.address);

            expect(loanDataAfter.ratio).to.be.gt(loanDataBefore.ratio);
        });

        it('... should trigger a Aave FL Repay strategy', async () => {
            const repayAmount = collAmount.div(20);

            const loanDataBefore = await view.getLoanData(AAVE_V2_MARKET_ADDR, proxy.address);
            console.log(loanDataBefore.ratio / 1e16);

            await callAaveFLV2RepayStrategy(
                botAcc,
                strategyExecutor,
                1, // strategyIndex
                subData.repaySubId,
                subData.repaySub,
                collAsset.address,
                debtAsset.address,
                repayAmount,
                exchangeWrapper,
                flAddr.address,
            );

            const loanDataAfter = await view.getLoanData(AAVE_V2_MARKET_ADDR, proxy.address);

            expect(loanDataAfter.ratio).to.be.gt(loanDataBefore.ratio);
        });
    }
});

const aaveV2StrategiesTest = () => {
    aaveV2BoostTest();
    aaveV2RepayTest();
};

module.exports = {
    aaveV2StrategiesTest,
    aaveV2BoostTest,
    aaveV2RepayTest,
};
