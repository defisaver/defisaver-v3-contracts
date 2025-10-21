const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const { subFluidVaultT1RepayBundle } = require('../utils/strategy-subs');
const { callFluidT1FLRepayStrategy, callFluidT1RepayStrategy } = require('../utils/strategy-calls');
const { deployFluidT1RepayBundle, getFluidVaultT1TestPairs } = require('../../utils/fluid');
const { BaseFluidT1StrategyTest } = require('./common');
const {
    network,
    isNetworkFork,
    fetchAmountInUSDPrice,
    chainIds,
    formatMockExchangeObjUsdFeed,
} = require('../../utils/utils');

class RepayTest extends BaseFluidT1StrategyTest {
    async setUp() {
        await this.baseSetUp();
        this.bundles.repay = await deployFluidT1RepayBundle(this.proxy, this.isFork);
    }

    async openAndSubscribe(pair) {
        const collAsset = getAssetInfo(pair.collSymbol, chainIds[network]);
        const debtAsset = getAssetInfo(pair.debtSymbol, chainIds[network]);
        const collAmount = await fetchAmountInUSDPrice(collAsset.symbol, '30000');
        const debtAmount = await fetchAmountInUSDPrice(debtAsset.symbol, '15000');
        const nftId = await this.openVault(pair.vault, collAsset.address, collAmount, debtAmount);
        console.log('Created Fluid T1 vault with ID:', nftId.toString());

        const minRatio = 250;
        const targetRatio = 300;
        const { subId, strategySub } = await subFluidVaultT1RepayBundle(
            this.proxy,
            this.bundles.repay,
            nftId,
            pair.vault,
            targetRatio,
            minRatio,
        );

        const ratioBefore = await this.getRatio(nftId);
        console.log('Position ratio before:', ratioBefore.toString());

        const repayAmount = collAmount.div(8);

        const exchangeObject = await formatMockExchangeObjUsdFeed(
            collAsset,
            debtAsset,
            repayAmount,
            this.contracts.mockWrapper,
        );

        return {
            collAsset,
            debtAsset,
            nftId,
            subId,
            strategySub,
            repayAmount,
            exchangeObject,
            ratioBefore,
        };
    }

    runTests() {
        // eslint-disable-next-line no-unused-vars
        this.testPairs.forEach((pair, i) => {
            it('... should call Fluid T1 repay strategy', async () => {
                const {
                    debtAsset,
                    nftId,
                    subId,
                    strategySub,
                    repayAmount,
                    exchangeObject,
                    ratioBefore,
                } = await this.openAndSubscribe(pair);

                await callFluidT1RepayStrategy(
                    this.contracts.strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                    debtAsset.address,
                );

                const ratioAfter = await this.getRatio(nftId);
                console.log('Position ratio after:', ratioAfter.toString());

                expect(ratioAfter).to.be.gt(ratioBefore);
            });
            it('... should call Fluid FL repay strategy', async () => {
                const {
                    collAsset,
                    debtAsset,
                    nftId,
                    subId,
                    strategySub,
                    repayAmount,
                    exchangeObject,
                    ratioBefore,
                } = await this.openAndSubscribe(pair);

                await callFluidT1FLRepayStrategy(
                    this.contracts.strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                    collAsset.address,
                    debtAsset.address,
                    this.contracts.flAction.address,
                );

                const ratioAfter = await this.getRatio(nftId);
                console.log('Position ratio after:', ratioAfter.toString());

                expect(ratioAfter).to.be.gt(ratioBefore);
            });
        });
    }
}

module.exports = async function runRepayTests() {
    const testPairs = await getFluidVaultT1TestPairs();
    const isFork = isNetworkFork();
    const repayTest = new RepayTest(testPairs, isFork);
    describe('Fluid Vault T1 Repay Strategy Tests', function () {
        this.timeout(1200000);
        before(async () => {
            await repayTest.setUp();
        });
        beforeEach(async () => {
            await repayTest.takeSnapshot();
        });
        afterEach(async () => {
            await repayTest.revertToSnapshot();
        });
        repayTest.runTests();
    });
};
