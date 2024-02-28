/* eslint-disable camelcase */
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { supplyComp, borrowComp } = require('../../actions');
const {
    createCompV2BoostStrategy,
    createCompV2RepayStrategy,
    createCompFLV2BoostStrategy,
    createCompFLV2RepayStrategy,
} = require('../../strategies');

const {
    callCompV2BoostStrategy,
    callCompV2RepayStrategy,
    callCompFLV2BoostStrategy,
    callCompFLV2RepayStrategy,
} = require('../../strategy-calls');

const { subCompV2AutomationStrategy } = require('../../strategy-subs');
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
    WETH_ADDRESS,
    redeployCore,
} = require('../../utils');
const { createStrategy, addBotCaller, createBundle } = require('../../utils-strategies');

const createBundleAndStrategy = async (proxy) => {
    const repayCompStrategyEncoded = createCompV2RepayStrategy();
    const repayFLCompStrategyEncoded = createCompFLV2RepayStrategy();

    const boostCompStrategyEncoded = createCompV2BoostStrategy();
    const boostFLCompStrategyEncoded = createCompFLV2BoostStrategy();

    await openStrategyAndBundleStorage(false);

    const repayId1 = await createStrategy(proxy, ...repayCompStrategyEncoded, true);
    const repayId2 = await createStrategy(proxy, ...repayFLCompStrategyEncoded, true);

    const boostId1 = await createStrategy(proxy, ...boostCompStrategyEncoded, true);
    const boostId2 = await createStrategy(proxy, ...boostFLCompStrategyEncoded, true);

    const repayBundleId = await createBundle(
        proxy,
        [repayId1, repayId2],
    );

    const boostBundleId = await createBundle(
        proxy,
        [boostId1, boostId2],
    );
    await redeploy('CompSubProxy', REGISTRY_ADDR, false, false, repayBundleId, boostBundleId);
    return { repayBundleId, boostBundleId };
};

const testPairs = [
    {
        collSymbol: 'cETH',
        debtSymbol: 'cDAI',
    },
    {
        collSymbol: 'cWBTC',
        debtSymbol: 'cUSDC',
    },
    {
        collSymbol: 'cDAI',
        debtSymbol: 'cETH',
    },
];

const compV2BoostTest = () => describe('Comp-Boost-Strategy', function () {
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

        await redeploy('CompBorrow');
        await redeploy('CompSupply');
        await redeploy('CompoundRatioTrigger');
        await redeploy('CompV2RatioCheck');
        await redeploy('DFSSell');

        flAddr = await redeploy('FLAction');
        view = await getContractFromRegistry('CompView');

        ({ address: exchangeWrapper } = await getContractFromRegistry('UniswapWrapperV3'));
        await setNewExchangeWrapper(senderAcc, exchangeWrapper);
        await addBotCaller(botAcc.address);

        await createBundleAndStrategy(proxy);
    });

    for (let i = 0; i < testPairs.length; i++) {
        const { collSymbol, debtSymbol } = testPairs[i];

        const cCollAsset = getAssetInfo(collSymbol);
        const cDebtAsset = getAssetInfo(debtSymbol);

        const collAsset = getAssetInfo(cCollAsset.underlyingAsset);
        const debtAsset = getAssetInfo(cDebtAsset.underlyingAsset);

        const collAmount = ethers.utils.parseUnits(
            fetchAmountinUSDPrice(collAsset.symbol, '20000'),
            collAsset.decimals,
        );
        const debtAmount = ethers.utils.parseUnits(
            fetchAmountinUSDPrice(debtAsset.symbol, '5000'),
            debtAsset.decimals,
        );

        console.log(collAmount.toString(), debtAmount.toString());

        it('... should make a new Comp position and sub', async () => {
            if (collAsset.symbol === 'ETH') {
                collAsset.address = WETH_ADDRESS;
            }

            if (debtAsset.symbol === 'ETH') {
                debtAsset.address = WETH_ADDRESS;
            }

            await setBalance(collAsset.address, senderAcc.address, collAmount);
            await approve(collAsset.address, proxy.address);

            await supplyComp(
                proxy,
                cCollAsset.address,
                collAsset.address,
                collAmount,
                senderAcc.address,
            );

            await borrowComp(
                proxy,
                cDebtAsset.address,
                debtAmount,
                senderAcc.address,
            );

            subData = await subCompV2AutomationStrategy(proxy, 120, 200, 150, 150, true);
        });

        it('... should trigger a Comp Boost strategy', async () => {
            const boostAmount = debtAmount.div(20);

            const loanDataBefore = await view.getLoanData(proxy.address);

            await callCompV2BoostStrategy(
                botAcc,
                strategyExecutor,
                0, // strategyIndex
                subData.boostSubId,
                subData.boostSub,
                cCollAsset.address,
                cDebtAsset.address,
                collAsset.address,
                debtAsset.address,
                boostAmount,
                exchangeWrapper,
            );

            const loanDataAfter = await view.getLoanData(proxy.address);

            expect(loanDataAfter.ratio).to.be.lt(loanDataBefore.ratio);
        });

        it('... should trigger a Comp FL Boost strategy', async () => {
            const boostAmount = debtAmount.div(10);

            const loanDataBefore = await view.getLoanData(proxy.address);

            console.log(loanDataBefore.ratio / 1e16);

            await callCompFLV2BoostStrategy(
                botAcc,
                strategyExecutor,
                1, // strategyIndex
                subData.boostSubId,
                subData.boostSub,
                cCollAsset.address,
                cDebtAsset.address,
                collAsset.address,
                debtAsset.address,
                boostAmount,
                exchangeWrapper,
                flAddr.address,
            );

            const loanDataAfter = await view.getLoanData(proxy.address);

            expect(loanDataAfter.ratio).to.be.lt(loanDataBefore.ratio);
        });
    }
});

const compV2RepayTest = () => describe('Comp-Repay-Strategy', function () {
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

        await redeploy('DFSSell');
        await redeploy('CompWithdraw');
        await redeploy('CompPayback');
        await redeploy('CompoundRatioTrigger');
        await redeploy('CompV2RatioCheck');
        flAddr = await redeploy('FLAction');

        view = await getContractFromRegistry('CompView');

        ({ address: exchangeWrapper } = await getContractFromRegistry('UniswapWrapperV3'));
        await setNewExchangeWrapper(senderAcc, exchangeWrapper);
        await addBotCaller(botAcc.address);

        await createBundleAndStrategy(proxy);
    });

    for (let i = 0; i < testPairs.length; i++) {
        const { collSymbol, debtSymbol } = testPairs[i];

        const cCollAsset = getAssetInfo(collSymbol);
        const cDebtAsset = getAssetInfo(debtSymbol);

        const collAsset = getAssetInfo(cCollAsset.underlyingAsset);
        const debtAsset = getAssetInfo(cDebtAsset.underlyingAsset);

        const collAmount = ethers.utils.parseUnits(
            fetchAmountinUSDPrice(collAsset.symbol, '20000'),
            collAsset.decimals,
        );
        const debtAmount = ethers.utils.parseUnits(
            fetchAmountinUSDPrice(debtAsset.symbol, '10000'),
            debtAsset.decimals,
        );

        it('... should make a new Comp position and sub', async () => {
            if (collAsset.symbol === 'ETH') {
                collAsset.address = WETH_ADDRESS;
            }

            if (debtAsset.symbol === 'ETH') {
                debtAsset.address = WETH_ADDRESS;
            }

            await setBalance(collAsset.address, senderAcc.address, collAmount);
            await approve(collAsset.address, proxy.address);

            await supplyComp(
                proxy,
                cCollAsset.address,
                collAsset.address,
                collAmount,
                senderAcc.address,
            );

            await borrowComp(
                proxy,
                cDebtAsset.address,
                debtAmount,
                senderAcc.address,
            );

            subData = await subCompV2AutomationStrategy(proxy, 200, 300, 250, 250, true);
        });

        it('... should trigger a Comp Repay strategy', async () => {
            const repayAmount = collAmount.div(20);

            const loanDataBefore = await view.getLoanData(proxy.address);

            console.log(loanDataBefore.ratio / 1e16);

            await callCompV2RepayStrategy(
                botAcc,
                strategyExecutor,
                0, // strategyIndex
                subData.repaySubId,
                subData.repaySub,
                cCollAsset.address,
                cDebtAsset.address,
                collAsset.address,
                debtAsset.address,
                repayAmount,
                exchangeWrapper,
            );

            const loanDataAfter = await view.getLoanData(proxy.address);

            expect(loanDataAfter.ratio).to.be.gt(loanDataBefore.ratio);
        });

        it('... should trigger a Comp FL Repay strategy', async () => {
            const repayAmount = collAmount.div(20);

            const loanDataBefore = await view.getLoanData(proxy.address);
            console.log(loanDataBefore.ratio / 1e16);

            await callCompFLV2RepayStrategy(
                botAcc,
                strategyExecutor,
                1, // strategyIndex
                subData.repaySubId,
                subData.repaySub,
                cCollAsset.address,
                cDebtAsset.address,
                collAsset.address,
                debtAsset.address,
                repayAmount,
                exchangeWrapper,
                flAddr.address,
            );

            const loanDataAfter = await view.getLoanData(proxy.address);

            expect(loanDataAfter.ratio).to.be.gt(loanDataBefore.ratio);
        });
    }
});

const compV2StrategiesTest = () => {
    compV2BoostTest();
    compV2RepayTest();
};

module.exports = {
    compV2StrategiesTest,
    compV2BoostTest,
    compV2RepayTest,
};
