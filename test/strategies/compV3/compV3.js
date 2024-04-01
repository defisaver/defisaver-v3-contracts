const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const {
    getProxy,
    redeploy,
    setBalance,
    openStrategyAndBundleStorage,
    network,
    addrs,
    takeSnapshot,
    revertToSnapshot,
    getAddrFromRegistry,
    fetchAmountinUSDPrice,
    chainIds,
} = require('../../utils');

const {
    addBotCaller,
    createStrategy,
    createBundle,
} = require('../../utils-strategies');

const {
    createCompV3RepayL2Strategy,
    createCompV3FLRepayL2Strategy,
    createCompV3BoostL2Strategy,
    createCompV3FLBoostL2Strategy,
} = require('../../l2-strategies');

const {
    callCompV3RepayL2Strategy,
    callCompV3FLRepayL2Strategy,
    callCompV3BoostL2Strategy,
    callCompV3FLBoostL2Strategy,
} = require('../../l2-strategy-calls');

const {
    subToCompV3L2AutomationStrategy,
} = require('../../l2-strategy-subs');

const {
    borrowCompV3, supplyCompV3,
} = require('../../actions');

const STRATEGY_EXECUTOR_L2_ADDR = '0x9652f91B10045Cd2a36ca8D87df4A800eD2AF05D';

const deployBundles = async (proxy) => {
    await openStrategyAndBundleStorage();
    const compV3RepayStrategyEncoded = createCompV3RepayL2Strategy();
    const compV3FLRepayStrategyEncoded = createCompV3FLRepayL2Strategy();

    const repayStrategyId1 = await createStrategy(proxy, ...compV3RepayStrategyEncoded, true);
    const repayStrategyId2 = await createStrategy(proxy, ...compV3FLRepayStrategyEncoded, true);

    const repayBundleId = await createBundle(proxy, [repayStrategyId1, repayStrategyId2]);

    const compV3BoostStrategyEncoded = createCompV3BoostL2Strategy();
    const compV3FLBoostStrategyEncoded = createCompV3FLBoostL2Strategy();

    const boostStrategyId1 = await createStrategy(proxy, ...compV3BoostStrategyEncoded, true);
    const boostStrategyId2 = await createStrategy(proxy, ...compV3FLBoostStrategyEncoded, true);

    const boostBundleId = await createBundle(proxy, [boostStrategyId1, boostStrategyId2]);

    return { repayBundleId, boostBundleId };
};

const testPairs = [
    {
        collSymbol: 'WETH',
        debtSymbol: 'USDC',
        market: addrs[network].COMET_USDC_NATIVE_ADDR,
    },
    {
        collSymbol: 'WBTC',
        debtSymbol: 'USDC',
        market: addrs[network].COMET_USDC_NATIVE_ADDR,
    },
];

describe('CompV3 L2 automation tests', function () {
    this.timeout(300000);
    let senderAcc;
    let senderAddr;
    let proxy;
    let proxyAddr;
    let botAcc;
    let strategyExecutorL2;
    let compV3RatioHelper;
    let subIds;
    let snapshotId;
    let flAddress;

    const exchangeWrapper = addrs[network].UNISWAP_V3_WRAPPER;

    const createCompV3Position = async (market, collAddr, collAmount, borrowAmount) => {
        await setBalance(collAddr, senderAddr, collAmount);
        await supplyCompV3(
            market,
            proxy,
            collAddr,
            collAmount,
            senderAddr,
            proxyAddr,
        );
        await borrowCompV3(
            market,
            proxy,
            borrowAmount,
            proxyAddr,
            proxyAddr,
        );
    };

    const getRatio = async (market) => {
        const ratio = await compV3RatioHelper.getSafetyRatio(market, proxyAddr);
        return ratio;
    };

    const subToCompV3Automation = async (market, debtAddr) => {
        const minRatio = 180;
        const maxRatio = 330;
        const targetRepayRatio = 220;
        const targetBoostRatio = 280;
        subIds = await subToCompV3L2AutomationStrategy(
            proxy,
            market,
            debtAddr,
            minRatio,
            maxRatio,
            targetBoostRatio,
            targetRepayRatio,
            true,
        );
    };

    const createCompV3PositionAndSubForAutomation = async (
        collAsset, debtAsset, market, forBoost = false,
    ) => {
        const collAmount = hre.ethers.utils.parseUnits(
            fetchAmountinUSDPrice(collAsset.symbol, '100000'),
            collAsset.decimals,
        );
        const debtAmount = hre.ethers.utils.parseUnits(
            fetchAmountinUSDPrice(debtAsset.symbol, forBoost ? '30000' : '70000'),
            debtAsset.decimals,
        );
        const collAddr = collAsset.addresses[chainIds[network]];
        const debtAddr = debtAsset.addresses[chainIds[network]];
        await createCompV3Position(market, collAddr, collAmount, debtAmount);
        await subToCompV3Automation(market, debtAddr);
    };

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        senderAddr = senderAcc.address;
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        await redeploy('CompV3RatioTrigger');
        await redeploy('CompV3RatioCheck');
        compV3RatioHelper = await redeploy('CompV3RatioHelper');
        flAddress = await getAddrFromRegistry('FLAction');

        botAcc = (await hre.ethers.getSigners())[1];
        await addBotCaller(botAcc.address);

        strategyExecutorL2 = await hre.ethers.getContractAt('StrategyExecutorL2', STRATEGY_EXECUTOR_L2_ADDR);

        const { repayBundleId, boostBundleId } = await deployBundles(proxy);
        await redeploy('CompV3SubProxyL2', addrs[network].REGISTRY_ADDR, false, false, repayBundleId, boostBundleId);
    });

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    for (let i = 0; i < testPairs.length; i++) {
        const { collSymbol, debtSymbol, market } = testPairs[i];

        const collAsset = getAssetInfo(collSymbol, network);
        const debtAsset = getAssetInfo(debtSymbol, network);

        const collAddr = collAsset.addresses[chainIds[network]];
        const debtAddr = debtAsset.addresses[chainIds[network]];

        it('... should call compV3 repay L2 strategy', async () => {
            await createCompV3PositionAndSubForAutomation(collAsset, debtAsset, market);

            const ratioBefore = await getRatio(market);
            console.log(ratioBefore);

            const repayAmount = hre.ethers.utils.parseUnits(
                fetchAmountinUSDPrice(collAsset.symbol, '24000'),
                collAsset.decimals,
            );

            await callCompV3RepayL2Strategy(
                botAcc,
                strategyExecutorL2,
                subIds.firstSub,
                0,
                collAddr,
                repayAmount,
                exchangeWrapper,
                proxyAddr,
                debtAddr,
                market,
            );

            const ratioAfter = await getRatio(market);
            console.log(ratioAfter);

            expect(ratioAfter).to.be.gt(ratioBefore);
        });

        it('... should call compV3 FL repay L2 strategy', async () => {
            await createCompV3PositionAndSubForAutomation(collAsset, debtAsset, market);

            const ratioBefore = await getRatio(market);
            console.log(ratioBefore);

            const repayAmount = hre.ethers.utils.parseUnits(
                fetchAmountinUSDPrice(collAsset.symbol, '24000'),
                collAsset.decimals,
            );

            await callCompV3FLRepayL2Strategy(
                botAcc,
                strategyExecutorL2,
                subIds.firstSub,
                1,
                collAddr,
                repayAmount,
                exchangeWrapper,
                flAddress,
                proxyAddr,
                debtAddr,
                market,
            );

            const ratioAfter = await getRatio(market);
            console.log(ratioAfter);
            expect(ratioAfter).to.be.gt(ratioBefore);
        });

        it('... should call compV3 boost L2 strategy', async () => {
            await createCompV3PositionAndSubForAutomation(collAsset, debtAsset, market, true);

            const ratioBefore = await getRatio(market);
            console.log(ratioBefore);

            const boostAmount = hre.ethers.utils.parseUnits(
                fetchAmountinUSDPrice(debtAsset.symbol, '8000'),
                debtAsset.decimals,
            );

            await callCompV3BoostL2Strategy(
                botAcc,
                strategyExecutorL2,
                subIds.secondSub,
                0,
                collAddr,
                boostAmount,
                exchangeWrapper,
                proxyAddr,
                debtAddr,
                market,
            );

            const ratioAfter = await getRatio(market);
            console.log(ratioAfter);
            expect(ratioAfter).to.be.lt(ratioBefore);
        });

        it('... should call compV3 FL boost L2 strategy', async () => {
            await createCompV3PositionAndSubForAutomation(collAsset, debtAsset, market, true);

            const ratioBefore = await getRatio(market);
            console.log(ratioBefore);

            const boostAmount = hre.ethers.utils.parseUnits(
                fetchAmountinUSDPrice(debtAsset.symbol, '8000'),
                debtAsset.decimals,
            );

            await callCompV3FLBoostL2Strategy(
                botAcc,
                strategyExecutorL2,
                subIds.secondSub,
                1,
                collAddr,
                boostAmount,
                exchangeWrapper,
                flAddress,
                proxyAddr,
                debtAddr,
                market,
            );

            const ratioAfter = await getRatio(market);
            console.log(ratioAfter);
            expect(ratioAfter).to.be.lt(ratioBefore);
        });
    }
});
