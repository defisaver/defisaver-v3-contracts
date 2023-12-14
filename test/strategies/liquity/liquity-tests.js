const { ethers } = require('hardhat');
const { expect } = require('chai');
const hre = require('hardhat');

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
    getContractFromRegistry,
    setBalance,
    approve,
    DAI_ADDR,
    addrs,
    getLocalTokenPrice,
    setContractAt,
    getAddrFromRegistry,
} = require('../../utils');

const { createStrategy, addBotCaller, createBundle } = require('../../utils-strategies');

const {
    getRatio, getHints, LiquityActionIds, getTroveInfo,
} = require('../../utils-liquity');

const {
    callLiquityBoostStrategy,
    callLiquityFLBoostStrategy,
    callLiquityFLRepayStrategy,
    callLiquityRepayStrategy,
    callLiquityCloseToCollStrategy,
    callLiquityPaybackChickenOutStrategy,
    callLiquityPaybackChickenInStrategy,
    callLiquityFLBoostWithCollStrategy,
    callLiquityDsrPaybackStrategy,
    callLiquityDsrSupplyStrategy,
    callLiquityDebtInFrontRepayStrategy,
} = require('../../strategy-calls');

const {
    subLiquityCloseToCollStrategy,
    subLiquityTrailingCloseToCollStrategy,
    subCbRebondStrategy,
    subLiquityCBPaybackStrategy,
    subLiquityAutomationStrategy,
    subLiqutityDsrPaybackStrategy,
    subLiqutityDsrSupplyStrategy,
    subLiquityDebtInFrontRepayStrategy,
} = require('../../strategy-subs');

const {
    createLiquityBoostStrategy,
    createLiquityFLBoostStrategy,
    createLiquityRepayStrategy,
    createLiquityFLRepayStrategy,
    createLiquityCloseToCollStrategy,
    createLiquityPaybackChickenInStrategy,
    createLiquityPaybackChickenOutStrategy,
    createLiquityFLBoostWithCollStrategy,
    createLiquityDsrPaybackStrategy,
    createLiquityDsrSupplyStrategy,
    createLiquityDebtInFrontRepayStrategy,
} = require('../../strategies');

const { RATIO_STATE_OVER } = require('../../triggers');

const { liquityOpen, createChickenBond, mcdDsrDeposit } = require('../../actions');

const BLOCKS_PER_6H = 1662;

const MAX_FEE_PERCENTAGE = Float2BN('5', 16);
const COLL_OPEN_AMOUNT_USD = '30000';
const DEBT_OPEN_AMOUNT_USD = '12000';

const BOOST_AMOUNT_USD = '2000';
const REPAY_AMOUNT_USD = '2000';

const MAX_RATIO = '2.3';
const TARGET_BOOST = '2';
const MIN_RATIO = '2.7';
const TARGET_REPAY = '3';

const liquityBoostStrategyTest = async () => {
    describe('Liquity-Boost-Bundle', function () {
        this.timeout(1200000);

        let flAction;

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let subId;
        let liquityView;
        let strategySub;
        let snapshotId;

        before(async () => {
            await ethers.provider.getBlockNumber()
                .then((e) => resetForkToBlock(Math.floor(e / BLOCKS_PER_6H) * BLOCKS_PER_6H));

            senderAcc = (await ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
            botAcc = (await ethers.getSigners())[1];

            flAction = await getContractFromRegistry('FLAction');
            await getContractFromRegistry('DFSSell');
            await getContractFromRegistry('GasFeeTaker');

            strategyExecutor = await getContractFromRegistry('StrategyExecutor');

            liquityView = await getContractFromRegistry('LiquityView');
            await getContractFromRegistry('LiquityOpen');
            await getContractFromRegistry('LiquitySupply');
            await getContractFromRegistry('LiquityBorrow');
            await redeploy('LiquityRatioTrigger');
            await getContractFromRegistry('LiquityRatioCheck');
            await getContractFromRegistry('LiquityAdjust');

            await addBotCaller(botAcc.address);

            const collAmount = Float2BN(fetchAmountinUSDPrice('WETH', COLL_OPEN_AMOUNT_USD));
            const debtAmount = Float2BN(fetchAmountinUSDPrice('LUSD', DEBT_OPEN_AMOUNT_USD));
            await depositToWeth(collAmount);
            await send(WETH_ADDRESS, proxyAddr, collAmount);

            await liquityOpen(
                proxy,
                MAX_FEE_PERCENTAGE,
                collAmount,
                debtAmount,
                proxyAddr,
                proxyAddr,
            );
        });

        it('... should make a Liquity Boost bundle and subscribe', async () => {
            const liquityBoostStrategy = createLiquityBoostStrategy();
            const liquityFLBoostStrategy = createLiquityFLBoostStrategy();
            const LiquityFLBoostWithCollStrategy = createLiquityFLBoostWithCollStrategy();

            await openStrategyAndBundleStorage();

            const strategyId1 = await createStrategy(proxy, ...liquityBoostStrategy, true);
            const strategyId2 = await createStrategy(proxy, ...liquityFLBoostStrategy, true);
            // eslint-disable-next-line max-len
            const strategyId3 = await createStrategy(proxy, ...LiquityFLBoostWithCollStrategy, true);

            const bundleId = await createBundle(proxy, [strategyId1, strategyId2, strategyId3]);

            const ratioOver = Float2BN(MAX_RATIO);
            const targetRatio = Float2BN(TARGET_BOOST);

            await getContractFromRegistry('LiquitySubProxy', undefined, undefined, undefined, '0', bundleId);
            ({ boostSubId: subId, boostSub: strategySub } = await subLiquityAutomationStrategy(proxy, '0', ratioOver, targetRatio, '0', true));

            snapshotId = await takeSnapshot();
        });

        it('... should trigger a Liquity Boost strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);

            const boostAmount = Float2BN(fetchAmountinUSDPrice('LUSD', BOOST_AMOUNT_USD));

            // eslint-disable-next-line max-len
            await callLiquityBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount, proxyAddr, MAX_FEE_PERCENTAGE);

            const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.gt(ratioAfter);
            await revertToSnapshot(snapshotId);
            snapshotId = await takeSnapshot();
        });

        it('... should trigger a Liquity FL Boost strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
            const boostAmount = Float2BN(fetchAmountinUSDPrice('LUSD', BOOST_AMOUNT_USD));

            // eslint-disable-next-line max-len
            await callLiquityFLBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount, proxyAddr, flAction.address, MAX_FEE_PERCENTAGE);

            const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.gt(ratioAfter);
            await revertToSnapshot(snapshotId);
        });

        it('... should trigger a Liquity FL Boost with Coll strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
            const boostAmount = Float2BN(fetchAmountinUSDPrice('LUSD', BOOST_AMOUNT_USD));

            // eslint-disable-next-line max-len
            await callLiquityFLBoostWithCollStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount, proxyAddr, flAction.address, MAX_FEE_PERCENTAGE);

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

        let flAction;

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let subId;
        let liquityView;
        let strategySub;
        let snapshotId;

        before(async () => {
            await ethers.provider.getBlockNumber()
                .then((e) => resetForkToBlock(Math.floor(e / BLOCKS_PER_6H) * BLOCKS_PER_6H));

            senderAcc = (await ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
            botAcc = (await ethers.getSigners())[1];

            console.log(proxyAddr);

            strategyExecutor = await getContractFromRegistry('StrategyExecutor');

            flAction = await getContractFromRegistry('FLAction');

            await getContractFromRegistry('DFSSell');
            await getContractFromRegistry('GasFeeTaker');

            liquityView = await getContractFromRegistry('LiquityView');
            await getContractFromRegistry('LiquityOpen');
            await getContractFromRegistry('LiquityWithdraw');
            await getContractFromRegistry('LiquityPayback');
            await redeploy('LiquityRatioTrigger');
            await getContractFromRegistry('LiquityRatioCheck');
            await getContractFromRegistry('LiquityAdjust');

            await addBotCaller(botAcc.address);

            const collAmount = Float2BN(fetchAmountinUSDPrice('WETH', COLL_OPEN_AMOUNT_USD));
            const debtAmount = Float2BN(fetchAmountinUSDPrice('LUSD', DEBT_OPEN_AMOUNT_USD));
            await depositToWeth(collAmount);
            await send(WETH_ADDRESS, proxyAddr, collAmount);

            await liquityOpen(
                proxy,
                MAX_FEE_PERCENTAGE,
                collAmount,
                debtAmount,
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

            const ratioUnder = Float2BN(MIN_RATIO);
            const targetRatio = Float2BN(TARGET_REPAY);

            await getContractFromRegistry('LiquitySubProxy', undefined, undefined, undefined, bundleId, '0');
            ({ repaySubId: subId, repaySub: strategySub } = await subLiquityAutomationStrategy(proxy, ratioUnder, '0', '0', targetRatio, false));

            snapshotId = await takeSnapshot();
        });

        it('... should trigger a Liquity Repay strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
            const repayAmount = Float2BN(fetchAmountinUSDPrice('WETH', REPAY_AMOUNT_USD));

            // eslint-disable-next-line max-len
            await callLiquityRepayStrategy(botAcc, strategyExecutor, subId, strategySub, repayAmount, proxyAddr, MAX_FEE_PERCENTAGE);

            const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.lt(ratioAfter);
            await revertToSnapshot(snapshotId);
        });

        it('... should trigger a Liquity FL Repay strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
            const repayAmount = Float2BN(fetchAmountinUSDPrice('WETH', REPAY_AMOUNT_USD));

            // eslint-disable-next-line max-len
            await callLiquityFLRepayStrategy(botAcc, strategyExecutor, subId, strategySub, repayAmount, proxyAddr, flAction.address, MAX_FEE_PERCENTAGE);

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

        const lusdDebt = '10000';
        const lusdDebtHalf = (lusdDebt / 2).toString();
        const troveAmount = Float2BN(fetchAmountinUSDPrice('WETH', '20000'));
        const forkedBlock = 16035000; // doing this to optimize hints fetching

        before(async () => {
            await resetForkToBlock(forkedBlock);
            senderAcc = (await ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
            botAcc = (await ethers.getSigners())[1];

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
                MAX_FEE_PERCENTAGE,
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

        const lusdDebt = '12000';
        const troveAmount = Float2BN(fetchAmountinUSDPrice('WETH', '30000'));
        const forkedBlock = 15313530; // doing this to optimize hints fetching

        before(async () => {
            await resetForkToBlock(forkedBlock);

            senderAcc = (await ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
            botAcc = (await ethers.getSigners())[1];

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
                MAX_FEE_PERCENTAGE,
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
                MAX_FEE_PERCENTAGE,
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

const liquityDsrPaybackStrategyTest = () => describe('Liquity-Dsr-Payback', () => {
    let strategyExecutorByBot;
    let strategyId;

    let senderAcc;
    let proxy;
    let subId;
    let strategySub;

    before(async () => {
        let botAcc;
        [senderAcc, botAcc] = await ethers.getSigners();
        proxy = await getProxy(senderAcc.address);

        await addBotCaller(botAcc.address);
        const strategyExecutor = await getContractFromRegistry('StrategyExecutor');
        strategyExecutorByBot = await strategyExecutor.connect(botAcc);

        const wrapper = await getContractFromRegistry('MockExchangeWrapper');
        await setNewExchangeWrapper(senderAcc, wrapper.address);

        await setContractAt({ name: 'LiquityPayback', address: await getAddrFromRegistry('LiquityPayback') });
    });

    it('... should create strategy', async () => {
        await openStrategyAndBundleStorage();
        const paybackStrategy = createLiquityDsrPaybackStrategy();
        strategyId = await createStrategy(proxy, ...paybackStrategy, true);
    });
    it('... should open position and subscribe by proxy', async () => {
        const collOpenAmount = Float2BN(fetchAmountinUSDPrice('WETH', COLL_OPEN_AMOUNT_USD));
        const debtOpenAmount = Float2BN(DEBT_OPEN_AMOUNT_USD);

        await depositToWeth(collOpenAmount);
        await approve(WETH_ADDRESS, proxy.address);
        await liquityOpen(
            proxy,
            MAX_FEE_PERCENTAGE,
            collOpenAmount,
            debtOpenAmount,
            senderAcc.address,
            senderAcc.address,
        );

        ({ subId, strategySub } = await subLiqutityDsrPaybackStrategy({
            proxy,
            strategyId,
            triggerRatio: Float2BN(MIN_RATIO),
            targetRatio: Float2BN(TARGET_REPAY),
        }));
    });
    it('... should deposit into dsr then trigger payback strategy', async () => {
        const { debtAmount: debtBefore } = await getTroveInfo(proxy.address);
        const feeReceiverDaiBefore = await balanceOf(DAI_ADDR, addrs.mainnet.FEE_RECEIVER);
        const feeReceiverLusdBefore = await balanceOf(LUSD_ADDR, addrs.mainnet.FEE_RECEIVER);

        const paybackAmount = Float2BN(REPAY_AMOUNT_USD);

        await setBalance(DAI_ADDR, proxy.address, paybackAmount);
        await mcdDsrDeposit(proxy, paybackAmount, proxy.address);
        await callLiquityDsrPaybackStrategy({
            strategyExecutorByBot,
            subId,
            sub: strategySub,
            proxy,
            daiWithdrawAmount: paybackAmount,
        });

        const rate = Float2BN(
            (getLocalTokenPrice('DAI')
            / getLocalTokenPrice('LUSD')).toFixed(18),
            18,
        );
        const { debtAmount: debtAfter } = await getTroveInfo(proxy.address);
        const feeReceiverDaiAfter = await balanceOf(DAI_ADDR, addrs.mainnet.FEE_RECEIVER);
        const feeReceiverLusdAfter = await balanceOf(LUSD_ADDR, addrs.mainnet.FEE_RECEIVER);

        const lusdFee = feeReceiverLusdAfter.sub(feeReceiverLusdBefore);
        const daiFeeInLusd = feeReceiverDaiAfter.sub(feeReceiverDaiBefore).mul(rate).div(Float2BN('1'));
        const totalFees = lusdFee.add(daiFeeInLusd);

        const paybackAmountInLusd = paybackAmount.mul(rate).div(Float2BN('1'));

        expect(await balanceOf(DAI_ADDR, proxy.address)).to.be.eq('0');
        expect(await balanceOf(LUSD_ADDR, proxy.address)).to.be.eq('0');
        expect(await balanceOf(WETH_ADDRESS, proxy.address)).to.be.eq('0');
        expect(debtBefore.sub(debtAfter)).to.be.eq(paybackAmountInLusd.sub(totalFees));
    });
});

const liquityDsrSupplyStrategyTest = () => describe('Liquity-Dsr-Supply', () => {
    let strategyExecutorByBot;
    let strategyId;

    let senderAcc;
    let proxy;
    let subId;
    let strategySub;

    before(async () => {
        let botAcc;
        [senderAcc, botAcc] = await ethers.getSigners();
        proxy = await getProxy(senderAcc.address);

        await addBotCaller(botAcc.address);
        const strategyExecutor = await getContractFromRegistry('StrategyExecutor');
        strategyExecutorByBot = await strategyExecutor.connect(botAcc);

        const wrapper = await getContractFromRegistry('MockExchangeWrapper');
        await setNewExchangeWrapper(senderAcc, wrapper.address);
    });

    it('... should create strategy', async () => {
        await openStrategyAndBundleStorage();
        const supplyStrategy = createLiquityDsrSupplyStrategy();
        strategyId = await createStrategy(proxy, ...supplyStrategy, true);
    });
    it('... should open position and subscribe by proxy', async () => {
        const collOpenAmount = Float2BN(fetchAmountinUSDPrice('WETH', COLL_OPEN_AMOUNT_USD));
        const debtOpenAmount = Float2BN(DEBT_OPEN_AMOUNT_USD);

        await depositToWeth(collOpenAmount);
        await approve(WETH_ADDRESS, proxy.address);
        await liquityOpen(
            proxy,
            MAX_FEE_PERCENTAGE,
            collOpenAmount,
            debtOpenAmount,
            senderAcc.address,
            senderAcc.address,
        );

        ({ subId, strategySub } = await subLiqutityDsrSupplyStrategy({
            proxy,
            strategyId,
            triggerRatio: Float2BN(MIN_RATIO),
            targetRatio: Float2BN(TARGET_REPAY),
        }));
    });
    it('... should deposit into dsr then trigger supply strategy', async () => {
        const { collAmount: collBefore } = await getTroveInfo(proxy.address);
        const feeReceiverDaiBefore = await balanceOf(DAI_ADDR, addrs.mainnet.FEE_RECEIVER);
        const feeReceiverWethBefore = await balanceOf(WETH_ADDRESS, addrs.mainnet.FEE_RECEIVER);

        const supplyAmount = Float2BN(REPAY_AMOUNT_USD);

        await setBalance(DAI_ADDR, proxy.address, supplyAmount);
        await mcdDsrDeposit(proxy, supplyAmount, proxy.address);
        await callLiquityDsrSupplyStrategy({
            strategyExecutorByBot,
            subId,
            sub: strategySub,
            proxy,
            daiWithdrawAmount: supplyAmount,
        });

        const rate = Float2BN(
            (getLocalTokenPrice('DAI')
            / getLocalTokenPrice('WETH')).toFixed(18),
            18,
        );
        const { collAmount: collAfter } = await getTroveInfo(proxy.address);
        const feeReceiverDaiAfter = await balanceOf(DAI_ADDR, addrs.mainnet.FEE_RECEIVER);
        const feeReceiverWethAfter = await balanceOf(WETH_ADDRESS, addrs.mainnet.FEE_RECEIVER);

        const lusdFee = feeReceiverWethAfter.sub(feeReceiverWethBefore);
        const daiFeeInWeth = feeReceiverDaiAfter.sub(feeReceiverDaiBefore).mul(rate).div(Float2BN('1'));
        const totalFees = lusdFee.add(daiFeeInWeth);

        const supplyAmountInWeth = supplyAmount.mul(rate).div(Float2BN('1'));

        expect(await balanceOf(DAI_ADDR, proxy.address)).to.be.eq('0');
        expect(await balanceOf(LUSD_ADDR, proxy.address)).to.be.eq('0');
        expect(await balanceOf(WETH_ADDRESS, proxy.address)).to.be.eq('0');
        expect(collAfter.sub(collBefore)).to.be.eq(supplyAmountInWeth.sub(totalFees));
    });
});

const liquityDebtInFrontRepayStrategyTest = async () => {
    describe('Liquity-DebtInFront-Repay-Strategy', function () {
        this.timeout(1200000);

        const collAmountDollar = '20000';
        const debtAmountDollar = '10500';

        let flAction;

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let subId;
        let liquityView;
        let strategySub;
        let currDebtInFront;
        let snapshotId;

        before(async () => {
            await resetForkToBlock(18275000);

            senderAcc = (await ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
            botAcc = (await ethers.getSigners())[1];

            console.log(proxyAddr);

            strategyExecutor = await redeploy('StrategyExecutor');

            flAction = await redeploy('FLAction');

            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityAdjust');

            await redeploy('LiquityDebtInFrontWithLimitTrigger');
            await redeploy('LiquityRatioIncreaseCheck');

            await redeploy('RecipeExecutor');

            await addBotCaller(botAcc.address);

            const collAmountWei = Float2BN(fetchAmountinUSDPrice('WETH', collAmountDollar));
            const debtAmountWei = Float2BN(fetchAmountinUSDPrice('LUSD', debtAmountDollar));
            await depositToWeth(collAmountWei);
            await send(WETH_ADDRESS, proxyAddr, collAmountWei);

            await liquityOpen(
                proxy,
                MAX_FEE_PERCENTAGE,
                collAmountWei,
                debtAmountWei,
                proxyAddr,
                proxyAddr,
            );

            currDebtInFront = await liquityView.getDebtInFront(proxyAddr, 0, 500);
            console.log(`Current debt in front is ${currDebtInFront[1] / 1e18}`);
        });

        it('... should make a new Liquity Repay strategy and subscribe', async () => {
            const liquityDebtInFrontRepayStrategy = createLiquityDebtInFrontRepayStrategy();

            await openStrategyAndBundleStorage();

            const strategyId = await createStrategy(
                proxy,
                ...liquityDebtInFrontRepayStrategy,
                true,
            );

            console.log(currDebtInFront[1]);

            const targetRatioIncrease = hre.ethers.utils.parseUnits('20', 16); //  20%
            const debtInFront = hre.ethers.utils.parseUnits('80000000', 18); // bigger than the current debtInFront

            // sub
            ({ subId, strategySub } = await subLiquityDebtInFrontRepayStrategy(
                proxy, strategyId, debtInFront, targetRatioIncrease,
            ));

            snapshotId = await takeSnapshot();
        });

        it('... should trigger a Liquity debt in front Repay strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
            const repayAmount = Float2BN(fetchAmountinUSDPrice('WETH', '500'));

            // eslint-disable-next-line max-len
            await callLiquityDebtInFrontRepayStrategy(
                botAcc,
                strategyExecutor,
                proxyAddr,
                subId,
                strategySub,
                repayAmount,
                flAction.address,
            );

            const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.lt(ratioAfter);
        });
    });
};

const liquityStrategiesTest = async () => {
    await liquityBoostStrategyTest();
    await liquityRepayStrategyTest();
    await liquityCloseToCollStrategyTest();
    await liquityDsrPaybackStrategyTest();
    await liquityDsrSupplyStrategyTest();
    await liquityDebtInFrontRepayStrategyTest();
};

module.exports = {
    liquityStrategiesTest,
    liquityBoostStrategyTest,
    liquityRepayStrategyTest,
    liquityCloseToCollStrategyTest,
    liquityCBPaybackTest,
    liquityDsrPaybackStrategyTest,
    liquityDsrSupplyStrategyTest,
    liquityDebtInFrontRepayStrategyTest,
};
