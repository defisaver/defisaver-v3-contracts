/* eslint-disable camelcase */
const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { morphoAaveV2Supply, morphoAaveV2Borrow } = require('../../actions');
const {
    createMorphoAaveV2BoostStrategy,
    createMorphoAaveV2RepayStrategy,
    createMorphoAaveV2FLBoostStrategy,
    createMorphoAaveV2FLRepayStrategy,
} = require('../../strategies');
const {
    callMorphoAaveV2BoostStrategy,
    callMorphoAaveV2RepayStrategy,
    callMorphoAaveV2FLBoostStrategy,
    callMorphoAaveV2FLRepayStrategy,
} = require('../../strategy-calls');
const { subMorphoAaveV2AutomationStrategy } = require('../../strategy-subs');
const {
    getContractFromRegistry,
    setNetwork,
    openStrategyAndBundleStorage,
    getProxy,
    setNewExchangeWrapper,
    Float2BN,
    fetchAmountinUSDPrice,
    approve,
    setBalance,
    BN2Float,
    takeSnapshot,
    revertToSnapshot,
} = require('../../utils');
const { createStrategy, addBotCaller, createBundle } = require('../../utils-strategies');

const cAsset = getAssetInfo('WETH');
const dAsset = getAssetInfo('DAI');
const C_DOllAR_AMOUNT_OPEN = '30000';
const D_DOllAR_AMOUNT_OPEN = '10000';
const B_R_DOLLAR_AMOUNT = '1000';

const morphoAaveV2BoostTest = () => describe('Morpho-AaveV2-Boost-Strategy', () => {
    let senderAcc;
    let proxy;
    let view;

    let botAcc;
    let strategyExecutor;
    let exchangeWrapper;

    let bundleId;
    let triggerRatio;

    let subId;
    let strategySub;

    let snapshot;

    before(async () => {
        setNetwork('mainnet');
        [senderAcc] = await ethers.getSigners();
        proxy = await getProxy(senderAcc.address);

        botAcc = (await ethers.getSigners())[1];
        strategyExecutor = await getContractFromRegistry('StrategyExecutor');

        await getContractFromRegistry('MorphoAaveV2Borrow');
        await getContractFromRegistry('MorphoAaveV2Supply');
        await getContractFromRegistry('MorphoAaveV2RatioTrigger');
        await getContractFromRegistry('MorphoAaveV2RatioCheck');
        view = await getContractFromRegistry('MorphoAaveV2View');
        ({ address: exchangeWrapper } = await getContractFromRegistry('UniswapWrapperV3'));
        await setNewExchangeWrapper(senderAcc, exchangeWrapper);
        await addBotCaller(botAcc.address);

        const openCollAmount = Float2BN(fetchAmountinUSDPrice(cAsset.symbol, C_DOllAR_AMOUNT_OPEN));
        const openDebtAmount = Float2BN(fetchAmountinUSDPrice(dAsset.symbol, D_DOllAR_AMOUNT_OPEN));
        await setBalance(cAsset.address, senderAcc.address, openCollAmount);
        await approve(cAsset.address, proxy.address);

        await morphoAaveV2Supply(
            proxy,
            cAsset.address,
            openCollAmount,
            senderAcc.address,
        );

        await morphoAaveV2Borrow(
            proxy,
            dAsset.address,
            openDebtAmount,
            senderAcc.address,
        );
    });

    it('... should make a new Morpho-AaveV2 Boost bundle and sub', async () => {
        await openStrategyAndBundleStorage();
        const strategyData = createMorphoAaveV2BoostStrategy();
        const flStrategyData = createMorphoAaveV2FLBoostStrategy();

        const strategyId = await createStrategy(undefined, ...strategyData, false);
        const flStrategyId = await createStrategy(undefined, ...flStrategyData, false);
        bundleId = await createBundle(proxy, [strategyId, flStrategyId]);

        await getContractFromRegistry('MorphoAaveV2SubProxy', undefined, undefined, undefined, '0', bundleId);
        triggerRatio = ethers.utils.parseUnits('2.5', '18');
        const minRatio = ethers.utils.parseUnits('1', '18');
        const targetRepay = ethers.utils.parseUnits('2', '18');
        const targetRatio = ethers.utils.parseUnits('2', '18');

        ({ boostSubId: subId, boostSub: strategySub } = await subMorphoAaveV2AutomationStrategy(
            proxy,
            minRatio,
            triggerRatio,
            targetRatio,
            targetRepay,
            true,
        ));

        snapshot = await takeSnapshot();
    });

    it('... should trigger a Morpho-AaveV2 Boost strategy', async () => {
        const { userHealthFactor: ratioBefore } = await view.getUserInfo(proxy.address);
        console.log({ ratioBefore: BN2Float(ratioBefore) });
        expect(ratioBefore).to.be.gt(triggerRatio);
        const boostAmount = Float2BN(fetchAmountinUSDPrice(dAsset.symbol, B_R_DOLLAR_AMOUNT));

        await callMorphoAaveV2BoostStrategy({
            botAcc,
            strategyExecutor,
            subId,
            strategyId: 0,
            strategySub,

            cAsset: cAsset.address,
            dAsset: dAsset.address,
            boostAmount,
            exchangeWrapper,
        });

        const { userHealthFactor: ratioAfter } = await view.getUserInfo(proxy.address);
        console.log({ ratioAfter: BN2Float(ratioAfter) });
        expect(ratioAfter).to.be.lt(ratioBefore);
    });

    it('... should trigger a Morpho-AaveV2 FL Boost strategy', async () => {
        await revertToSnapshot(snapshot);

        const { userHealthFactor: ratioBefore } = await view.getUserInfo(proxy.address);
        console.log({ ratioBefore: BN2Float(ratioBefore) });
        expect(ratioBefore).to.be.gt(triggerRatio);
        const boostAmount = Float2BN(fetchAmountinUSDPrice(dAsset.symbol, B_R_DOLLAR_AMOUNT));

        await callMorphoAaveV2FLBoostStrategy({
            botAcc,
            strategyExecutor,
            subId,
            strategyId: 1,
            strategySub,

            cAsset: cAsset.address,
            dAsset: dAsset.address,
            flAmount: boostAmount,
            flAddress: await getContractFromRegistry('FLAction').then(({ address }) => address),
            exchangeAmount: boostAmount,
            exchangeWrapper,
        });

        const { userHealthFactor: ratioAfter } = await view.getUserInfo(proxy.address);
        console.log({ ratioAfter: BN2Float(ratioAfter) });
        expect(ratioAfter).to.be.lt(ratioBefore);
    });
});

const morphoAaveV2RepayTest = () => describe('Morpho-AaveV2-Repay-Strategy', () => {
    let senderAcc;
    let proxy;
    let view;

    let botAcc;
    let strategyExecutor;
    let exchangeWrapper;

    let triggerRatio;

    let subId;
    let strategySub;

    let snapshot;

    before(async () => {
        setNetwork('mainnet');
        [senderAcc] = await ethers.getSigners();
        proxy = await getProxy(senderAcc.address);

        botAcc = (await ethers.getSigners())[1];
        strategyExecutor = await getContractFromRegistry('StrategyExecutor');

        await getContractFromRegistry('MorphoAaveV2Borrow');
        await getContractFromRegistry('MorphoAaveV2Supply');
        await getContractFromRegistry('MorphoAaveV2Withdraw');
        await getContractFromRegistry('MorphoAaveV2Payback');
        await getContractFromRegistry('MorphoAaveV2RatioTrigger');
        await getContractFromRegistry('MorphoAaveV2RatioCheck');
        view = await getContractFromRegistry('MorphoAaveV2View');
        ({ address: exchangeWrapper } = await getContractFromRegistry('UniswapWrapperV3'));
        await setNewExchangeWrapper(senderAcc, exchangeWrapper);
        await addBotCaller(botAcc.address);

        const openCollAmount = Float2BN(fetchAmountinUSDPrice(cAsset.symbol, C_DOllAR_AMOUNT_OPEN));
        const openDebtAmount = Float2BN(fetchAmountinUSDPrice(dAsset.symbol, D_DOllAR_AMOUNT_OPEN));
        await setBalance(cAsset.address, senderAcc.address, openCollAmount);
        await approve(cAsset.address, proxy.address);

        await morphoAaveV2Supply(
            proxy,
            cAsset.address,
            openCollAmount,
            senderAcc.address,
        );

        await morphoAaveV2Borrow(
            proxy,
            dAsset.address,
            openDebtAmount,
            senderAcc.address,
        );
    });

    it('... should make a new Morpho-AaveV2 Repay bundle and sub', async () => {
        await openStrategyAndBundleStorage();
        const strategyData = createMorphoAaveV2RepayStrategy();
        const flStrategyData = createMorphoAaveV2FLRepayStrategy();

        const strategyId = await createStrategy(undefined, ...strategyData, false);
        const flStrategyId = await createStrategy(undefined, ...flStrategyData, false);
        const bundleId = await createBundle(proxy, [strategyId, flStrategyId]);

        await getContractFromRegistry('MorphoAaveV2SubProxy', undefined, undefined, undefined, bundleId, '0');
        triggerRatio = ethers.utils.parseUnits('3', '18');
        const targetRatio = ethers.utils.parseUnits('3.5', '18');

        ({ repaySubId: subId, repaySub: strategySub } = await subMorphoAaveV2AutomationStrategy(
            proxy,
            triggerRatio,
            '0',
            '0',
            targetRatio,
            false,
        ));

        snapshot = await takeSnapshot();
    });

    it('... should trigger a Morpho-AaveV2 Repay strategy', async () => {
        const { userHealthFactor: ratioBefore } = await view.getUserInfo(proxy.address);
        console.log({ ratioBefore: BN2Float(ratioBefore) });
        expect(ratioBefore).to.be.lt(triggerRatio);
        const repayAmount = Float2BN(fetchAmountinUSDPrice(cAsset.symbol, B_R_DOLLAR_AMOUNT));

        await callMorphoAaveV2RepayStrategy({
            botAcc,
            strategyExecutor,
            subId,
            strategyId: 0,
            strategySub,

            cAsset: cAsset.address,
            dAsset: dAsset.address,
            repayAmount,
            exchangeWrapper,
        });

        const { userHealthFactor: ratioAfter } = await view.getUserInfo(proxy.address);
        console.log({ ratioAfter: BN2Float(ratioAfter) });
        expect(ratioAfter).to.be.gt(ratioBefore);
    });

    it('... should trigger a Morpho-AaveV2 FL Repay strategy', async () => {
        await revertToSnapshot(snapshot);

        const { userHealthFactor: ratioBefore } = await view.getUserInfo(proxy.address);
        console.log({ ratioBefore: BN2Float(ratioBefore) });
        expect(ratioBefore).to.be.lt(triggerRatio);
        const repayAmount = Float2BN(fetchAmountinUSDPrice(cAsset.symbol, B_R_DOLLAR_AMOUNT));

        await callMorphoAaveV2FLRepayStrategy({
            botAcc,
            strategyExecutor,
            subId,
            strategyId: 1,
            strategySub,

            cAsset: cAsset.address,
            dAsset: dAsset.address,
            flAmount: repayAmount,
            flAddress: await getContractFromRegistry('FLAction').then(({ address }) => address),
            exchangeAmount: repayAmount,
            exchangeWrapper,
        });

        const { userHealthFactor: ratioAfter } = await view.getUserInfo(proxy.address);
        console.log({ ratioAfter: BN2Float(ratioAfter) });
        expect(ratioAfter).to.be.gt(ratioBefore);
    });
});

const morphoAaveV2StrategiesTest = () => {
    morphoAaveV2BoostTest();
    morphoAaveV2RepayTest();
};

module.exports = {
    morphoAaveV2StrategiesTest,
    morphoAaveV2BoostTest,
    morphoAaveV2RepayTest,
};
