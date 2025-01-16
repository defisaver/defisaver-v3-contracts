const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const { deployLiquityV2RepayBundle, getLiquityV2TestPairs } = require('../../utils-liquityV2');
const { BaseLiquityV2StrategyTest } = require('./common');
const { subLiquityV2RepayBundle } = require('../../strategy-subs');
const {
    formatExchangeObjSdk, BOLD_ADDR, addrs, network, isNetworkFork,
} = require('../../utils');
const { callLiquityV2RepayStrategy, callLiquityV2FLRepayStrategy } = require('../../strategy-calls');

class RepayTest extends BaseLiquityV2StrategyTest {
    async setUp() {
        await this.baseSetUp();
        this.bundles.repay = await deployLiquityV2RepayBundle(this.proxy, this.isFork);
    }

    runTests() {
        // eslint-disable-next-line no-unused-vars
        this.testPairs.forEach((pair, i) => {
            it('... should call LiquityV2 repay strategy', async () => {
                const collAsset = getAssetInfo(pair.supplyTokenSymbol);
                const supplyAmount = hre.ethers.utils.parseUnits('10', 18);
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18);
                const troveId = await this.openTrove(pair, supplyAmount, boldAmount);
                console.log('Trove ID created:', troveId.toString());

                const minRatio = 250;
                const targetRatio = 300;
                const { subId, strategySub } = await subLiquityV2RepayBundle(
                    this.proxy,
                    pair.market,
                    troveId,
                    minRatio,
                    targetRatio,
                    this.bundles.repay,
                );

                const troveInfoBefore = await this.contracts.view.getTroveInfo(
                    pair.market,
                    troveId,
                );
                const ratioBefore = troveInfoBefore.TCRatio;
                console.log('Trove ratio before:', ratioBefore.toString());

                const repayAmount = supplyAmount.div(8);

                const exchangeObject = await formatExchangeObjSdk(
                    collAsset.address,
                    BOLD_ADDR,
                    repayAmount,
                    addrs[network].UNISWAP_V3_WRAPPER,
                    false,
                    true,
                );

                await callLiquityV2RepayStrategy(
                    this.contracts.strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                );

                const troveInfoAfter = await this.contracts.view.getTroveInfo(
                    pair.market,
                    troveId,
                );
                const ratioAfter = troveInfoAfter.TCRatio;
                console.log('Trove ratio after:', ratioAfter.toString());

                expect(ratioAfter).to.be.gt(ratioBefore);
            });
            it('... should call LiquityV2 FL repay strategy', async () => {
                const collAsset = getAssetInfo(pair.supplyTokenSymbol);
                const supplyAmount = hre.ethers.utils.parseUnits('10', 18);
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18);
                const troveId = await this.openTrove(pair, supplyAmount, boldAmount);
                console.log('troveId', troveId);

                const minRatio = 250;
                const targetRatio = 300;
                const { subId, strategySub } = await subLiquityV2RepayBundle(
                    this.proxy,
                    pair.market,
                    troveId,
                    minRatio,
                    targetRatio,
                    this.bundles.repay,
                );

                const troveInfoBefore = await this.contracts.view.getTroveInfo(
                    pair.market,
                    troveId,
                );
                const ratioBefore = troveInfoBefore.TCRatio;
                console.log('ratioBefore', ratioBefore.toString());

                const repayAmount = supplyAmount.div(8);

                const exchangeObject = await formatExchangeObjSdk(
                    collAsset.address,
                    BOLD_ADDR,
                    repayAmount,
                    addrs[network].UNISWAP_V3_WRAPPER,
                    false,
                    true,
                );

                await callLiquityV2FLRepayStrategy(
                    this.contracts.strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                    collAsset.address,
                    this.contracts.flAction.address,
                );

                const troveInfoAfter = await this.contracts.view.getTroveInfo(
                    pair.market,
                    troveId,
                );
                const ratioAfter = troveInfoAfter.TCRatio;
                console.log('ratioAfter', ratioAfter.toString());

                expect(ratioAfter).to.be.gt(ratioBefore);
            });
        });
    }
}

module.exports = async function runRepayTests() {
    const testPairs = await getLiquityV2TestPairs();
    const isFork = isNetworkFork();
    const repayTest = new RepayTest(testPairs, isFork);
    describe('LiquityV2 Repay Strategy Tests', function () {
        this.timeout(1200000);
        before(async () => { await repayTest.setUp(); });
        beforeEach(async () => { await repayTest.takeSnapshot(); });
        afterEach(async () => { await repayTest.revertToSnapshot(); });
        repayTest.runTests();
    });
};
