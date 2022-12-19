const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    openStrategyAndBundleStorage,
    Float2BN,
    depositToWeth,
    send,
    redeployCore,
    resetForkToBlock,
    getChainLinkPrice,
    balanceOf,
    mockChainlinkPriceFeed,
    setMockPrice,
    timeTravel,
    WETH_ADDRESS,
    ETH_ADDR,
    LUSD_ADDR,
    setNewExchangeWrapper,
    takeSnapshot,
    revertToSnapshot,
} = require('../../utils');

const { createStrategy, addBotCaller, createBundle } = require('../../utils-strategies');

const { getRatio, getHints, LiquityActionIds } = require('../../utils-liquity');

const {
    callLiquityBoostStrategy,
    callLiquityFLBoostStrategy,
    callLiquityFLRepayStrategy,
    callLiquityRepayStrategy,
    callLiquityCloseToCollStrategy,
    callLiquityPaybackChickenOutStrategy,
    callLiquityPaybackChickenInStrategy,
} = require('../../strategy-calls');

const {
    subLiquityBoostStrategy,
    subLiquityRepayStrategy,
    subLiquityCloseToCollStrategy,
    subLiquityTrailingCloseToCollStrategy,
    subCbRebondStrategy,
    subLiquityCBPaybackStrategy,
} = require('../../strategy-subs');

const {
    createLiquityBoostStrategy,
    createLiquityFLBoostStrategy,
    createLiquityRepayStrategy,
    createLiquityFLRepayStrategy,
    createLiquityCloseToCollStrategy,
    createLiquityPaybackChickenInStrategy,
    createLiquityPaybackChickenOutStrategy,
} = require('../../strategies');

const { RATIO_STATE_OVER } = require('../../triggers');

const { liquityOpen, createChickenBond } = require('../../actions');

const liquityBoostStrategyTest = async () => {
    describe('Liquity-Boost-Bundle', function () {
        this.timeout(1200000);

        let balancerFL;

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let subId;
        let liquityView;
        let strategySub;

        const maxFeePercentage = Float2BN('5', 16);
        const collAmount = Float2BN(fetchAmountinUSDPrice('WETH', '30000'));

        before(async () => {
            await resetForkToBlock(14430140);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
            botAcc = (await hre.ethers.getSigners())[1];

            balancerFL = await redeploy('FLBalancer');
            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');
            strategyExecutor = await redeployCore();

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityOpen');
            await redeploy('LiquitySupply');
            await redeploy('LiquityBorrow');
            await redeploy('LiquityRatioTrigger');

            await addBotCaller(botAcc.address);

            await depositToWeth(collAmount);
            await send(WETH_ADDRESS, proxyAddr, collAmount);

            await liquityOpen(
                proxy,
                maxFeePercentage,
                collAmount,
                Float2BN(fetchAmountinUSDPrice('LUSD', '12000')),
                proxyAddr,
                proxyAddr,
            );
        });

        it('... should make a Liquity Boost bundle and subscribe', async () => {
            const liquityBoostStrategy = createLiquityBoostStrategy();
            const liquityFLBoostStrategy = createLiquityFLBoostStrategy();

            await openStrategyAndBundleStorage();

            const strategyId1 = await createStrategy(proxy, ...liquityBoostStrategy, true);
            const strategyId2 = await createStrategy(proxy, ...liquityFLBoostStrategy, true);

            const bundleId = await createBundle(proxy, [strategyId1, strategyId2]);

            const ratioOver = Float2BN('1.8');
            const targetRatio = Float2BN('1.5');

            console.log(bundleId);

            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subLiquityBoostStrategy(proxy, maxFeePercentage, ratioOver, targetRatio, bundleId));
        });

        it('... should trigger a Liquity Boost strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);

            const boostAmount = Float2BN(fetchAmountinUSDPrice('LUSD', '5000'));

            // eslint-disable-next-line max-len
            await callLiquityBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount, proxyAddr);

            const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.gt(ratioAfter);
        });

        it('... should trigger a Liquity FL Boost strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
            const boostAmount = Float2BN(fetchAmountinUSDPrice('LUSD', '2000'));

            // eslint-disable-next-line max-len
            await callLiquityFLBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount, proxyAddr, balancerFL.address);

            const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.gt(ratioAfter);
        });
    });
};

const liquityRepayStrategyTest = async () => {
    describe('Liquity-Repay-Bundle', function () {
        this.timeout(1200000);

        let balancerFL;

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let subId;
        let liquityView;
        let strategySub;

        const maxFeePercentage = Float2BN('5', 16);
        const collAmount = Float2BN(fetchAmountinUSDPrice('WETH', '30000'));

        before(async () => {
            await resetForkToBlock(14430140);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
            botAcc = (await hre.ethers.getSigners())[1];

            console.log(proxyAddr);

            strategyExecutor = await redeployCore();

            balancerFL = await redeploy('FLBalancer');

            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityOpen');
            await redeploy('LiquityWithdraw');
            await redeploy('LiquityPayback');
            await redeploy('LiquityRatioTrigger');

            await addBotCaller(botAcc.address);

            await depositToWeth(collAmount);
            await send(WETH_ADDRESS, proxyAddr, collAmount);

            console.log('val: ', Float2BN(fetchAmountinUSDPrice('LUSD', '12000')));

            await liquityOpen(
                proxy,
                maxFeePercentage,
                collAmount,
                Float2BN(fetchAmountinUSDPrice('LUSD', '12000')),
                proxyAddr,
                proxyAddr,
            );
        });

        it('... should make a new Liquity Repay bundle and subscribe', async () => {
            const liquityRepayStrategy = createLiquityRepayStrategy();
            const liquityFLRepayStrategy = createLiquityFLRepayStrategy();

            await openStrategyAndBundleStorage();

            const strategyId1 = await createStrategy(proxy, ...liquityRepayStrategy, true);
            const strategyId2 = await createStrategy(proxy, ...liquityFLRepayStrategy, true);

            const bundleId = await createBundle(proxy, [strategyId1, strategyId2]);

            const ratioUnder = Float2BN('3');
            const targetRatio = Float2BN('3');

            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subLiquityRepayStrategy(proxy, ratioUnder, targetRatio, bundleId));
        });

        it('... should trigger a Liquity Repay strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
            const repayAmount = Float2BN(fetchAmountinUSDPrice('WETH', '1000'));

            // eslint-disable-next-line max-len
            await callLiquityRepayStrategy(botAcc, strategyExecutor, subId, strategySub, repayAmount, proxyAddr);

            const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.lt(ratioAfter);
        });

        it('... should trigger a Liquity FL Repay strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
            const repayAmount = Float2BN(fetchAmountinUSDPrice('WETH', '1000'));

            // eslint-disable-next-line max-len
            await callLiquityFLRepayStrategy(botAcc, strategyExecutor, subId, strategySub, repayAmount, proxyAddr, balancerFL.address);

            const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.lt(ratioAfter);
        });
    });
};

const liquityCBPaybackTest = async () => {
    describe('Liquity-CB-Payback', function () {
        this.timeout(1200000);

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let cbRebondSubId;
        let strategySub;
        let bundleId;
        let bondId;
        let snapshot;
        let subId;
        let upperHint;
        let lowerHint;
        let liquityView;
        let chickenBondsView;
        let upperHintFull;
        let lowerHintFull;
        let upperHintHalf;
        let lowerHintHalf;
        const ratioUnder = Float2BN('3');
        const maxFeePercentage = Float2BN('5', 16);
        const lusdDebt = '10000';
        const lusdDebtHalf = (lusdDebt / 2).toString();
        const troveAmount = Float2BN(fetchAmountinUSDPrice('WETH', '20000'));
        const forkedBlock = 16035000; // doing this to optimize hints fetching

        before(async () => {
            await resetForkToBlock(forkedBlock);
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
            botAcc = (await hre.ethers.getSigners())[1];

            console.log(proxyAddr);

            strategyExecutor = await redeployCore();

            await redeploy('CBRebondSubProxy');
            // await redeploy('LiquityRatioTrigger');
            // await redeploy('CBCreate');
            await redeploy('FetchBondId');
            // await redeploy('CBChickenIn');
            // await redeploy('CBChickenOut');
            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');
            await redeploy('LiquityPayback');
            // await redeploy('SendToken');

            // await redeploy('LiquityOpen');

            liquityView = await redeploy('LiquityView');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            await addBotCaller(botAcc.address);

            chickenBondsView = await redeploy('ChickenBondsView');

            await depositToWeth(troveAmount);
            await send(WETH_ADDRESS, proxyAddr, troveAmount);

            await liquityOpen(
                proxy,
                maxFeePercentage,
                troveAmount,
                Float2BN(lusdDebt),
                proxyAddr,
                senderAcc.address,
            );

            ({ upperHint, lowerHint } = await getHints(
                proxy.address,
                LiquityActionIds.Payback,
                proxy.address,
                0,
                Float2BN(lusdDebt),
            ));
            upperHintFull = upperHint;
            lowerHintFull = lowerHint;
            ({ upperHint, lowerHint } = await getHints(
                proxy.address,
                LiquityActionIds.Payback,
                proxy.address,
                0,
                Float2BN(lusdDebtHalf),
            ));
            upperHintHalf = upperHint;
            lowerHintHalf = lowerHint;
        });

        it('... should create Liquity CB Payback Strategy Bundle', async () => {
            await openStrategyAndBundleStorage();
            const liqInStrategyEncoded = createLiquityPaybackChickenInStrategy();
            const liqOutFLStrategyEncoded = createLiquityPaybackChickenOutStrategy();

            const strategyId1 = await createStrategy(proxy, ...liqInStrategyEncoded, false);
            const strategyId2 = await createStrategy(proxy, ...liqOutFLStrategyEncoded, false);

            bundleId = await createBundle(proxy, [strategyId1, strategyId2]);
            console.log(`Bundle Id is ${bundleId} and should be 7`);
        });

        it('... should sub to strategy and trigger ChickenOut from bond with bond > debt - min_debt', async () => {
            snapshot = await takeSnapshot();

            await createChickenBond(proxy, Float2BN(lusdDebt), senderAcc.address, senderAcc);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondId = bonds[bonds.length - 1].bondID.toString();
            const bondAmount = bonds[bonds.length - 1].lusdAmount;

            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subLiquityCBPaybackStrategy(proxy, bundleId, bondId, '0', ratioUnder, '1'));
            let debtBefore; let debtAfter;
            let lusdEOABefore; let lusdEOAAfter;
            {
                const { debtAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
                debtBefore = debtAmount;
                lusdEOABefore = await balanceOf(LUSD_ADDR, senderAcc.address);
            }
            await callLiquityPaybackChickenOutStrategy(botAcc, strategyExecutor, subId, strategySub, '0', '0', upperHintFull, lowerHintFull);

            {
                const { debtAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
                debtAfter = debtAmount;
                lusdEOAAfter = await balanceOf(LUSD_ADDR, senderAcc.address);
            }

            console.log(`Bond size was ${bondAmount / 1e18}`);
            console.log(`Debt was ${debtBefore / 1e18}`);
            console.log(`Paid back ${(debtBefore.sub(debtAfter)) / 1e18} and user received ${(lusdEOAAfter.sub(lusdEOABefore) / 1e18)} LUSD to his eoa`);
            await revertToSnapshot(snapshot);
        });
        it('... should sub to strategy and trigger ChickenOut from bond with bond < debt - min_debt', async () => {
            snapshot = await takeSnapshot();

            await createChickenBond(proxy, Float2BN(lusdDebtHalf), senderAcc.address, senderAcc);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondId = bonds[bonds.length - 1].bondID.toString();
            const bondAmount = bonds[bonds.length - 1].lusdAmount;

            let debtBefore; let debtAfter;
            let lusdEOABefore; let lusdEOAAfter;
            // eslint-disable-next-line max-len

            ({ subId, strategySub } = await subLiquityCBPaybackStrategy(proxy, bundleId, bondId, '0', ratioUnder, '1'));
            {
                const { debtAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
                debtBefore = debtAmount;
                lusdEOABefore = await balanceOf(LUSD_ADDR, senderAcc.address);
            }
            await callLiquityPaybackChickenOutStrategy(botAcc, strategyExecutor, subId, strategySub, '0', '0', upperHintHalf, lowerHintHalf);

            {
                const { debtAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
                debtAfter = debtAmount;
                lusdEOAAfter = await balanceOf(LUSD_ADDR, senderAcc.address);
            }
            console.log(`Bond size was ${bondAmount / 1e18}`);
            console.log(`Debt was ${debtBefore / 1e18}`);
            console.log(`Paid back ${(debtBefore.sub(debtAfter)) / 1e18} and user received ${(lusdEOAAfter.sub(lusdEOABefore) / 1e18)} LUSD to his eoa`);
            await revertToSnapshot(snapshot);
        });

        it('... should sub to strategy and trigger ChickenOut from rebond sub with bond > debt - min_debt', async () => {
            snapshot = await takeSnapshot();

            await createChickenBond(proxy, Float2BN(lusdDebt), senderAcc.address, senderAcc);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondId = bonds[bonds.length - 1].bondID.toString();
            const bondAmount = bonds[bonds.length - 1].lusdAmount;
            ({ subId } = await subCbRebondStrategy(proxy, bondId, '31'));
            cbRebondSubId = subId;

            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subLiquityCBPaybackStrategy(proxy, bundleId, cbRebondSubId, '1', ratioUnder, '1'));
            let debtBefore; let debtAfter;
            let lusdEOABefore; let lusdEOAAfter;
            {
                const { debtAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
                debtBefore = debtAmount;
                lusdEOABefore = await balanceOf(LUSD_ADDR, senderAcc.address);
            }
            await callLiquityPaybackChickenOutStrategy(botAcc, strategyExecutor, subId, strategySub, bondId, '0', upperHintFull, lowerHintFull);
            {
                const { debtAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
                debtAfter = debtAmount;
                lusdEOAAfter = await balanceOf(LUSD_ADDR, senderAcc.address);
            }

            console.log(`Bond size was ${bondAmount / 1e18}`);
            console.log(`Debt was ${debtBefore / 1e18}`);
            console.log(`Paid back ${(debtBefore.sub(debtAfter)) / 1e18} and user received ${(lusdEOAAfter.sub(lusdEOABefore) / 1e18)} LUSD to his eoa`);
            await revertToSnapshot(snapshot);
        });
        it('... should sub to strategy and trigger ChickenOut from rebond sub with bond < debt - min_debt', async () => {
            snapshot = await takeSnapshot();

            await createChickenBond(proxy, Float2BN(lusdDebtHalf), senderAcc.address, senderAcc);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondId = bonds[bonds.length - 1].bondID.toString();
            const bondAmount = bonds[bonds.length - 1].lusdAmount;
            ({ subId } = await subCbRebondStrategy(proxy, bondId, '31'));
            cbRebondSubId = subId;

            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subLiquityCBPaybackStrategy(proxy, bundleId, cbRebondSubId, '1', ratioUnder, '1'));
            let debtBefore; let debtAfter;
            let lusdEOABefore; let lusdEOAAfter;
            {
                const { debtAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
                debtBefore = debtAmount;
                lusdEOABefore = await balanceOf(LUSD_ADDR, senderAcc.address);
            }
            await callLiquityPaybackChickenOutStrategy(botAcc, strategyExecutor, subId, strategySub, bondId, '0', upperHintHalf, lowerHintHalf);
            {
                const { debtAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
                debtAfter = debtAmount;
                lusdEOAAfter = await balanceOf(LUSD_ADDR, senderAcc.address);
            }
            console.log(`Bond size was ${bondAmount / 1e18}`);
            console.log(`Debt was ${debtBefore / 1e18}`);
            console.log(`Paid back ${(debtBefore.sub(debtAfter)) / 1e18} and user received ${(lusdEOAAfter.sub(lusdEOABefore) / 1e18)} LUSD to his eoa`);
            await revertToSnapshot(snapshot);
        });

        it('... should subscribe to LiquityCBPaybackStrategy and trigger ChickenIn from bond', async () => {
            snapshot = await takeSnapshot();

            await createChickenBond(proxy, Float2BN(lusdDebt), senderAcc.address, senderAcc);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondId = bonds[bonds.length - 1].bondID.toString();
            const bondAmount = bonds[bonds.length - 1].lusdAmount;

            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subLiquityCBPaybackStrategy(proxy, bundleId, bondId, '0', ratioUnder, '1'));
            let debtBefore; let debtAfter;
            let lusdEOABefore; let lusdEOAAfter;
            await timeTravel(5_260_000);// travel two months
            {
                const { debtAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
                debtBefore = debtAmount;
                lusdEOABefore = await balanceOf(LUSD_ADDR, senderAcc.address);
            }
            await callLiquityPaybackChickenInStrategy(botAcc, strategyExecutor, subId, strategySub, '0', '0', upperHintFull, lowerHintFull);
            {
                const { debtAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
                debtAfter = debtAmount;
                lusdEOAAfter = await balanceOf(LUSD_ADDR, senderAcc.address);
            }

            console.log(`Bond size was ${bondAmount / 1e18}`);
            console.log(`Debt was ${debtBefore / 1e18}`);
            console.log(`Paid back ${(debtBefore.sub(debtAfter)) / 1e18} and user received ${(lusdEOAAfter.sub(lusdEOABefore) / 1e18)} LUSD to his eoa`);
            await revertToSnapshot(snapshot);
        });

        it('... should subscribe to LiquityCBPaybackStrategy and trigger ChickenIn from rebond Sub', async () => {
            snapshot = await takeSnapshot();

            await createChickenBond(proxy, Float2BN(lusdDebt), senderAcc.address, senderAcc);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondId = bonds[bonds.length - 1].bondID.toString();
            const bondAmount = bonds[bonds.length - 1].lusdAmount;
            ({ subId } = await subCbRebondStrategy(proxy, bondId, '31'));
            cbRebondSubId = subId;

            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subLiquityCBPaybackStrategy(proxy, bundleId, cbRebondSubId, '1', ratioUnder, '1'));
            let debtBefore; let debtAfter;
            let lusdEOABefore; let lusdEOAAfter;
            await timeTravel(5_260_000);// travel two months
            {
                const { debtAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
                debtBefore = debtAmount;
                lusdEOABefore = await balanceOf(LUSD_ADDR, senderAcc.address);
            }
            await callLiquityPaybackChickenInStrategy(botAcc, strategyExecutor, subId, strategySub, bondId, '0', upperHintFull, lowerHintFull);
            {
                const { debtAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
                debtAfter = debtAmount;
                lusdEOAAfter = await balanceOf(LUSD_ADDR, senderAcc.address);
            }

            console.log(`Bond size was ${bondAmount / 1e18}`);
            console.log(`Debt was ${debtBefore / 1e18}`);
            console.log(`Paid back ${(debtBefore.sub(debtAfter)) / 1e18} and user received ${(lusdEOAAfter.sub(lusdEOABefore) / 1e18)} LUSD to his eoa`);
            await revertToSnapshot(snapshot);
        });
    });
};

const liquityCloseToCollStrategyTest = async () => {
    describe('Liquity-Close-To-Coll', function () {
        this.timeout(1200000);

        let balancerFL;

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let subId;
        let strategySub;
        let mockedPriceFeed;

        const maxFeePercentage = Float2BN('5', 16);
        const lusdDebt = '12000';
        const troveAmount = Float2BN(fetchAmountinUSDPrice('WETH', '30000'));
        const forkedBlock = 15313530; // doing this to optimize hints fetching

        before(async () => {
            await resetForkToBlock(forkedBlock);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
            botAcc = (await hre.ethers.getSigners())[1];

            console.log(proxyAddr);

            strategyExecutor = await redeployCore();

            mockedPriceFeed = mockChainlinkPriceFeed();

            balancerFL = await redeploy('FLBalancer');

            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');

            await redeploy('LiquityView');
            await redeploy('LiquityOpen');
            await redeploy('LiquityWithdraw');
            await redeploy('LiquityPayback');
            await redeploy('LiquityClose');
            await redeploy('ChainLinkPriceTrigger');
            await redeploy('SendToken');
            await redeploy('SendTokenAndUnwrap');
            await redeploy('TrailingStopTrigger');

            await addBotCaller(botAcc.address);

            await depositToWeth(troveAmount);
            await send(WETH_ADDRESS, proxyAddr, troveAmount);

            await liquityOpen(
                proxy,
                maxFeePercentage,
                troveAmount,
                Float2BN(lusdDebt),
                proxyAddr,
                proxyAddr,
            );
        });

        it('... should make a new trailing Liquity close to coll strategy', async () => {
            const liquityCloseToCollStrategy = createLiquityCloseToCollStrategy(true);

            await openStrategyAndBundleStorage();

            const strategyId = await createStrategy(proxy, ...liquityCloseToCollStrategy, false);

            const percentage = 10 * 1e8;

            // mock chainlink price before sub
            const roundId = 1;
            const ethPrice = 1500;
            await setMockPrice(mockedPriceFeed, roundId, ETH_ADDR, ethPrice);

            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subLiquityTrailingCloseToCollStrategy(
                proxy,
                percentage,
                roundId,
                strategyId,
            ));
        });

        it('... should trigger a trailing Liquity close to coll strategy', async () => {
            // weth amount of trove debt + 1% extra for slippage and fee-s
            const debtEstimate = (parseInt(lusdDebt, 10) * 1.01).toString();
            const flAmount = Float2BN(fetchAmountinUSDPrice('WETH', debtEstimate));

            const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth before closing : ${ethBalanceBefore.toString() / 1e18}`);

            const lusdBalanceBefore = await balanceOf(LUSD_ADDR, senderAcc.address);
            console.log(`Lusd before closing : ${lusdBalanceBefore.toString() / 1e18}`);

            // mock chainlink price after sub
            let roundId = 2;
            let ethPrice = 1900;
            await setMockPrice(mockedPriceFeed, roundId, ETH_ADDR, ethPrice);

            await timeTravel(60 * 60 * 1);
            roundId = 3;
            ethPrice = 1700;
            await setMockPrice(mockedPriceFeed, roundId, ETH_ADDR, ethPrice);

            await callLiquityCloseToCollStrategy(
                botAcc,
                strategyExecutor,
                subId,
                strategySub,
                flAmount,
                balancerFL.address,
                true,
                roundId - 1,
            );

            // balance of eth and lusd should increase
            const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth after closing : ${ethBalanceAfter.toString() / 1e18}`);

            const lusdBalanceAfter = await balanceOf(LUSD_ADDR, senderAcc.address);
            console.log(`Lusd after closing : ${lusdBalanceAfter.toString() / 1e18}`);

            expect(ethBalanceAfter).to.be.gt(ethBalanceBefore);
            expect(lusdBalanceAfter).to.be.gt(lusdBalanceBefore);
        });

        it('... should make a new Liquity close to coll strategy', async () => {
            // create new liq. position
            await depositToWeth(troveAmount);
            await send(WETH_ADDRESS, proxyAddr, troveAmount);

            await liquityOpen(
                proxy,
                maxFeePercentage,
                troveAmount,
                Float2BN(lusdDebt),
                proxyAddr,
                proxyAddr,
            );

            const liquityCloseToCollStrategy = createLiquityCloseToCollStrategy();

            await openStrategyAndBundleStorage();

            const strategyId = await createStrategy(proxy, ...liquityCloseToCollStrategy, false);

            const currPrice = await getChainLinkPrice(ETH_ADDR);

            const targetPrice = currPrice - 100; // Target is smaller so we can execute it

            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subLiquityCloseToCollStrategy(proxy, targetPrice, RATIO_STATE_OVER, strategyId));
        });

        it('... should trigger a Liquity close to coll strategy', async () => {
            // weth amount of trove debt + 1% extra for slippage and fee-s
            const debtEstimate = (parseInt(lusdDebt, 10) * 1.01).toString();
            const flAmount = Float2BN(fetchAmountinUSDPrice('WETH', debtEstimate));

            const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth before closing : ${ethBalanceBefore.toString() / 1e18}`);

            const lusdBalanceBefore = await balanceOf(LUSD_ADDR, senderAcc.address);
            console.log(`Lusd before closing : ${lusdBalanceBefore.toString() / 1e18}`);

            await callLiquityCloseToCollStrategy(
                botAcc,
                strategyExecutor,
                subId,
                strategySub,
                flAmount,
                balancerFL.address,
            );

            // balance of eth and lusd should increase
            const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth after closing : ${ethBalanceAfter.toString() / 1e18}`);

            const lusdBalanceAfter = await balanceOf(LUSD_ADDR, senderAcc.address);
            console.log(`Lusd after closing : ${lusdBalanceAfter.toString() / 1e18}`);

            expect(ethBalanceAfter).to.be.gt(ethBalanceBefore);
            expect(lusdBalanceAfter).to.be.gt(lusdBalanceBefore);
        });

        it('... should fail to trigger the same strategy again as its one time', async () => {
            try {
                // weth amount of trove debt + 1% extra for slippage and fee-s
                const debtEstimate = (parseInt(lusdDebt, 10) * 1.01).toString();
                const flAmount = Float2BN(fetchAmountinUSDPrice('WETH', debtEstimate));

                await callLiquityCloseToCollStrategy(
                    botAcc,
                    strategyExecutor,
                    subId,
                    strategySub,
                    flAmount,
                    balancerFL.address,
                );
            } catch (err) {
                expect(err.toString()).to.have.string('SubNotEnabled');
            }
        });
    });
};

const liquityStrategiesTest = async () => {
    await liquityBoostStrategyTest();
    await liquityRepayStrategyTest();
    await liquityCloseToCollStrategyTest();
};
module.exports = {
    liquityStrategiesTest,
    liquityBoostStrategyTest,
    liquityRepayStrategyTest,
    liquityCloseToCollStrategyTest,
    liquityCBPaybackTest,
};
