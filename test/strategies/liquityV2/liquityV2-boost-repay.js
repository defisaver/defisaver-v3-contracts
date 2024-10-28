/* eslint-disable max-len */
const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    network,
    addrs,
    takeSnapshot,
    revertToSnapshot,
    isNetworkFork,
    getOwnerAddr,
    getContractFromRegistry,
    openStrategyAndBundleStorage,
    getNetwork,
    formatExchangeObjSdk,
    DAI_ADDR,
    setBalance,
} = require('../../utils');

const {
    addBotCaller,
    createStrategy,
    createBundle,
} = require('../../utils-strategies');

const { topUp } = require('../../../scripts/utils/fork');
const {
    createLiquityV2RepayStrategy, createLiquityV2FLRepayStrategy, createLiquityV2BoostStrategy, createLiquityV2FLBoostStrategy, createLiquityV2FLBoostWithCollStrategy,
} = require('../../strategies');
const { liquityV2Open, uniV3CreatePool } = require('../../actions');
const { getLiquityV2TestPairs, getLiquityV2AdjustBorrowMaxUpfrontFee } = require('../../utils-liquityV2');
const { subLiquityV2RepayBundle, subLiquityV2BoostBundle } = require('../../strategy-subs');
const {
    callLiquityV2RepayStrategy, callLiquityV2FLRepayStrategy, callLiquityV2BoostStrategy, callLiquityV2FLBoostWithCollStrategy, callLiquityV2FLBoostStrategy,
} = require('../../strategy-calls');

const deployLiquityV2RepayBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const repayStrategy = createLiquityV2RepayStrategy();
    const flRepayStrategy = createLiquityV2FLRepayStrategy();
    const repayStrategyId = await createStrategy(proxy, ...repayStrategy, true);
    const flRepayStrategyId = await createStrategy(proxy, ...flRepayStrategy, true);
    const bundleId = await createBundle(proxy, [repayStrategyId, flRepayStrategyId]);
    return bundleId;
};

const deployLiquityV2BoostBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const boostStrategy = createLiquityV2BoostStrategy();
    const flBoostStrategy = createLiquityV2FLBoostStrategy();
    const flBoostWithCollStrategy = createLiquityV2FLBoostWithCollStrategy();
    const boostStrategyId = await createStrategy(proxy, ...boostStrategy, true);
    const flBoostStrategyId = await createStrategy(proxy, ...flBoostStrategy, true);
    const flBoostWithCollStrategyId = await createStrategy(proxy, ...flBoostWithCollStrategy, true);
    const bundleId = await createBundle(proxy, [boostStrategyId, flBoostStrategyId, flBoostWithCollStrategyId]);
    return bundleId;
};

const liquityV2LeverageManagementStrategyTest = async (testPairs, isFork) => {
    describe('LiquityV2-Repay-Strategy-Test', function () {
        this.timeout(1200000);

        const REGISTRY_ADDR = addrs[network].REGISTRY_ADDR;
        const BOLD_TOKEN = '0x2b4773b486e5ed382f4adb79e818519c6ba2ee58';

        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let flAction;
        let repayBundleId;
        let boostBundleId;
        let viewContract;

        const setUpCallers = async () => {
            [senderAcc, botAcc] = await hre.ethers.getSigners();
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(botAcc.address);
                await topUp(getOwnerAddr());
            }
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            proxy = proxy.connect(senderAcc);
        };

        const setUpContracts = async () => {
            strategyExecutor = await hre.ethers.getContractAt('StrategyExecutor', addrs[getNetwork()].STRATEGY_EXECUTOR_ADDR);
            strategyExecutor = strategyExecutor.connect(botAcc);
            flAction = await getContractFromRegistry('FLAction', REGISTRY_ADDR, false, isFork);
            viewContract = await getContractFromRegistry('LiquityV2View', REGISTRY_ADDR, false, isFork);
        };

        const provideBoldLiquidity = async () => {
            const dai = DAI_ADDR;
            const boldAmount = hre.ethers.utils.parseUnits('1000000000', 18);
            const daiAmount = hre.ethers.utils.parseUnits('1000000000', 18);
            await setBalance(BOLD_TOKEN, senderAcc.address, boldAmount);
            await setBalance(dai, senderAcc.address, daiAmount);
            await uniV3CreatePool(
                proxy,
                BOLD_TOKEN,
                dai,
                '100',
                -101, // math.floor(math.log(p, 1.0001)) where p is 0.99
                99, // math.floor(math.log(p, 1.0001)) where p is 1.01
                boldAmount,
                daiAmount,
                senderAcc.address,
                senderAcc.address,
                '79228162514264337593543950336', // 2**96
            );
        };
        const openTrove = async (testPair, collAmount, boldAmount) => {
            const collAsset = getAssetInfo(testPair.supplyTokenSymbol);
            const interestRate = hre.ethers.utils.parseUnits('1', 16);
            const ownerIndex = 11;

            await liquityV2Open(
                proxy,
                testPair.market,
                testPair.collIndex,
                collAsset.address,
                collAmount,
                boldAmount,
                interestRate,
                hre.ethers.constants.AddressZero,
                ownerIndex,
                senderAcc.address,
                senderAcc.address,
                isFork,
            );

            const encodedData = hre.ethers.utils.defaultAbiCoder.encode(
                ['address', 'uint256'],
                [proxy.address, ownerIndex],
            );
            const troveId = hre.ethers.utils.keccak256(encodedData);

            return troveId;
        };

        before(async () => {
            console.log('isFork', isFork);
            await setUpCallers();
            await setUpContracts();
            repayBundleId = await deployLiquityV2RepayBundle(proxy, isFork);
            boostBundleId = await deployLiquityV2BoostBundle(proxy, isFork);
            console.log('repay bundleId', repayBundleId);
            console.log('boost bundleId', boostBundleId);
            await addBotCaller(botAcc.address, REGISTRY_ADDR, isFork);
            await provideBoldLiquidity();
        });
        beforeEach(async () => { snapshotId = await takeSnapshot(); });
        afterEach(async () => { await revertToSnapshot(snapshotId); });

        /* //////////////////////////////////////////////////////////////
                                     TESTS
        ////////////////////////////////////////////////////////////// */
        for (let i = 0; i < testPairs.length; i++) {
            const collAsset = getAssetInfo(testPairs[i].supplyTokenSymbol);
            it('... should call LiquityV2 repay strategy', async () => {
                const supplyAmount = hre.ethers.utils.parseUnits('10', 18); // 25k
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18); // 15k
                const troveId = await openTrove(testPairs[i], supplyAmount, boldAmount);
                console.log('troveId', troveId);

                const minRatio = 180;
                const targetRatio = i === 0 ? 205 : 225;
                const { subId, strategySub } = await subLiquityV2RepayBundle(
                    proxy,
                    testPairs[i].market,
                    troveId,
                    minRatio,
                    targetRatio,
                    repayBundleId,
                );

                const troveInfoBefore = await viewContract.getTroveInfo(testPairs[i].market, troveId);
                const ratioBefore = troveInfoBefore.TCRatio;
                console.log('ratioBefore', ratioBefore.toString());

                const repayAmount = supplyAmount.div(5);

                const exchangeObject = await formatExchangeObjSdk(
                    collAsset.address,
                    BOLD_TOKEN,
                    repayAmount,
                    addrs[network].UNISWAP_V3_WRAPPER,
                    false,
                    true,
                );

                await callLiquityV2RepayStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                    BOLD_TOKEN,
                );

                const troveInfoAfter = await viewContract.getTroveInfo(testPairs[i].market, troveId);
                const ratioAfter = troveInfoAfter.TCRatio;
                console.log('ratioAfter', ratioAfter.toString());

                expect(ratioAfter).to.be.gt(ratioBefore);
            });
            it('... should call LiquityV2 FL repay strategy', async () => {
                const supplyAmount = hre.ethers.utils.parseUnits('10', 18); // 25k
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18); // 15k
                const troveId = await openTrove(testPairs[i], supplyAmount, boldAmount);
                console.log('troveId', troveId);

                const minRatio = 180;
                const targetRatio = i === 0 ? 205 : 225;
                const { subId, strategySub } = await subLiquityV2RepayBundle(
                    proxy,
                    testPairs[i].market,
                    troveId,
                    minRatio,
                    targetRatio,
                    repayBundleId,
                );

                const troveInfoBefore = await viewContract.getTroveInfo(testPairs[i].market, troveId);
                const ratioBefore = troveInfoBefore.TCRatio;
                console.log('ratioBefore', ratioBefore.toString());

                const repayAmount = supplyAmount.div(5);

                const exchangeObject = await formatExchangeObjSdk(
                    collAsset.address,
                    BOLD_TOKEN,
                    repayAmount,
                    addrs[network].UNISWAP_V3_WRAPPER,
                    false,
                    true,
                );

                await callLiquityV2FLRepayStrategy(
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                    collAsset.address,
                    BOLD_TOKEN,
                    flAction.address,
                );

                const troveInfoAfter = await viewContract.getTroveInfo(testPairs[i].market, troveId);
                const ratioAfter = troveInfoAfter.TCRatio;
                console.log('ratioAfter', ratioAfter.toString());

                expect(ratioAfter).to.be.gt(ratioBefore);
            });
            it('... should call LiquityV2 boost strategy', async () => {
                const supplyAmount = hre.ethers.utils.parseUnits('20', 18); // 50k
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18); // 15k
                const troveId = await openTrove(testPairs[i], supplyAmount, boldAmount);
                console.log('troveId', troveId);

                const maxRatio = 300;
                const targetRatio = 265;
                const { subId, strategySub } = await subLiquityV2BoostBundle(
                    proxy,
                    testPairs[i].market,
                    troveId,
                    maxRatio,
                    targetRatio,
                    boostBundleId,
                );

                const troveInfoBefore = await viewContract.getTroveInfo(testPairs[i].market, troveId);
                const ratioBefore = troveInfoBefore.TCRatio;
                console.log('ratioBefore', ratioBefore.toString());

                const boostAmount = boldAmount.div(3);

                const exchangeObject = await formatExchangeObjSdk(
                    BOLD_TOKEN,
                    collAsset.address,
                    boostAmount,
                    addrs[network].UNISWAP_V3_WRAPPER,
                    true,
                    false,
                );

                const maxUpfrontFee = await getLiquityV2AdjustBorrowMaxUpfrontFee(
                    testPairs[i].market,
                    testPairs[i].collIndex,
                    troveId,
                    boostAmount,
                );

                await callLiquityV2BoostStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    collAsset.address,
                    maxUpfrontFee,
                );

                const troveInfoAfter = await viewContract.getTroveInfo(testPairs[i].market, troveId);
                const ratioAfter = troveInfoAfter.TCRatio;
                console.log('ratioAfter', ratioAfter.toString());

                expect(ratioBefore).to.be.gt(ratioAfter);
            });
            it('... should call LiquityV2 fl boost strategy', async () => {
                const supplyAmount = hre.ethers.utils.parseUnits('20', 18); // 50k
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18); // 15k
                const troveId = await openTrove(testPairs[i], supplyAmount, boldAmount);
                console.log('troveId', troveId);

                const maxRatio = 300;
                const targetRatio = 250;
                const { subId, strategySub } = await subLiquityV2BoostBundle(
                    proxy,
                    testPairs[i].market,
                    troveId,
                    maxRatio,
                    targetRatio,
                    boostBundleId,
                );

                const troveInfoBefore = await viewContract.getTroveInfo(testPairs[i].market, troveId);
                const ratioBefore = troveInfoBefore.TCRatio;
                console.log('ratioBefore', ratioBefore.toString());

                const boldFlAmount = hre.ethers.utils.parseUnits('5000', 18);

                const exchangeObject = await formatExchangeObjSdk(
                    BOLD_TOKEN,
                    collAsset.address,
                    boldFlAmount,
                    addrs[network].UNISWAP_V3_WRAPPER,
                    true,
                    false,
                );

                const maxUpfrontFee = await getLiquityV2AdjustBorrowMaxUpfrontFee(
                    testPairs[i].market,
                    testPairs[i].collIndex,
                    troveId,
                    boldFlAmount,
                );

                await callLiquityV2FLBoostStrategy(
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    boldFlAmount,
                    collAsset.address,
                    BOLD_TOKEN,
                    maxUpfrontFee,
                    flAction.address,
                );

                const troveInfoAfter = await viewContract.getTroveInfo(testPairs[i].market, troveId);
                const ratioAfter = troveInfoAfter.TCRatio;
                console.log('ratioAfter', ratioAfter.toString());

                expect(ratioBefore).to.be.gt(ratioAfter);
            });
            it.skip('... should call LiquityV2 fl boost with collateral strategy', async () => {
                const supplyAmount = hre.ethers.utils.parseUnits('20', 18); // 50k
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18); // 15k
                const troveId = await openTrove(testPairs[i], supplyAmount, boldAmount);
                console.log('troveId', troveId);

                const maxRatio = 300;
                const targetRatio = 250;
                const { subId, strategySub } = await subLiquityV2BoostBundle(
                    proxy,
                    testPairs[i].market,
                    troveId,
                    maxRatio,
                    targetRatio,
                    boostBundleId,
                );

                const troveInfoBefore = await viewContract.getTroveInfo(testPairs[i].market, troveId);
                const ratioBefore = troveInfoBefore.TCRatio;
                console.log('ratioBefore', ratioBefore.toString());

                const collFlAmount = hre.ethers.utils.parseUnits('2', 18);
                const boostBoldAmount = hre.ethers.utils.parseUnits('5000', 18);

                const exchangeObject = await formatExchangeObjSdk(
                    BOLD_TOKEN,
                    collAsset.address,
                    boostBoldAmount,
                    addrs[network].UNISWAP_V3_WRAPPER,
                    true,
                    false,
                );

                const maxUpfrontFee = await getLiquityV2AdjustBorrowMaxUpfrontFee(
                    testPairs[i].market,
                    testPairs[i].collIndex,
                    troveId,
                    boostBoldAmount,
                );

                await callLiquityV2FLBoostWithCollStrategy(
                    strategyExecutor,
                    2,
                    subId,
                    strategySub,
                    exchangeObject,
                    collFlAmount,
                    boostBoldAmount,
                    collAsset.address,
                    BOLD_TOKEN,
                    maxUpfrontFee,
                    flAction.address,
                );

                const troveInfoAfter = await viewContract.getTroveInfo(testPairs[i].market, troveId);
                const ratioAfter = troveInfoAfter.TCRatio;
                console.log('ratioAfter', ratioAfter.toString());

                expect(ratioBefore).to.be.gt(ratioAfter);
            });
        }
    });
};

describe('LiquityV2 boost/repay strategy test', function () {
    this.timeout(80000);
    it('... test LiquityV2 boost/repay strategy', async () => {
        const testPairs = await getLiquityV2TestPairs();
        await liquityV2LeverageManagementStrategyTest(testPairs, isNetworkFork());
    }).timeout(50000);
});

module.exports = {
    liquityV2LeverageManagementStrategyTest,
};
