const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const {
    getLiquityV2TestPairs,
    deployLiquityV2InterestRateAdjustmentStrategy,
    getLiquityV2Hints,
} = require('../../utils/liquityV2');
const { BaseLiquityV2StrategyTest } = require('./common');
const { subLiquityV2InterestRateAdjustmentBundle } = require('../utils/strategy-subs');
const { fetchAmountInUSDPrice, isNetworkFork } = require('../../utils/utils');
const { callLiquityV2InterestRateAdjustmentStrategy } = require('../utils/strategy-calls');

class InterestRateAdjustmentTest extends BaseLiquityV2StrategyTest {
    async setUp() {
        await this.baseSetUp();
        this.strategyId = await deployLiquityV2InterestRateAdjustmentStrategy(
            this.proxy,
            this.isFork,
        );
    }

    async executeInterestRateAdjustment(
        market,
        troveId,
        interestRateChange,
        criticalLimit,
        nonCriticalLimit,
    ) {
        const { subId, strategySub } = await subLiquityV2InterestRateAdjustmentBundle(
            this.proxy,
            market,
            troveId,
            criticalLimit,
            nonCriticalLimit,
            interestRateChange,
        );

        const view = await hre.ethers.getContractAt('LiquityV2View', this.contracts.view.address);
        const troveInfoBefore = await view.callStatic.getTroveInfo(market, troveId);
        const interestRateBefore = troveInfoBefore.annualInterestRate;
        const newInterestRate = interestRateBefore.add(interestRateChange * 1e16);

        const { upperHint, lowerHint } = await getLiquityV2Hints(market, 1, newInterestRate);

        const maxUpfrontFee = hre.ethers.constants.MaxUint256;
        const trigger = await hre.ethers.getContractAt(
            'LiquityV2AdjustRateDebtInFrontTrigger',
            this.contracts.trigger.address,
        );
        const shouldExecuteStrategy = await trigger.callStatic.isTriggered([], strategySub[2][0]);
        console.log(shouldExecuteStrategy);
        await callLiquityV2InterestRateAdjustmentStrategy(
            this.contracts.strategyExecutor,
            124,
            subId,
            strategySub,
            newInterestRate,
            upperHint,
            lowerHint,
            maxUpfrontFee,
            market,
            troveId,
        );

        const troveInfoAfter = await this.contracts.view.callStatic.getTroveInfo(market, troveId);
        return {
            interestRateBefore,
            interestRateAfter: troveInfoAfter.annualInterestRate,
            newInterestRate,
        };
    }

    runTests() {
        this.testPairs.forEach((pair) => {
            it('... should call LiquityV2 interest rate adjustment strategy', async () => {
                const collAsset = getAssetInfo(pair.supplyTokenSymbol);
                const supplyAmount = await fetchAmountInUSDPrice(collAsset.symbol, '60000');
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18);
                const troveId = await this.openTrove(pair, supplyAmount, boldAmount, '1.1');
                console.log('troveId', troveId);
                // Set up strategy parameters
                const criticalDebtInFrontLimit = '500000'; // 0.5M BOLD
                const nonCriticalDebtInFrontLimit = '3000000'; // 3M BOLD
                const interestRateChange = '0.5'; // 0.5% increase
                const result = await this.executeInterestRateAdjustment(
                    pair.market,
                    troveId,
                    interestRateChange,
                    criticalDebtInFrontLimit,
                    nonCriticalDebtInFrontLimit,
                );

                console.log('Interest rate before:', result.interestRateBefore.toString());
                console.log('Interest rate after:', result.interestRateAfter.toString());

                // Verify the interest rate was adjusted correctly
                expect(result.interestRateAfter).to.equal(result.newInterestRate);
                expect(result.interestRateAfter).to.be.gt(result.interestRateBefore);
            });
        });
    }
}

module.exports = async function runInterestRateAdjustmentTests() {
    let testPairs = await getLiquityV2TestPairs();
    testPairs = [testPairs[1]];
    const isFork = isNetworkFork();
    const interestRateAdjustmentTest = new InterestRateAdjustmentTest(testPairs, isFork);
    describe('LiquityV2 Interest Rate Adjustment Strategy Tests', function () {
        this.timeout(1200000);
        before(async () => {
            await interestRateAdjustmentTest.setUp();
        });
        beforeEach(async () => {
            await interestRateAdjustmentTest.takeSnapshot();
        });
        afterEach(async () => {
            await interestRateAdjustmentTest.revertToSnapshot();
        });
        interestRateAdjustmentTest.runTests();
    });
};
