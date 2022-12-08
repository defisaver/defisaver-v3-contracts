const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { deployContract } = require('../../scripts/utils/deployer');
const { RATIO_STATE_UNDER, RATIO_STATE_OVER } = require('../triggers');
const {
    redeploy, setNetwork, getNetwork, getLocalTokenPrice, chainIds, BN2Float, Float2BN,
    setContractAt,
} = require('../utils');

const aaveV3QuotePriceTriggerTest = () => {
    const testAssets = [
        'WETH',
        'WBTC',
        'USDC',
        'LINK',
    ];

    const testPairs = testAssets.reduce((acc, baseAssetSymbol) => [
        ...acc,
        ...testAssets
            .filter((quoteAssetSymbol) => quoteAssetSymbol !== baseAssetSymbol)
            .map((quoteAssetSymbol) => ({ baseAssetSymbol, quoteAssetSymbol })),
    ], []);

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
        const localPrice = getLocalTokenPrice(baseAssetSymbol)
        / getLocalTokenPrice(quoteAssetSymbol);

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

const aaveV3TrailingQuotePriceTriggerTest = () => {
    const { mockRoundTimelapse } = [
        { feed: 'base', priceMovementAbsolute: 0 },
        { feed: 'quote', priceMovementAbsolute: 0.2 },
        { feed: 'base', priceMovementAbsolute: 0.1 },
        { feed: 'quote', priceMovementAbsolute: 0 },
        { feed: 'base', priceMovementAbsolute: 0.10 },
        { feed: 'base', priceMovementAbsolute: 0.20 },
        { feed: 'quote', priceMovementAbsolute: 0.15 },
        { feed: 'base', priceMovementAbsolute: 0.10 },
        { feed: 'base', priceMovementAbsolute: 0.05 },
        { feed: 'base', priceMovementAbsolute: 0.20 },
        { feed: 'quote', priceMovementAbsolute: 0.15 },
        { feed: 'quote', priceMovementAbsolute: 0.10 },
        { feed: 'base', priceMovementAbsolute: 0.05 },
        { feed: 'quote', priceMovementAbsolute: 0.30 },
        { feed: 'quote', priceMovementAbsolute: 0.10 },
        { feed: 'base', priceMovementAbsolute: 0 },
    ].reduce(
        (
            {
                baseRoundId,
                quoteRoundId,
                baseTokenPrice,
                quoteTokenPrice,
                mockRoundTimelapse,
            },
            { feed, priceMovementAbsolute },
            timestamp,
        ) => {
            let baseRoundIdNext = baseRoundId;
            let quoteRoundIdNext = quoteRoundId;
            let roundId;
            let price;
            let baseTokenPriceNext = baseTokenPrice;
            let quoteTokenPriceNext = quoteTokenPrice;

            if (feed === 'base') {
                roundId = baseRoundId;
                baseRoundIdNext += 1;
                baseTokenPriceNext = quoteTokenPrice * (1 + priceMovementAbsolute);
                price = baseTokenPriceNext;
            } else {
                roundId = quoteRoundId;
                quoteRoundIdNext += 1;
                quoteTokenPriceNext = baseTokenPrice / (1 + priceMovementAbsolute);
                price = quoteTokenPriceNext;
            }

            return {
                baseRoundId: baseRoundIdNext,
                quoteRoundId: quoteRoundIdNext,
                baseTokenPrice: baseTokenPriceNext,
                quoteTokenPrice: quoteTokenPriceNext,
                mockRoundTimelapse: [
                    ...mockRoundTimelapse,
                    {
                        feed,
                        priceMovementAbsolute,
                        roundId,
                        price,
                        timestamp: timestamp + 1,
                    },
                ],
            };
        }, {
            baseRoundId: 1,
            quoteRoundId: 1,
            baseTokenPrice: 1,
            quoteTokenPrice: 1,
            prevPriceMovementAbsolute: 0,
            mockRoundTimelapse: [],
        },
    );

    const feedRuns = mockRoundTimelapse.reduce(
        (
            feedRuns,
            {
                feed,
                priceMovementAbsolute,
                price,
                roundId,
                timestamp,
            },
        ) => {
            const prevRun = feedRuns.slice(-1)[0];
            const round = {
                priceMovementAbsolute, roundId, price, timestamp,
            };
            if (prevRun?.feed !== feed) {
                return [
                    ...feedRuns,
                    {
                        feed,
                        rounds: [round],
                    },
                ];
            }
            prevRun.rounds.push(round);
            return feedRuns;
        },
        [],
    );

    const testData = feedRuns.slice(1, -1).reduce(
        (
            testData,
            {
                feed, rounds,
            },
            i,
        ) => {
            const prevRound = feedRuns[i].rounds.slice(-1)[0];
            if (feed === 'base') {
                return [
                    ...testData,
                    ...rounds.map(
                        ({
                            priceMovementAbsolute, roundId,
                        }) => (priceMovementAbsolute < 0 ? undefined : ({
                            baseMaxRoundId: roundId,
                            baseMaxRoundIdNext: 0,
                            quoteMaxRoundId: prevRound.roundId,
                            quoteMaxRoundIdNext: prevRound.roundId + 1,
                            percentage: Float2BN(
                                (priceMovementAbsolute / (1 + priceMovementAbsolute)).toFixed(10),
                                10,
                            ),
                        })),
                    ),
                ];
            }
            return [
                ...testData,
                ...rounds.map(
                    ({
                        priceMovementAbsolute, roundId,
                    }) => (priceMovementAbsolute < 0 ? undefined : ({
                        baseMaxRoundId: prevRound.roundId,
                        baseMaxRoundIdNext: prevRound.roundId + 1,
                        quoteMaxRoundId: roundId,
                        quoteMaxRoundIdNext: 0,
                        percentage: Float2BN(
                            (priceMovementAbsolute / (1 + priceMovementAbsolute)).toFixed(10),
                            10,
                        ),
                    })),
                ),
            ];
        },
        [],
    );

    const setMockRounds = async (contract, rounds, startPrice) => contract.setMockRounds(rounds.map(
        ({ roundId, price, timestamp }) => (
            {
                roundId,
                answer: Float2BN((price * startPrice).toFixed(8), 8),
                updatedAt: timestamp,
            }
        ),
    ));

    const testTrailingTrigger = async ({
        trigger,
        baseAssetSymbol,
        quoteAssetSymbol,
        baseMaxRoundId,
        baseMaxRoundIdNext,
        quoteMaxRoundId,
        quoteMaxRoundIdNext,
        percentage,
    }) => trigger.isTriggered(
        ethers.utils.defaultAbiCoder.encode(
            [
                `(
                    uint80 baseMaxRoundId,
                    uint80 baseMaxRoundIdNext,
                    uint80 quoteMaxRoundId,
                    uint80 quoteMaxRoundIdNext
                )`,
            ],
            [
                {
                    baseMaxRoundId,
                    baseMaxRoundIdNext,
                    quoteMaxRoundId,
                    quoteMaxRoundIdNext,
                },
            ],
        ),
        ethers.utils.defaultAbiCoder.encode(
            [
                `(
                    address baseTokenAddr,
                    uint80 baseStartRoundId,
                    address quoteTokenAddr,
                    uint80 quoteStartRoundId,
                    uint256 percentage
                )`,
            ],
            [
                {
                    baseTokenAddr: getAssetInfo(baseAssetSymbol, chainIds.optimism).address,
                    baseStartRoundId: 1,
                    quoteTokenAddr: getAssetInfo(quoteAssetSymbol, chainIds.optimism).address,
                    quoteStartRoundId: 1,
                    percentage,
                },
            ],
        ),
    );

    describe('Aave-V3-Trailing-Quote-Price-Trigger', () => {
        const aaveV3OracleAddress = '0xD81eb3728a631871a7eBBaD631b5f424909f0c77';
        const baseAssetSymbol = 'WBTC';
        const quoteAssetSymbol = 'WETH';

        let trigger;

        before(async () => {
            setNetwork('optimism');

            trigger = await redeploy('AaveV3TrailingQuotePriceTrigger');

            const mockWbtcFeed = await deployContract('MockChainlinkAggregator').then(async (feed) => {
                await setMockRounds(
                    feed,
                    mockRoundTimelapse.filter((e) => e.feed === 'base'),
                    getLocalTokenPrice(baseAssetSymbol),
                );
                return feed;
            });

            const mockWethFeed = await deployContract('MockChainlinkAggregator').then(async (feed) => {
                await setMockRounds(
                    feed,
                    mockRoundTimelapse.filter((e) => e.feed === 'quote'),
                    getLocalTokenPrice(baseAssetSymbol),
                );
                return feed;
            });

            await setContractAt({
                name: 'MockAaveV3Oracle',
                address: aaveV3OracleAddress,
            }).then(async (c) => c.addFeeds(
                [
                    getAssetInfo('WBTC', chainIds[getNetwork()]).address,
                    getAssetInfo('WETH', chainIds[getNetwork()]).address,
                ],
                [
                    mockWbtcFeed.address,
                    mockWethFeed.address,
                ],
            ));
        });

        it('... should not trigger on zero roundId', async () => {
            const badTest = {
                ...testData[0],
                baseMaxRoundId: 0,
            };

            const triggered = testTrailingTrigger({
                trigger,
                baseAssetSymbol,
                quoteAssetSymbol,
                ...badTest,
            });
            expect(await triggered).to.be.eq(false);
        });

        it('... should not trigger on bad MaxNextRoundId', async () => {
            const badTest = {
                ...testData[0],
                baseMaxRoundIdNext: testData[0].baseMaxRoundIdNext + 1,
            };

            const triggered = testTrailingTrigger({
                trigger,
                baseAssetSymbol,
                quoteAssetSymbol,
                ...badTest,
            });
            expect(await triggered).to.be.eq(false);
        });

        it('... should not trigger on non encompassed maxRoundId', async () => {
            const badTest = {
                ...testData[0],
                quoteMaxRoundId: testData[0].quoteMaxRoundId + 1,
            };

            const triggered = testTrailingTrigger({
                trigger,
                baseAssetSymbol,
                quoteAssetSymbol,
                ...badTest,
            });
            expect(await triggered).to.be.eq(false);
        });

        it('... should not trigger on insufficient price drop', async () => {
            const badTest = {
                ...testData[0],
                percentage: Float2BN(
                    (BN2Float(testData[0].percentage, 10) * 1.1).toFixed(10),
                    10,
                ),
            };

            const triggered = testTrailingTrigger({
                trigger,
                baseAssetSymbol,
                quoteAssetSymbol,
                ...badTest,
            });
            expect(await triggered).to.be.eq(false);
        });

        testData.forEach(
            (test) => {
                it('... should trigger on sufficient price drop', async () => {
                    const triggered = testTrailingTrigger({
                        trigger,
                        baseAssetSymbol,
                        quoteAssetSymbol,
                        ...test,
                    });
                    expect(await triggered).to.be.eq(true);
                });
            },
        );
    });
};

(() => {
    aaveV3QuotePriceTriggerTest();
    aaveV3TrailingQuotePriceTriggerTest();
})();
