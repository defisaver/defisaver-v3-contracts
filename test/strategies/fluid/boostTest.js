/* eslint-disable max-len */
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const { subFluidVaultT1BoostBundle } = require('../../strategy-subs');
const { callFluidT1FLBoostStrategy, callFluidT1BoostStrategy } = require('../../strategy-calls');
const { getFluidVaultT1TestPairs, deployFluidT1BoostBundle } = require('../../utils-fluid');
const { BaseFluidT1StrategyTest } = require('./common');
const {
    network,
    isNetworkFork,
    fetchAmountInUSDPrice,
    chainIds,
    formatMockExchangeObjUsdFeed,
} = require('../../utils');

class BoostTest extends BaseFluidT1StrategyTest {
    async setUp() {
        await this.baseSetUp();
        this.bundles.boost = await deployFluidT1BoostBundle(this.proxy, this.isFork);
    }

    async openAndSubscribe(pair) {
        const collAsset = getAssetInfo(pair.collSymbol, chainIds[network]);
        const debtAsset = getAssetInfo(pair.debtSymbol, chainIds[network]);
        const collAmount = await fetchAmountInUSDPrice(collAsset.symbol, '40000');
        const debtAmount = await fetchAmountInUSDPrice(debtAsset.symbol, '15000');
        const nftId = await this.openVault(pair.vault, collAsset.address, collAmount, debtAmount);
        console.log('Created Fluid T1 vault with ID:', nftId.toString());

        const maxRatio = 200;
        const targetRatio = 150;
        const { subId, strategySub } = await subFluidVaultT1BoostBundle(
            this.proxy,
            this.bundles.boost,
            nftId,
            pair.vault,
            targetRatio,
            maxRatio,
        );

        const ratioBefore = await this.getRatio(nftId);
        console.log('Position ratio before:', ratioBefore.toString());

        const boostAmount = debtAmount.div(4);

        const exchangeObject = await formatMockExchangeObjUsdFeed(
            debtAsset,
            collAsset,
            boostAmount,
            this.contracts.mockWrapper,
        );

        return {
            collAsset, debtAsset, nftId, subId, strategySub, boostAmount, exchangeObject, ratioBefore,
        };
    }

    runTests() {
        // eslint-disable-next-line no-unused-vars
        this.testPairs.forEach((pair, i) => {
            it('... should call Fluid T1 regular boost strategy', async () => {
                const {
                    collAsset, nftId, subId, strategySub, boostAmount, exchangeObject, ratioBefore,
                } = await this.openAndSubscribe(pair);

                await callFluidT1BoostStrategy(
                    this.contracts.strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    collAsset.address,
                );

                const ratioAfter = await this.getRatio(nftId);
                console.log('Position ratio after:', ratioAfter.toString());

                expect(ratioAfter).to.be.lt(ratioBefore);
            });
            it('... should call Fluid T1 FL boost strategy', async () => {
                const {
                    collAsset, debtAsset, nftId, subId, strategySub, boostAmount, exchangeObject, ratioBefore,
                } = await this.openAndSubscribe(pair);

                await callFluidT1FLBoostStrategy(
                    this.contracts.strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    collAsset.address,
                    debtAsset.address,
                    this.contracts.flAction.address,
                );

                const ratioAfter = await this.getRatio(nftId);
                console.log('Position ratio after:', ratioAfter.toString());

                expect(ratioAfter).to.be.lt(ratioBefore);
            });
        });
    }
}

module.exports = async function runBoostTests() {
    const testPairs = await getFluidVaultT1TestPairs();
    const isFork = isNetworkFork();
    const boostTest = new BoostTest(testPairs, isFork);
    describe('Fluid Vault T1 Boost Strategy Tests', function () {
        this.timeout(1200000);
        before(async () => { await boostTest.setUp(); });
        beforeEach(async () => { await boostTest.takeSnapshot(); });
        afterEach(async () => { await boostTest.revertToSnapshot(); });
        boostTest.runTests();
    });
};
