const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const { getLiquityV2TestPairs, deployLiquityV2InterestRateAdjustmentStrategy } = require('../../utils/liquityV2');
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

    static async getHintsAndMaxFee(market, troveId, newInterestRate) {
        const hintHelpers = await hre.ethers.getContractAt(
            'IHintHelpers',
            (await hre.ethers.getContractAt('IAddressesRegistry', market)).hintHelpers(),
        );

        const { upperHint, lowerHint } = await hintHelpers.getAdjustInterestRateHints(
            troveId,
            newInterestRate,
            0, // minHint
            0, // maxHint
        );

        const maxUpfrontFee = await hintHelpers.predictAdjustInterestRateUpfrontFee(
            troveId,
            newInterestRate,
            0, // minHint
            0, // maxHint
        );

        return { upperHint, lowerHint, maxUpfrontFee };
    }

    async executeInterestRateAdjustment(
        market, troveId, interestRateChange, criticalLimit, nonCriticalLimit,
    ) {
        const { subId, strategySub } = await subLiquityV2InterestRateAdjustmentBundle(
            this.proxy,
            market,
            troveId,
            criticalLimit,
            nonCriticalLimit,
            interestRateChange,
        );
        console.log('subId', subId);
        console.log('strategySub', strategySub);

        const troveInfoBefore = await this.contracts.view.getTroveInfo(market, troveId);
        const interestRateBefore = troveInfoBefore.annualInterestRate;
        const newInterestRate = interestRateBefore.add(interestRateChange);

        const { upperHint, lowerHint, maxUpfrontFee } = await InterestRateAdjustmentTest
            .getHintsAndMaxFee(
                market,
                troveId,
                newInterestRate,
            );

        await callLiquityV2InterestRateAdjustmentStrategy(
            this.contracts.strategyExecutor,
            0,
            subId,
            strategySub,
            newInterestRate,
            upperHint,
            lowerHint,
            maxUpfrontFee,
        );

        const troveInfoAfter = await this.contracts.view.getTroveInfo(market, troveId);
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
                const supplyAmount = await fetchAmountInUSDPrice(collAsset.symbol, '40000');
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18);
                const troveId = await this.openTrove(pair, supplyAmount, boldAmount);

                // Set up strategy parameters
                const criticalDebtInFrontLimit = hre.ethers.utils.parseUnits('500000', 18); // 0.5M BOLD
                const nonCriticalDebtInFrontLimit = hre.ethers.utils.parseUnits('3000000', 18); // 3M BOLD
                const interestRateChange = hre.ethers.utils.parseUnits('0.5', 16); // 0.5% increase

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

            it('... should trigger when debt in front is below critical limit', async () => {
                const collAsset = getAssetInfo(pair.supplyTokenSymbol);
                const supplyAmount = await fetchAmountInUSDPrice(collAsset.symbol, '40000');
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18);
                const troveId = await this.openTrove(pair, supplyAmount, boldAmount);

                // Set up strategy parameters with very low critical limit to ensure trigger
                const criticalDebtInFrontLimit = hre.ethers.utils.parseUnits('1000', 18); // Very low limit
                const nonCriticalDebtInFrontLimit = hre.ethers.utils.parseUnits('3000000', 18); // 3M BOLD
                const interestRateChange = hre.ethers.utils.parseUnits('0.5', 16); // 0.5% increase

                const result = await this.executeInterestRateAdjustment(
                    pair.market,
                    troveId,
                    interestRateChange,
                    criticalDebtInFrontLimit,
                    nonCriticalDebtInFrontLimit,
                );

                // Verify the interest rate was adjusted correctly
                expect(result.interestRateAfter).to.equal(result.newInterestRate);
                expect(result.interestRateAfter).to.be.gt(result.interestRateBefore);
            });

            it('... should not trigger when debt in front is above limits', async () => {
                const collAsset = getAssetInfo(pair.supplyTokenSymbol);
                const supplyAmount = await fetchAmountInUSDPrice(collAsset.symbol, '40000');
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18);
                const troveId = await this.openTrove(pair, supplyAmount, boldAmount);

                // Set up strategy parameters with very high limits to prevent trigger
                const criticalDebtInFrontLimit = hre.ethers.utils.parseUnits('1000000000', 18); // Very high limit
                const nonCriticalDebtInFrontLimit = hre.ethers.utils.parseUnits('1000000000', 18); // Very high limit
                const interestRateChange = hre.ethers.utils.parseUnits('0.5', 16); // 0.5% increase

                // Try to execute the strategy - it should not trigger
                try {
                    await this.executeInterestRateAdjustment(
                        pair.market,
                        troveId,
                        interestRateChange,
                        criticalDebtInFrontLimit,
                        nonCriticalDebtInFrontLimit,
                    );

                    // If we get here, the strategy executed when it shouldn't have
                    expect.fail('Strategy should not have executed when debt in front is above limits');
                } catch (error) {
                    // Expected to fail because trigger conditions are not met
                    expect(error.message).to.include('Strategy execution failed');
                }
            });

            it('... should handle different interest rate changes', async () => {
                const collAsset = getAssetInfo(pair.supplyTokenSymbol);
                const supplyAmount = await fetchAmountInUSDPrice(collAsset.symbol, '40000');
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18);
                const troveId = await this.openTrove(pair, supplyAmount, boldAmount);

                const criticalDebtInFrontLimit = hre.ethers.utils.parseUnits('500000', 18);
                const nonCriticalDebtInFrontLimit = hre.ethers.utils.parseUnits('3000000', 18);
                // Test with 1% increase
                const interestRateChange1 = hre.ethers.utils.parseUnits('1', 16); // 1% increase
                const result1 = await this.executeInterestRateAdjustment(
                    pair.market,
                    troveId,
                    interestRateChange1,
                    criticalDebtInFrontLimit,
                    nonCriticalDebtInFrontLimit,
                );

                expect(result1.interestRateAfter).to.equal(result1.newInterestRate);
                expect(result1.interestRateAfter).to.be.gt(result1.interestRateBefore);

                // Test with 0.25% increase
                const interestRateChange2 = hre.ethers.utils.parseUnits('0.25', 16); // 0.25% increase
                const result2 = await this.executeInterestRateAdjustment(
                    pair.market,
                    troveId,
                    interestRateChange2,
                    criticalDebtInFrontLimit,
                    nonCriticalDebtInFrontLimit,
                );

                expect(result2.interestRateAfter).to.equal(result2.newInterestRate);
                expect(result2.interestRateAfter).to.be.gt(result2.interestRateBefore);
            });
        });
    }
}

module.exports = async function runInterestRateAdjustmentTests() {
    const testPairs = await getLiquityV2TestPairs();
    const isFork = isNetworkFork();
    const interestRateAdjustmentTest = new InterestRateAdjustmentTest(testPairs, isFork);
    describe('LiquityV2 Interest Rate Adjustment Strategy Tests', function () {
        this.timeout(1200000);
        before(async () => { await interestRateAdjustmentTest.setUp(); });
        beforeEach(async () => { await interestRateAdjustmentTest.takeSnapshot(); });
        afterEach(async () => { await interestRateAdjustmentTest.revertToSnapshot(); });
        interestRateAdjustmentTest.runTests();
    });
};
