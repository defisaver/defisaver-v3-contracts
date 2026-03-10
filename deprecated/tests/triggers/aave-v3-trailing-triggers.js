const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { deployContract } = require('../../scripts/utils/deployer');
const {
    redeploy,
    setNetwork,
    getLocalTokenPrice,
    chainIds,
    BN2Float,
    Float2BN,
    setContractAt,
    network,
} = require('../utils/utils');

const aaveV3TrailingQuotePriceTriggerTest = () => {
    const { mockRoundTimelapse } = [
        { feed: 'base', priceMovementAbsolute: 0 },
        { feed: 'quote', priceMovementAbsolute: 0.2 },
        { feed: 'base', priceMovementAbsolute: 0.1 },
        { feed: 'quote', priceMovementAbsolute: 0 },
        { feed: 'base', priceMovementAbsolute: 0.1 },
        { feed: 'base', priceMovementAbsolute: 0.2 },
        { feed: 'quote', priceMovementAbsolute: 0.15 },
        { feed: 'base', priceMovementAbsolute: 0.1 },
        { feed: 'base', priceMovementAbsolute: 0.05 },
        { feed: 'base', priceMovementAbsolute: 0.2 },
        { feed: 'quote', priceMovementAbsolute: 0.15 },
        { feed: 'quote', priceMovementAbsolute: 0.1 },
        { feed: 'base', priceMovementAbsolute: 0.05 },
        { feed: 'quote', priceMovementAbsolute: 0.3 },
        { feed: 'quote', priceMovementAbsolute: 0.1 },
        { feed: 'base', priceMovementAbsolute: 0 },
    ].reduce(
        (
            { baseRoundId, quoteRoundId, baseTokenPrice, quoteTokenPrice, mockRoundTimelapse },
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
        },
        {
            baseRoundId: 1,
            quoteRoundId: 1,
            baseTokenPrice: 1,
            quoteTokenPrice: 1,
            prevPriceMovementAbsolute: 0,
            mockRoundTimelapse: [],
        },
    );

    const feedRuns = mockRoundTimelapse.reduce(
        (feedRuns, { feed, priceMovementAbsolute, price, roundId, timestamp }) => {
            const prevRun = feedRuns.slice(-1)[0];
            const round = {
                priceMovementAbsolute,
                roundId,
                price,
                timestamp,
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

    const testData = feedRuns.slice(1, -1).reduce((testData, { feed, rounds }, i) => {
        const prevRound = feedRuns[i].rounds.slice(-1)[0];
        if (feed === 'base') {
            return [
                ...testData,
                ...rounds.map(({ priceMovementAbsolute, roundId }) =>
                    priceMovementAbsolute < 0
                        ? undefined
                        : {
                              baseMaxRoundId: roundId,
                              baseMaxRoundIdNext: 0,
                              quoteMaxRoundId: prevRound.roundId,
                              quoteMaxRoundIdNext: prevRound.roundId + 1,
                              percentage: Float2BN(
                                  (priceMovementAbsolute / (1 + priceMovementAbsolute)).toFixed(10),
                                  10,
                              ),
                          },
                ),
            ];
        }
        return [
            ...testData,
            ...rounds.map(({ priceMovementAbsolute, roundId }) =>
                priceMovementAbsolute < 0
                    ? undefined
                    : {
                          baseMaxRoundId: prevRound.roundId,
                          baseMaxRoundIdNext: prevRound.roundId + 1,
                          quoteMaxRoundId: roundId,
                          quoteMaxRoundIdNext: 0,
                          percentage: Float2BN(
                              (priceMovementAbsolute / (1 + priceMovementAbsolute)).toFixed(10),
                              10,
                          ),
                      },
            ),
        ];
    }, []);

    const setMockRounds = async (contract, rounds, startPrice) =>
        contract.setMockRounds(
            rounds.map(({ roundId, price, timestamp }) => ({
                roundId,
                answer: Float2BN((price * startPrice).toFixed(8), 8),
                updatedAt: timestamp,
            })),
        );

    const testTrailingTrigger = async ({
        trigger,
        baseAssetSymbol,
        quoteAssetSymbol,
        baseMaxRoundId,
        baseMaxRoundIdNext,
        quoteMaxRoundId,
        quoteMaxRoundIdNext,
        percentage,
    }) =>
        trigger.isTriggered(
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

            const mockWbtcFeed = await deployContract('MockChainlinkAggregator').then(
                async (feed) => {
                    await setMockRounds(
                        feed,
                        mockRoundTimelapse.filter((e) => e.feed === 'base'),
                        getLocalTokenPrice(baseAssetSymbol),
                    );
                    return feed;
                },
            );

            const mockWethFeed = await deployContract('MockChainlinkAggregator').then(
                async (feed) => {
                    await setMockRounds(
                        feed,
                        mockRoundTimelapse.filter((e) => e.feed === 'quote'),
                        getLocalTokenPrice(baseAssetSymbol),
                    );
                    return feed;
                },
            );

            await setContractAt({
                name: 'MockAaveV3Oracle',
                address: aaveV3OracleAddress,
            }).then(async (c) =>
                c.addFeeds(
                    [
                        getAssetInfo('WBTC', chainIds[network]).address,
                        getAssetInfo('WETH', chainIds[network]).address,
                    ],
                    [mockWbtcFeed.address, mockWethFeed.address],
                ),
            );
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
                percentage: Float2BN((BN2Float(testData[0].percentage, 10) * 1.1).toFixed(10), 10),
            };

            const triggered = testTrailingTrigger({
                trigger,
                baseAssetSymbol,
                quoteAssetSymbol,
                ...badTest,
            });
            expect(await triggered).to.be.eq(false);
        });

        testData.forEach((test) => {
            it('... should trigger on sufficient price drop', async () => {
                const triggered = testTrailingTrigger({
                    trigger,
                    baseAssetSymbol,
                    quoteAssetSymbol,
                    ...test,
                });
                expect(await triggered).to.be.eq(true);
            });
        });
    });
};

(() => {
    aaveV3TrailingQuotePriceTriggerTest();
})();
