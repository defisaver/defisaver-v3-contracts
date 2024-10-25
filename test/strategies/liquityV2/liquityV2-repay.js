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
const { createLiquityV2RepayStrategy, createLiquityV2FLRepayStrategy } = require('../../strategies');
const { liquityV2Open, uniV3CreatePool } = require('../../actions');
const { getLiquityV2TestPairs } = require('../../utils-liquityV2');
const { subLiquityV2RepayBundle } = require('../../strategy-subs');
const { callLiquityV2RepayStrategy, callLiquityV2FLRepayStrategy } = require('../../strategy-calls');

const deployLiquityV2RepayBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const repayStrategy = createLiquityV2RepayStrategy();
    const flRepayStrategy = createLiquityV2FLRepayStrategy();
    const repayStrategyId = await createStrategy(proxy, ...repayStrategy, true);
    const flRepayStrategyId = await createStrategy(proxy, ...flRepayStrategy, true);
    const bundleId = await createBundle(proxy, [repayStrategyId, flRepayStrategyId]);
    return bundleId;
};

const liquityV2RepayStrategyTest = async (testPairs, isFork) => {
    describe('LiquityV2-Repay-Strategy-Test', function () {
        this.timeout(1200000);

        const REGISTRY_ADDR = addrs[network].REGISTRY_ADDR;
        const BOLD_TOKEN = '0x4f37d1f70b7ed0868baa367c82897006b5e1a6e4';

        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let flAction;
        let bundleId;
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
        const openTrove = async (testPair) => {
            const collAsset = getAssetInfo(testPair.supplyTokenSymbol);
            const interestRate = hre.ethers.utils.parseUnits('1', 16);
            const ownerIndex = 11;

            await liquityV2Open(
                proxy,
                testPair.market,
                testPair.collIndex,
                collAsset.address,
                testPair.supplyAmount,
                testPair.boldAmount,
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
            bundleId = await deployLiquityV2RepayBundle(proxy, isFork);
            console.log('bundleId', bundleId);
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
                const troveId = await openTrove(testPairs[i]);
                console.log('troveId', troveId);

                const minRatio = 180;
                const targetRatio = i === 0 ? 205 : 225;
                const { subId, strategySub } = await subLiquityV2RepayBundle(
                    proxy,
                    testPairs[i].market,
                    troveId,
                    minRatio,
                    targetRatio,
                    bundleId,
                );

                const troveInfoBefore = await viewContract.getTroveInfo(testPairs[i].market, troveId);
                const ratioBefore = troveInfoBefore.TCRatio;
                console.log('ratioBefore', ratioBefore.toString());

                const repayAmount = testPairs[i].supplyAmount.div(5);

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
                const troveId = await openTrove(testPairs[i]);
                console.log('troveId', troveId);

                const minRatio = 180;
                const targetRatio = i === 0 ? 205 : 225;
                const { subId, strategySub } = await subLiquityV2RepayBundle(
                    proxy,
                    testPairs[i].market,
                    troveId,
                    minRatio,
                    targetRatio,
                    bundleId,
                );

                const troveInfoBefore = await viewContract.getTroveInfo(testPairs[i].market, troveId);
                const ratioBefore = troveInfoBefore.TCRatio;
                console.log('ratioBefore', ratioBefore.toString());

                const repayAmount = testPairs[i].supplyAmount.div(5);

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
        }
    });
};

describe('LiquityV2 repay strategy test', function () {
    this.timeout(80000);
    it('... test LiquityV2 repay strategy', async () => {
        const collAmount = '10';
        const boldAmount = '15000';
        const testPairs = await getLiquityV2TestPairs(collAmount, boldAmount);
        await liquityV2RepayStrategyTest(testPairs, isNetworkFork());
    }).timeout(50000);
});

module.exports = {
    liquityV2RepayStrategyTest,
};
