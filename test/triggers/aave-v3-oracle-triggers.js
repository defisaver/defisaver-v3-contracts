const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { RATIO_STATE_UNDER, RATIO_STATE_OVER } = require('../strategies/utils/triggers');
const {
    redeploy,
    setNetwork,
    getLocalTokenPrice,
    chainIds,
    BN2Float,
    Float2BN,
} = require('../utils/utils');

const aaveV3QuotePriceTriggerTest = () => {
    const testAssets = ['WETH', 'WBTC', 'USDC', 'LINK'];

    const testPairs = testAssets.reduce(
        (acc, baseAssetSymbol) => [
            ...acc,
            ...testAssets
                .filter((quoteAssetSymbol) => quoteAssetSymbol !== baseAssetSymbol)
                .map((quoteAssetSymbol) => ({ baseAssetSymbol, quoteAssetSymbol })),
        ],
        [],
    );

    const testQuotePriceTrigger = async ({
        trigger,
        baseAssetSymbol,
        quoteAssetSymbol,
        targetMultiplier,
        ratioState,
        loglvl = 0,
    }) => {
        const price = await trigger.getPrice(
            getAssetInfo(baseAssetSymbol, chainIds.optimism).address,
            getAssetInfo(quoteAssetSymbol, chainIds.optimism).address,
        );

        const oraclePrice = +BN2Float(price, 8);
        const localPrice =
            getLocalTokenPrice(baseAssetSymbol) / getLocalTokenPrice(quoteAssetSymbol);

        if (loglvl !== 0 && Math.abs(oraclePrice - localPrice) > localPrice * 1e-2) {
            console.log({
                Warning: 'Oracle price differs more than 100 bpts from local price',
                baseAsset: baseAssetSymbol,
                quoteAsset: quoteAssetSymbol,
                oraclePrice,
                localPrice,
            });
        }

        const triggerPrice = Float2BN((oraclePrice * targetMultiplier).toFixed(8), 8);

        return trigger.isTriggered(
            '0x',
            ethers.utils.defaultAbiCoder.encode(
                [
                    `(
                        address baseTokenAddr,
                        address quoteTokenAddr,
                        uint256 price,
                        uint8 state
                    )`,
                ],
                [
                    {
                        baseTokenAddr: getAssetInfo(baseAssetSymbol, chainIds.optimism).address,
                        quoteTokenAddr: getAssetInfo(quoteAssetSymbol, chainIds.optimism).address,
                        price: triggerPrice,
                        state: ratioState,
                    },
                ],
            ),
        );
    };

    describe('Aave-V3-Quote-Price-Trigger', () => {
        let trigger;

        before(async () => {
            setNetwork('optimism');

            trigger = await redeploy('AaveV3QuotePriceTrigger');
        });

        testPairs.map(async ({ baseAssetSymbol, quoteAssetSymbol }) => {
            it(`... should trigger correctly on ${baseAssetSymbol}/${quoteAssetSymbol} price under`, async () => {
                let triggered = await testQuotePriceTrigger({
                    trigger,
                    baseAssetSymbol,
                    quoteAssetSymbol,
                    targetMultiplier: 1.1,
                    ratioState: RATIO_STATE_UNDER,
                });

                expect(triggered).to.be.eq(true);

                triggered = await testQuotePriceTrigger({
                    trigger,
                    baseAssetSymbol,
                    quoteAssetSymbol,
                    targetMultiplier: 0.9,
                    ratioState: RATIO_STATE_UNDER,
                });

                expect(triggered).to.be.eq(false);
            });

            it(`... should trigger correctly on ${baseAssetSymbol}/${quoteAssetSymbol} price over`, async () => {
                let triggered = await testQuotePriceTrigger({
                    trigger,
                    baseAssetSymbol,
                    quoteAssetSymbol,
                    targetMultiplier: 1.1,
                    ratioState: RATIO_STATE_OVER,
                });

                expect(triggered).to.be.eq(false);

                triggered = await testQuotePriceTrigger({
                    trigger,
                    baseAssetSymbol,
                    quoteAssetSymbol,
                    targetMultiplier: 0.9,
                    ratioState: RATIO_STATE_OVER,
                });

                expect(triggered).to.be.eq(true);
            });
        });
    });
};

(() => {
    aaveV3QuotePriceTriggerTest();
})();
