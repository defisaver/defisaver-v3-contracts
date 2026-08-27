const hre = require('hardhat');
const { markets } = require('@defisaver/positions-sdk');

const { addrs, chainIds } = require('./utils');

const MIDNIGHT_API_URL = 'https://api.morpho.org/v0/midnight/books';
const TENOR_API_URL = 'https://router.tenor.finance/v1/quote';
const DEFAULT_SLIPPAGE = '0.5';
const MAX_QUOTE_ATTEMPTS = 10;
const API_DELAY_MS = 500;
const BPS = hre.ethers.BigNumber.from(10_000);
const WAD = hre.ethers.constants.WeiPerEther;
const MAX_UINT128 = hre.ethers.BigNumber.from(2).pow(128).sub(1);

const delay = () => new Promise((resolve) => setTimeout(resolve, API_DELAY_MS));

const getMidnightMarkets = (network) => {
    const chainId = chainIds[network];
    if (!chainId || !addrs[network]?.MIDNIGHT_ADDRESS) return [];

    const activeMarkets = Object.values(markets.MorphoMidnightMarkets(chainId))
        .filter(
            (market) => market.chainIds.includes(chainId) && market.maturity > Date.now() / 1000,
        )
        .sort((a, b) => a.maturity - b.maturity);
    const uniqueMarkets = new Map();

    // Remove duplicate markets with different maturity dates to speed up testing
    activeMarkets.forEach((market) => {
        const key = `${market.curator}-${market.loanToken}-${market.collaterals[0].token}`;
        if (!uniqueMarkets.has(key)) {
            uniqueMarkets.set(key, {
                ...market,
                chainId,
                quoteProvider: market.curator.toLowerCase(),
            });
        }
    });

    return [...uniqueMarkets.values()];
};

const parseTenorSlippageBps = (slippagePercentString) => {
    if (typeof slippagePercentString !== 'string') {
        throw new Error('Tenor slippage must be a decimal percent string');
    }

    const slippageBps = hre.ethers.utils.parseUnits(slippagePercentString, 2);
    if (slippageBps.lt(0) || slippageBps.gte(BPS)) {
        throw new Error('Tenor slippage must be greater than or equal to 0 and less than 100');
    }

    return slippageBps;
};

const parseTenorQuotedUnits = (quotedUnits) => {
    const units = hre.ethers.BigNumber.from(quotedUnits);
    if (units.lte(0)) throw new Error('Tenor quoted units must be greater than 0');

    return units;
};

const formatCollateralParams = (collateral) => [
    collateral.token,
    collateral.lltv,
    collateral.liquidation_cursor,
    collateral.oracle,
];

const formatMarket = (market) => [
    market.chain_id,
    market.midnight,
    market.loan_token,
    market.collaterals.map(formatCollateralParams),
    market.maturity,
    market.rcf_threshold,
    market.enter_gate,
    market.liquidator_gate,
];

const formatOffer = (offer) => [
    formatMarket(offer.market),
    offer.buy,
    offer.maker,
    offer.start,
    offer.expiry,
    offer.tick,
    offer.group,
    offer.callback,
    offer.callback_data,
    offer.receiver_if_maker_is_seller,
    offer.ratifier,
    offer.reduce_only,
    offer.max_units,
    offer.max_assets,
    offer.continuous_fee_cap,
];

const formatOfferFill = (offerFill) => [
    formatOffer(offerFill.offer),
    offerFill.ratifier_data,
    offerFill.units,
];

const formatTenorOffer = (offer, midnightAddress) => [
    [
        offer.chain_id,
        midnightAddress,
        offer.loan_token_address,
        offer.collaterals.map(formatCollateralParams),
        offer.maturity,
        offer.rcf_threshold,
        offer.enter_gate,
        offer.liquidator_gate,
    ],
    offer.buy,
    offer.maker,
    offer.start,
    offer.expiry,
    offer.tick,
    offer.group ?? hre.ethers.constants.HashZero,
    offer.callback ?? hre.ethers.constants.AddressZero,
    offer.callback_data ?? '0x',
    offer.receiver_if_maker_is_seller ?? hre.ethers.constants.AddressZero,
    offer.ratifier ?? hre.ethers.constants.AddressZero,
    offer.reduce_only,
    offer.max_units,
    offer.max_assets,
    offer.continuous_fee_cap,
];

const formatTenorOfferFill = (offerFill, midnightAddress) => [
    formatTenorOffer(offerFill.offer, midnightAddress),
    offerFill.offer.ratifier_data ?? '0x',
    offerFill.units,
];

const fetchMidnightQuote = async ({
    marketId,
    side,
    assets,
    units,
    slippage = DEFAULT_SLIPPAGE,
}) => {
    const hasAssets = assets !== undefined && assets !== null;
    const hasUnits = units !== undefined && units !== null;

    if (hasAssets === hasUnits) {
        throw new Error('Midnight quote requires exactly one of assets or units');
    }

    const quoteType = hasAssets ? 'assets' : 'units';
    const quoteAmount = hasAssets ? assets : units;
    const url = `${MIDNIGHT_API_URL}/${marketId}/${side}/quote?${quoteType}=${quoteAmount.toString()}&slippage=${slippage}`;
    await delay();
    const response = await fetch(url);

    if (!response.ok) {
        const error = new Error(`Midnight quote request failed with status ${response.status}`);
        error.status = response.status;
        throw error;
    }

    const result = await response.json();
    if (!result.data) throw new Error('Midnight quote response is missing data');

    return {
        averageBestPrice: hre.ethers.BigNumber.from(result.data.average_best_price),
        averageWorstPrice: hre.ethers.BigNumber.from(result.data.average_worst_price),
        availableAssets: hre.ethers.BigNumber.from(result.data.available_assets),
        availableUnits: hre.ethers.BigNumber.from(result.data.available_units),
        offerFills: result.data.takeable_offers.map(formatOfferFill),
    };
};

const fetchTenorQuote = async ({
    marketId,
    side,
    assets,
    units,
    taker,
    chainId,
    midnightAddress,
}) => {
    const hasAssets = assets !== undefined && assets !== null;
    const hasUnits = units !== undefined && units !== null;

    if (hasAssets === hasUnits) {
        throw new Error('Tenor quote requires exactly one of assets or units');
    }
    if (side !== 'asks' && side !== 'bids') {
        throw new Error(`Unsupported Tenor quote side: ${side}`);
    }

    const isBuy = side === 'asks';
    await delay();
    const response = await fetch(TENOR_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chain_id: chainId,
            market_hash: marketId,
            amount: (hasAssets ? assets : units).toString(),
            is_buy: isBuy,
            is_exact_in: hasAssets ? isBuy : !isBuy,
            algorithm: 'branch_and_bound',
            allow_partial: false,
            taker,
        }),
    });

    if (!response.ok) {
        const error = new Error(`Tenor quote request failed with status ${response.status}`);
        error.status = response.status;
        throw error;
    }

    const result = await response.json();
    const quotedUnits = hre.ethers.BigNumber.from(result.units ?? 0);
    if (quotedUnits.isZero() || !Array.isArray(result.offers) || result.offers.length === 0) {
        const error = new Error('Tenor quote returned no offers');
        error.code = 'NO_OFFERS';
        throw error;
    }

    return {
        quotedUnits,
        rate: hre.ethers.BigNumber.from(result.rate),
        rateQuoted: hre.ethers.BigNumber.from(result.rate_quoted),
        buyerAssets: hre.ethers.BigNumber.from(result.buyer_assets),
        sellerAssets: hre.ethers.BigNumber.from(result.seller_assets),
        offerFills: result.offers.map((offerFill) =>
            formatTenorOfferFill(offerFill, midnightAddress),
        ),
    };
};

const fetchQuote = ({
    quoteProvider = 'morpho',
    marketId,
    side,
    assets,
    units,
    slippage = DEFAULT_SLIPPAGE,
    taker,
    chainId,
    midnightAddress,
}) => {
    if (quoteProvider === 'morpho') {
        return fetchMidnightQuote({ marketId, side, assets, units, slippage });
    }
    if (quoteProvider === 'tenor') {
        return fetchTenorQuote({
            marketId,
            side,
            assets,
            units,
            taker,
            chainId,
            midnightAddress,
        });
    }

    throw new Error(`Unsupported Midnight quote provider: ${quoteProvider}`);
};

const calculateMaxUnits = (assets, averageWorstPrice) => {
    const assetsBn = hre.ethers.BigNumber.from(assets);
    const priceBn = hre.ethers.BigNumber.from(averageWorstPrice);

    return assetsBn.mul(WAD).add(priceBn.sub(1)).div(priceBn);
};

const calculateMinUnits = (assets, averageWorstPrice) => {
    const assetsBn = hre.ethers.BigNumber.from(assets);
    const priceBn = hre.ethers.BigNumber.from(averageWorstPrice);

    return assetsBn.mul(WAD).div(priceBn);
};

const calculateTenorMaxUnits = (quotedUnits, slippagePercentString) => {
    const units = parseTenorQuotedUnits(quotedUnits);
    const slippageBps = parseTenorSlippageBps(slippagePercentString);
    const denominator = BPS.sub(slippageBps);

    return units.mul(BPS).div(denominator);
};

const calculateTenorMinUnits = (quotedUnits, slippagePercentString) => {
    const units = parseTenorQuotedUnits(quotedUnits);
    const slippageBps = parseTenorSlippageBps(slippagePercentString);
    const denominator = BPS.add(slippageBps);

    return units.mul(BPS).add(denominator.sub(1)).div(denominator);
};

const seedMidnightDebt = async (midnight, marketId, user, debt) => {
    const debtBn = hre.ethers.BigNumber.from(debt);
    if (debtBn.gt(MAX_UINT128)) throw new Error('Midnight debt exceeds uint128');

    const innerMappingSlot = hre.ethers.utils.keccak256(
        hre.ethers.utils.defaultAbiCoder.encode(['bytes32', 'uint256'], [marketId, 0]),
    );
    const positionSlot = hre.ethers.utils.keccak256(
        hre.ethers.utils.defaultAbiCoder.encode(['address', 'bytes32'], [user, innerMappingSlot]),
    );
    const debtAndBitmapSlot = hre.ethers.BigNumber.from(positionSlot).add(2);
    const paddedSlot = hre.ethers.utils.hexZeroPad(debtAndBitmapSlot.toHexString(), 32);
    const currentValue = hre.ethers.BigNumber.from(
        await hre.ethers.provider.getStorageAt(midnight.address, paddedSlot),
    );
    const updatedValue = currentValue.shr(128).shl(128).or(debtBn);

    await hre.network.provider.send('hardhat_setStorageAt', [
        midnight.address,
        paddedSlot,
        hre.ethers.utils.hexZeroPad(updatedValue.toHexString(), 32),
    ]);

    const seededDebt = await midnight.debt(marketId, user);
    if (!seededDebt.eq(debtBn)) {
        throw new Error(`Failed to seed Midnight debt: expected ${debtBn}, got ${seededDebt}`);
    }
};

const fetchMidnightQuoteForMinFills = async ({
    marketId,
    side,
    initialAssets,
    minFills,
    slippage = DEFAULT_SLIPPAGE,
}) => {
    let assets = hre.ethers.BigNumber.from(initialAssets);

    for (let i = 0; i < MAX_QUOTE_ATTEMPTS; i++) {
        const quote = await fetchMidnightQuote({ marketId, side, assets, slippage });
        if (quote.offerFills.length === 0) {
            throw new Error('Midnight quote returned no offers');
        }

        const precedingOffers = quote.offerFills.slice(0, minFills - 1);
        const precedingUnits = precedingOffers.reduce(
            (sum, offerFill) => sum.add(offerFill[2]),
            hre.ethers.constants.Zero,
        );

        if (
            quote.offerFills.length >= minFills &&
            assets.gt(precedingUnits) &&
            quote.availableAssets.gte(assets)
        ) {
            return { ...quote, assets };
        }

        const nextAssets = precedingUnits.add(1);
        assets = nextAssets.gt(assets) ? nextAssets : assets.mul(2);
    }

    throw new Error(`Unable to find a Midnight quote requiring ${minFills} offers`);
};

module.exports = {
    calculateMaxUnits,
    calculateMinUnits,
    calculateTenorMaxUnits,
    calculateTenorMinUnits,
    fetchQuote,
    fetchMidnightQuote,
    fetchMidnightQuoteForMinFills,
    getMidnightMarkets,
    seedMidnightDebt,
    DEFAULT_SLIPPAGE,
};
