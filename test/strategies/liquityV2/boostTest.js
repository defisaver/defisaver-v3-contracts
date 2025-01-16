const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const { getLiquityV2TestPairs, deployLiquityV2BoostBundle, getLiquityV2AdjustBorrowMaxUpfrontFee } = require('../../utils-liquityV2');
const { BaseLiquityV2StrategyTest } = require('./common');
const { subLiquityV2BoostBundle } = require('../../strategy-subs');
const {
    formatExchangeObjSdk, BOLD_ADDR, addrs, network, isNetworkFork,
    setBalance,
    BALANCER_VAULT_ADDR,
} = require('../../utils');
const { callLiquityV2BoostStrategy, callLiquityV2FLBoostWithCollStrategy, callLiquityV2FLBoostStrategy } = require('../../strategy-calls');

class BoostTest extends BaseLiquityV2StrategyTest {
    async setUp() {
        await this.baseSetUp();
        this.bundles.boost = await deployLiquityV2BoostBundle(this.proxy, this.isFork);
    }

    runTests() {
        // eslint-disable-next-line no-unused-vars
        this.testPairs.forEach((pair, i) => {
            it('... should call LiquityV2 boost strategy', async () => {
                const collAsset = getAssetInfo(pair.supplyTokenSymbol);

                const supplyAmount = hre.ethers.utils.parseUnits('20', 18);
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18);
                const troveId = await this.openTrove(pair, supplyAmount, boldAmount);
                console.log('troveId', troveId);

                const maxRatio = 300;
                const targetRatio = 150;
                const { subId, strategySub } = await subLiquityV2BoostBundle(
                    this.proxy,
                    pair.market,
                    troveId,
                    maxRatio,
                    targetRatio,
                    this.bundles.boost,
                );

                const troveInfoBefore = await this.contracts.view.getTroveInfo(
                    pair.market,
                    troveId,
                );
                const ratioBefore = troveInfoBefore.TCRatio;
                console.log('ratioBefore', ratioBefore.toString());

                const boostAmount = boldAmount.div(8);

                const exchangeObject = await formatExchangeObjSdk(
                    BOLD_ADDR,
                    collAsset.address,
                    boostAmount,
                    addrs[network].UNISWAP_V3_WRAPPER,
                    true,
                    false,
                );

                const maxUpfrontFee = await getLiquityV2AdjustBorrowMaxUpfrontFee(
                    pair.market,
                    pair.collIndex,
                    troveId,
                    boostAmount,
                );

                await callLiquityV2BoostStrategy(
                    this.contracts.strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    collAsset.address,
                    maxUpfrontFee,
                );

                const troveInfoAfter = await this.contracts.view.getTroveInfo(pair.market, troveId);
                const ratioAfter = troveInfoAfter.TCRatio;
                console.log('ratioAfter', ratioAfter.toString());

                expect(ratioBefore).to.be.gt(ratioAfter);
            });
            it('... should call LiquityV2 fl boost strategy', async () => {
                const collAsset = getAssetInfo(pair.supplyTokenSymbol);
                const supplyAmount = hre.ethers.utils.parseUnits('20', 18);
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18);
                const troveId = await this.openTrove(pair, supplyAmount, boldAmount);
                console.log('troveId', troveId);

                const maxRatio = 300;
                const targetRatio = 250;
                const { subId, strategySub } = await subLiquityV2BoostBundle(
                    this.proxy,
                    pair.market,
                    troveId,
                    maxRatio,
                    targetRatio,
                    this.bundles.boost,
                );

                const troveInfoBefore = await this.contracts.view.getTroveInfo(
                    pair.market,
                    troveId,
                );
                const ratioBefore = troveInfoBefore.TCRatio;
                console.log('ratioBefore', ratioBefore.toString());

                const boldFlAmount = hre.ethers.utils.parseUnits('5000', 18);

                const exchangeObject = await formatExchangeObjSdk(
                    BOLD_ADDR,
                    collAsset.address,
                    boldFlAmount,
                    addrs[network].UNISWAP_V3_WRAPPER,
                    true,
                    false,
                );

                const maxUpfrontFee = await getLiquityV2AdjustBorrowMaxUpfrontFee(
                    pair.market,
                    pair.collIndex,
                    troveId,
                    boldFlAmount,
                );

                // add bold liquidity to balancer vault so we can use balancer flashloan
                await setBalance(BOLD_ADDR, BALANCER_VAULT_ADDR, boldFlAmount);

                await callLiquityV2FLBoostStrategy(
                    this.contracts.strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    boldFlAmount,
                    collAsset.address,
                    BOLD_ADDR,
                    maxUpfrontFee,
                    this.contracts.flAction.address,
                );

                const troveInfoAfter = await this.contracts.view.getTroveInfo(pair.market, troveId);
                const ratioAfter = troveInfoAfter.TCRatio;
                console.log('ratioAfter', ratioAfter.toString());

                expect(ratioBefore).to.be.gt(ratioAfter);
            });
            it('... should call LiquityV2 fl boost with collateral strategy', async () => {
                const collAsset = getAssetInfo(pair.supplyTokenSymbol);

                const supplyAmount = hre.ethers.utils.parseUnits('20', 18);
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18);
                const troveId = await this.openTrove(pair, supplyAmount, boldAmount);
                console.log('troveId', troveId);

                const maxRatio = 300;
                const targetRatio = 150;
                const { subId, strategySub } = await subLiquityV2BoostBundle(
                    this.proxy,
                    pair.market,
                    troveId,
                    maxRatio,
                    targetRatio,
                    this.bundles.boost,
                );

                const troveInfoBefore = await this.contracts.view.getTroveInfo(
                    pair.market,
                    troveId,
                );
                const ratioBefore = troveInfoBefore.TCRatio;
                console.log('ratioBefore', ratioBefore.toString());

                const collFlAmount = hre.ethers.utils.parseUnits('2', 18);
                const boostBoldAmount = hre.ethers.utils.parseUnits('5000', 18);

                const exchangeObject = await formatExchangeObjSdk(
                    BOLD_ADDR,
                    collAsset.address,
                    boostBoldAmount,
                    addrs[network].UNISWAP_V3_WRAPPER,
                    true,
                    false,
                );

                const maxUpfrontFee = await getLiquityV2AdjustBorrowMaxUpfrontFee(
                    pair.market,
                    pair.collIndex,
                    troveId,
                    boostBoldAmount,
                );

                await callLiquityV2FLBoostWithCollStrategy(
                    this.contracts.strategyExecutor,
                    2,
                    subId,
                    strategySub,
                    exchangeObject,
                    collFlAmount,
                    boostBoldAmount,
                    collAsset.address,
                    BOLD_ADDR,
                    maxUpfrontFee,
                    this.contracts.flAction.address,
                );

                const troveInfoAfter = await this.contracts.view.getTroveInfo(pair.market, troveId);
                const ratioAfter = troveInfoAfter.TCRatio;
                console.log('ratioAfter', ratioAfter.toString());

                expect(ratioBefore).to.be.gt(ratioAfter);
            });
        });
    }
}

module.exports = async function runBoostTests() {
    const testPairs = await getLiquityV2TestPairs();
    const isFork = isNetworkFork();
    const boostTest = new BoostTest(testPairs, isFork);
    describe('LiquityV2 Boost Strategy Tests', function () {
        this.timeout(1200000);
        before(async () => { await boostTest.setUp(); });
        beforeEach(async () => { await boostTest.takeSnapshot(); });
        afterEach(async () => { await boostTest.revertToSnapshot(); });
        boostTest.runTests();
    });
};