const hre = require('hardhat');

const { getAssetInfoByAddress } = require('@defisaver/tokens');
const { expect } = require('chai');
const {
    createMorphoBlueRepayStrategy,
    createMorphoBlueFLDebtRepayStrategy,
    createMorphoBlueFLCollRepayStrategy,
    createMorphoBlueBoostStrategy,
    createMorphoBlueFLDebtBoostStrategy,
    createMorphoBlueFLCollBoostStrategy,
} = require('../../strategies');
const {
    openStrategyAndBundleStorage,
    redeploy, getProxy,
    takeSnapshot, fetchAmountinUSDPrice,
    setBalance, approve, revertToSnapshot,
    Float2BN, getAddrFromRegistry,
    balanceOf, nullAddress, formatMockExchangeObj, setNewExchangeWrapper,
} = require('../../utils');
const { createStrategy, createBundle, addBotCaller } = require('../../utils-strategies');
const {
    morphoBlueBorrow, morphoBlueSupplyCollateral,
} = require('../../actions');
const { subMorphoBlueBoostBundle, subMorphoBlueRepayBundle } = require('../../strategy-subs');
const {
    callMorphoBlueBoostStrategy,
    callMorphoBlueFLCollBoostStrategy,
    callMorphoBlueFLDebtBoostStrategy,
    callMorphoBlueFLCollRepayStrategy,
    callMorphoBlueFLDebtRepayStrategy,
    callMorphoBlueRepayStrategy,
} = require('../../strategy-calls');
const { getMarkets, supplyToMarket, MORPHO_BLUE_ADDRESS } = require('../../morpho-blue/utils');

const createRepayBundle = async (proxy, isFork) => {
    const repayStrategy = createMorphoBlueRepayStrategy();
    const flCollRepayStrategy = createMorphoBlueFLCollRepayStrategy();
    const flDebtRepayStrategy = createMorphoBlueFLDebtRepayStrategy();
    await openStrategyAndBundleStorage(isFork);
    const strategyIdFirst = await createStrategy(proxy, ...repayStrategy, true);
    const strategyIdSecond = await createStrategy(proxy, ...flCollRepayStrategy, true);
    const strategyIdThird = await createStrategy(proxy, ...flDebtRepayStrategy, true);
    return createBundle(
        proxy,
        [strategyIdFirst, strategyIdSecond, strategyIdThird],
    );
};
const createBoostBundle = async (proxy, isFork) => {
    const boostStrategy = createMorphoBlueBoostStrategy();
    const flDebtBoostStrategy = createMorphoBlueFLDebtBoostStrategy();
    const fLCollBoostStrategy = createMorphoBlueFLCollBoostStrategy();
    await openStrategyAndBundleStorage(isFork);
    const strategyIdFirst = await createStrategy(proxy, ...boostStrategy, true);
    const strategyIdSecond = await createStrategy(proxy, ...flDebtBoostStrategy, true);
    const strategyIdThird = await createStrategy(proxy, ...fLCollBoostStrategy, true);
    return createBundle(
        proxy,
        [strategyIdFirst, strategyIdSecond, strategyIdThird],
    );
};

const morphoBlueBoostStrategyTest = async (eoaBoost) => {
    describe('MorphoBlue-Boost-Strategy', function () {
        this.timeout(1200000);
        const markets = getMarkets();
        const SUPPLY_AMOUNT_USD = '100000';
        const DEBT_AMOUNT_USD = '50000';
        const BOOST_AMOUNT_USD = '5000';

        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subId;
        let morphoBlueView;
        let strategySub;
        let boostBundleId;
        let mockWrapper;
        let user;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            proxy = await getProxy(senderAcc.address);
            user = eoaBoost ? senderAcc.address : proxy.address;
            await redeploy('MorphoBlueRatioTrigger');
            await redeploy('MorphoBlueRatioCheck');

            mockWrapper = await redeploy('MockExchangeWrapper');
            await setNewExchangeWrapper(senderAcc, mockWrapper.address);

            const strategyExecutorAddr = await getAddrFromRegistry('StrategyExecutor');
            strategyExecutor = await hre.ethers.getContractAt('StrategyExecutor', strategyExecutorAddr);
            morphoBlueView = await redeploy('MorphoBlueView');

            await addBotCaller(botAcc.address);
        });

        it('... should create a boost bundle', async () => {
            boostBundleId = await createBoostBundle(proxy, false);
        });

        for (let i = 0; i < markets.length; i++) {
            const marketParams = markets[i];
            const loanToken = getAssetInfoByAddress(marketParams[0]);
            const collToken = getAssetInfoByAddress(marketParams[1]);
            let snapshot;
            let collateralAmount;
            let debtAmount;
            let marketId;
            it(`... should create new morphoblue position to be boosted in ${collToken.symbol}/${loanToken.symbol} market for ${eoaBoost ? 'eoa' : 'proxy'}`, async () => {
                await supplyToMarket(marketParams);
                collateralAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(collToken.symbol, SUPPLY_AMOUNT_USD),
                    collToken.decimals,
                );
                debtAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(loanToken.symbol, DEBT_AMOUNT_USD),
                    loanToken.decimals,
                );
                await setBalance(collToken.address, senderAcc.address, collateralAmount);
                if (eoaBoost) {
                    const morphoBlue = await hre.ethers.getContractAt('IMorphoBlue', MORPHO_BLUE_ADDRESS);
                    await approve(collToken.address, morphoBlue.address, senderAcc);
                    await morphoBlue.supplyCollateral(
                        marketParams, collateralAmount, senderAcc.address, [],
                    );
                    await morphoBlue.borrow(marketParams, debtAmount, '0', senderAcc.address, senderAcc.address);
                    const isAuthorized = await morphoBlue.isAuthorized(
                        senderAcc.address, proxy.address,
                    );
                    if (!isAuthorized) {
                        await morphoBlue.setAuthorization(proxy.address, true);
                    }
                } else {
                    await approve(collToken.address, proxy.address);
                    await morphoBlueSupplyCollateral(
                        proxy, marketParams, collateralAmount, senderAcc.address, nullAddress,
                    );
                    await morphoBlueBorrow(
                        proxy, marketParams, debtAmount, nullAddress, senderAcc.address,
                    );
                }
            });
            it('... should subscribe to boost strategy', async () => {
                const targetRatio = Float2BN('1.5');
                const ratioOver = Float2BN('1.8');
                marketId = await morphoBlueView.getMarketId(marketParams);
                ({ subId, strategySub } = await subMorphoBlueBoostBundle(
                    proxy,
                    boostBundleId,
                    marketParams,
                    marketId,
                    ratioOver,
                    targetRatio,
                    user,
                ));
            });
            it(`... should execute boost without FL strategy for ${collToken.symbol}/${loanToken.symbol} market for ${eoaBoost ? 'eoa' : 'proxy'}`, async () => {
                snapshot = await takeSnapshot();
                const ratioBefore = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, user,
                );
                const boostAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(loanToken.symbol, BOOST_AMOUNT_USD),
                    loanToken.decimals,
                );
                const exchangeObj = await formatMockExchangeObj(
                    loanToken,
                    collToken,
                    boostAmount,
                );
                await callMorphoBlueBoostStrategy(
                    botAcc,
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    boostAmount,
                    exchangeObj,
                );
                const ratioAfter = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, user,
                );
                console.log(`Collateral ratio went from ${ratioBefore / 1e16}% to ${ratioAfter / 1e16}%`);
                expect(ratioBefore).to.be.gt(ratioAfter);
                await revertToSnapshot(snapshot);
            });
            it(`... should execute a boost strategy with debt fl for ${collToken.symbol}/${loanToken.symbol} market for ${eoaBoost ? 'eoa' : 'proxy'}`, async () => {
                snapshot = await takeSnapshot();
                const ratioBefore = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, user,
                );
                const boostAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(loanToken.symbol, BOOST_AMOUNT_USD),
                    loanToken.decimals,
                );
                await setBalance(loanToken.address, '0xBA12222222228d8Ba445958a75a0704d566BF2C8', boostAmount);

                const exchangeObj = await formatMockExchangeObj(
                    loanToken,
                    collToken,
                    boostAmount,
                );
                const flActionAddr = await getAddrFromRegistry('FLAction');
                await callMorphoBlueFLDebtBoostStrategy(
                    botAcc,
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    loanToken.address,
                    boostAmount,
                    flActionAddr,
                    exchangeObj,
                );

                const ratioAfter = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, user,
                );
                console.log(`Collateral ratio went from ${ratioBefore / 1e16}% to ${ratioAfter / 1e16}%`);
                expect(ratioBefore).to.be.gt(ratioAfter);
                await revertToSnapshot(snapshot);
            });
            it(`... should execute a boost strategy with coll fl for ${collToken.symbol}/${loanToken.symbol} market for ${eoaBoost ? 'eoa' : 'proxy'}`, async () => {
                snapshot = await takeSnapshot();
                const ratioBefore = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, user,
                );
                const flAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(collToken.symbol, BOOST_AMOUNT_USD),
                    collToken.decimals,
                ); // this is amount of collateral we're flashloaning
                const boostAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(loanToken.symbol, BOOST_AMOUNT_USD * 1.2),
                    loanToken.decimals,
                );
                await setBalance(collToken.address, '0xBA12222222228d8Ba445958a75a0704d566BF2C8', flAmount);
                const exchangeObj = await formatMockExchangeObj(
                    loanToken,
                    collToken,
                    boostAmount,
                );
                const flActionAddr = await getAddrFromRegistry('FLAction');
                const collBefore = await balanceOf(collToken.address, senderAcc.address);
                await callMorphoBlueFLCollBoostStrategy(
                    botAcc,
                    strategyExecutor,
                    2,
                    subId,
                    strategySub,
                    collToken.address,
                    flAmount,
                    flActionAddr,
                    boostAmount,
                    exchangeObj,
                );
                const collAfter = await balanceOf(collToken.address, senderAcc.address);

                const ratioAfter = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, user,
                );
                console.log(`User received ${collAfter.sub(collBefore)} of coll on his EOA`);
                console.log(`Collateral ratio went from ${ratioBefore / 1e16}% to ${ratioAfter / 1e16}%`);
                expect(ratioBefore).to.be.gt(ratioAfter);
                await revertToSnapshot(snapshot);
            });
        }
    });
};

const morphoBlueRepayStrategyTest = async (eoaRepay) => {
    describe('MorphoBlue-Repay-Strategy', function () {
        this.timeout(1200000);
        const markets = getMarkets();
        const SUPPLY_AMOUNT_USD = '100000';
        const DEBT_AMOUNT_USD = '50000';
        const REPAY_AMOUNT_USD = '5000';

        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subId;
        let morphoBlueView;
        let strategySub;
        let repayBundleId;
        let mockWrapper;
        let user;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            proxy = await getProxy(senderAcc.address);
            user = eoaRepay ? senderAcc.address : proxy.address;
            await redeploy('MorphoBlueRatioTrigger');
            await redeploy('MorphoBlueRatioCheck');

            mockWrapper = await redeploy('MockExchangeWrapper');
            await setNewExchangeWrapper(senderAcc, mockWrapper.address);

            const strategyExecutorAddr = await getAddrFromRegistry('StrategyExecutor');
            strategyExecutor = await hre.ethers.getContractAt('StrategyExecutor', strategyExecutorAddr);
            morphoBlueView = await redeploy('MorphoBlueView');

            await addBotCaller(botAcc.address);
        });

        it('... should create a repay bundle', async () => {
            repayBundleId = await createRepayBundle(proxy, false);
        });

        for (let i = 0; i < markets.length; i++) {
            const marketParams = markets[i];
            const loanToken = getAssetInfoByAddress(marketParams[0]);
            const collToken = getAssetInfoByAddress(marketParams[1]);
            let snapshot;
            let collateralAmount;
            let debtAmount;
            let marketId;
            it(`... should create new morphoblue position to be repaid in ${collToken.symbol}/${loanToken.symbol} market for ${eoaRepay ? 'eoa' : 'proxy'}`, async () => {
                await supplyToMarket(marketParams);
                collateralAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(collToken.symbol, SUPPLY_AMOUNT_USD),
                    collToken.decimals,
                );
                debtAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(loanToken.symbol, DEBT_AMOUNT_USD),
                    loanToken.decimals,
                );
                await setBalance(collToken.address, senderAcc.address, collateralAmount);
                if (eoaRepay) {
                    const morphoBlue = await hre.ethers.getContractAt('IMorphoBlue', MORPHO_BLUE_ADDRESS);
                    await approve(collToken.address, morphoBlue.address, senderAcc);
                    await morphoBlue.supplyCollateral(
                        marketParams, collateralAmount, senderAcc.address, [],
                    );
                    await morphoBlue.borrow(marketParams, debtAmount, '0', senderAcc.address, senderAcc.address);
                    const isAuthorized = await morphoBlue.isAuthorized(
                        senderAcc.address, proxy.address,
                    );
                    if (!isAuthorized) {
                        await morphoBlue.setAuthorization(proxy.address, true);
                    }
                } else {
                    await approve(collToken.address, proxy.address);
                    await morphoBlueSupplyCollateral(
                        proxy, marketParams, collateralAmount, senderAcc.address, nullAddress,
                    );
                    await morphoBlueBorrow(
                        proxy, marketParams, debtAmount, nullAddress, senderAcc.address,
                    );
                }
            });
            it('... should subscribe to repay strategy', async () => {
                const ratioUnder = Float2BN('2.5');
                const targetRatio = Float2BN('3');
                marketId = await morphoBlueView.getMarketId(marketParams);
                ({ subId, strategySub } = await subMorphoBlueRepayBundle(
                    proxy,
                    repayBundleId,
                    marketParams,
                    marketId,
                    ratioUnder,
                    targetRatio,
                    user,
                ));
            });
            it(`... should execute repay without FL strategy for ${collToken.symbol}/${loanToken.symbol} market for ${eoaRepay ? 'eoa' : 'proxy'}`, async () => {
                snapshot = await takeSnapshot();
                const ratioBefore = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, user,
                );
                const repayAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(collToken.symbol, REPAY_AMOUNT_USD),
                    collToken.decimals,
                );
                const exchangeObj = await formatMockExchangeObj(
                    collToken,
                    loanToken,
                    repayAmount,
                );
                await callMorphoBlueRepayStrategy(
                    botAcc,
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    repayAmount,
                    exchangeObj,
                );
                const ratioAfter = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, user,
                );
                console.log(`Collateral ratio went from ${ratioBefore / 1e16}% to ${ratioAfter / 1e16}%`);
                expect(ratioAfter).to.be.gt(ratioBefore);
                await revertToSnapshot(snapshot);
            });
            it(`... should execute a repay strategy with coll fl for ${collToken.symbol}/${loanToken.symbol} market for ${eoaRepay ? 'eoa' : 'proxy'}`, async () => {
                snapshot = await takeSnapshot();
                const ratioBefore = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, user,
                );
                const repayAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(collToken.symbol, REPAY_AMOUNT_USD),
                    collToken.decimals,
                );
                await setBalance(collToken.address, '0xBA12222222228d8Ba445958a75a0704d566BF2C8', repayAmount);

                const exchangeObj = await formatMockExchangeObj(
                    collToken,
                    loanToken,
                    repayAmount,
                );
                const flActionAddr = await getAddrFromRegistry('FLAction');
                await callMorphoBlueFLCollRepayStrategy(
                    botAcc,
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    collToken.address,
                    repayAmount,
                    flActionAddr,
                    exchangeObj,
                );

                const ratioAfter = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, user,
                );
                console.log(`Collateral ratio went from ${ratioBefore / 1e16}% to ${ratioAfter / 1e16}%`);
                expect(ratioAfter).to.be.gt(ratioBefore);
                await revertToSnapshot(snapshot);
            });
            it(`... should execute a repay strategy with debt fl for ${collToken.symbol}/${loanToken.symbol} market for ${eoaRepay ? 'eoa' : 'proxy'}`, async () => {
                snapshot = await takeSnapshot();
                const ratioBefore = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, user,
                );
                const flAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(loanToken.symbol, REPAY_AMOUNT_USD),
                    loanToken.decimals,
                ); // this is amount of collateral we're flashloaning
                const repayAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(collToken.symbol, REPAY_AMOUNT_USD * 1.2),
                    collToken.decimals,
                );
                await setBalance(loanToken.address, '0xBA12222222228d8Ba445958a75a0704d566BF2C8', flAmount);
                const exchangeObj = await formatMockExchangeObj(
                    collToken,
                    loanToken,
                    repayAmount,
                );
                const flActionAddr = await getAddrFromRegistry('FLAction');
                const loanTokenBefore = await balanceOf(loanToken.address, senderAcc.address);
                await callMorphoBlueFLDebtRepayStrategy(
                    botAcc,
                    strategyExecutor,
                    2,
                    subId,
                    strategySub,
                    loanToken.address,
                    flAmount,
                    flActionAddr,
                    repayAmount,
                    exchangeObj,
                );
                const loanTokenAfter = await balanceOf(loanToken.address, senderAcc.address);

                const ratioAfter = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, user,
                );
                console.log(`User received ${loanTokenAfter.sub(loanTokenBefore)} of coll on his EOA`);
                console.log(`Collateral ratio went from ${ratioBefore / 1e16}% to ${ratioAfter / 1e16}%`);
                expect(ratioAfter).to.be.gt(ratioBefore);
                await revertToSnapshot(snapshot);
            });
        }
    });
};

module.exports = {
    morphoBlueRepayStrategyTest,
    morphoBlueBoostStrategyTest,
};
