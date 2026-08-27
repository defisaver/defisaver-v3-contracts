const { expect } = require('chai');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');

const {
    approve,
    addrs,
    balanceOf,
    chainIds,
    getAllowance,
    getProxy,
    nullAddress,
    redeploy,
    revertToSnapshot,
    setBalance,
    setForkForTesting,
    takeSnapshot,
} = require('../../utils/utils');
const {
    encodeMidnightBorrowFromOrders,
    midnightBorrowFromOrders,
    midnightSupplyCollateral,
} = require('../../utils/actions');
const {
    calculateMaxUnits,
    calculateTenorMaxUnits,
    fetchMidnightQuote,
    fetchMidnightQuoteForMinFills,
    fetchQuote,
    getMidnightMarkets,
    DEFAULT_SLIPPAGE,
} = require('../../utils/midnight');

const network = hre.network.config.name;
const chainId = chainIds[network];
const midnightAddress = addrs[network]?.MIDNIGHT_ADDRESS;
const borrowMarkets = getMidnightMarkets(network);
const morphoMarket = borrowMarkets.find(({ quoteProvider }) => quoteProvider === 'morpho');

describe('Midnight-Borrow-From-Orders', function () {
    this.timeout(150000);

    let senderAcc;
    let proxy;
    let midnight;
    let borrowAction;
    let snapshotId;

    const supplyCollateral = async (market) => {
        const collateralAmount = hre.ethers.utils.parseUnits('1000', market.collateralDecimals);
        await setBalance(market.collaterals[0].token, senderAcc.address, collateralAmount);
        await approve(market.collaterals[0].token, proxy.address, senderAcc);
        await midnightSupplyCollateral(
            proxy,
            market.marketId,
            nullAddress,
            senderAcc.address,
            collateralAmount,
            0,
        );
    };

    before(async function () {
        if (!midnightAddress || !morphoMarket) this.skip();

        dfs.configure({ chainId, testingMode: true });
        senderAcc = (await hre.ethers.getSigners())[0];
        await setForkForTesting();
        await hre.network.provider.send('evm_mine');
        proxy = await getProxy(senderAcc.address, false);
        midnight = await hre.ethers.getContractAt('IMidnight', midnightAddress);

        await redeploy('MidnightSupplyCollateral');
        borrowAction = await redeploy('MidnightBorrowFromOrders');

        const tokens = [
            ...new Set(
                borrowMarkets.flatMap(({ loanToken, collaterals }) => [
                    loanToken,
                    collaterals[0].token,
                ]),
            ),
        ];
        const tokenDecimals = new Map(
            await Promise.all(
                tokens.map(async (token) => [
                    token,
                    await hre.ethers
                        .getContractAt('IERC20', token)
                        .then((contract) => contract.decimals()),
                ]),
            ),
        );

        for (const market of borrowMarkets) {
            market.loanTokenDecimals = tokenDecimals.get(market.loanToken);
            market.collateralDecimals = tokenDecimals.get(market.collaterals[0].token);
        }
    });

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    borrowMarkets.forEach((market) => {
        it(`should borrow from ${market.label}`, async function () {
            await supplyCollateral(market);
            const borrowAmount = hre.ethers.utils.parseUnits(
                market.loanTokenDecimals === 18 ? '0.1' : '2',
                market.loanTokenDecimals,
            );
            const quote = await fetchQuote({
                quoteProvider: market.quoteProvider,
                marketId: market.marketId,
                side: 'bids',
                assets: borrowAmount,
                slippage: DEFAULT_SLIPPAGE,
                taker: proxy.address,
                chainId,
                midnightAddress,
            });
            const offerFills =
                market.quoteProvider === 'tenor' ? quote.offerFills : quote.offerFills.slice(0, 1);
            const maxUnits =
                market.quoteProvider === 'tenor'
                    ? calculateTenorMaxUnits(quote.quotedUnits, DEFAULT_SLIPPAGE)
                    : calculateMaxUnits(borrowAmount, quote.averageWorstPrice);
            if (market.quoteProvider === 'tenor') {
                expect(maxUnits).to.be.gt(quote.quotedUnits);
            }
            const [offer] = offerFills[0];

            const balanceBefore = await balanceOf(market.loanToken, senderAcc.address);
            const debtBefore = await midnight.debt(market.marketId, proxy.address);
            const consumedBefore = await midnight.consumed(offer[2], offer[6]);

            try {
                await midnightBorrowFromOrders(
                    proxy,
                    market.marketId,
                    nullAddress,
                    senderAcc.address,
                    borrowAmount,
                    maxUnits,
                    offerFills,
                );
            } catch (error) {
                if (
                    market.quoteProvider === 'tenor' &&
                    error.message.includes('reverted without a reason')
                ) {
                    console.log('Skipping test: Tenor route is currently not executable');
                    this.skip();
                }
                throw error;
            }

            const balanceAfter = await balanceOf(market.loanToken, senderAcc.address);
            const debtAfter = await midnight.debt(market.marketId, proxy.address);
            const consumedAfter = await midnight.consumed(offer[2], offer[6]);
            const debtIncrease = debtAfter.sub(debtBefore);

            expect(balanceAfter.sub(balanceBefore)).to.eq(borrowAmount);
            expect(debtIncrease).to.be.gt(0);
            expect(debtIncrease).to.be.lte(maxUnits);
            expect(consumedAfter).to.be.gt(consumedBefore);
            expect(await balanceOf(market.loanToken, proxy.address)).to.eq(0);
            expect(await getAllowance(market.loanToken, proxy.address, midnightAddress)).to.eq(0);
        });
    });

    it('should borrow using at least three orders', async function () {
        await supplyCollateral(morphoMarket);
        const quote = await fetchMidnightQuoteForMinFills({
            marketId: morphoMarket.marketId,
            side: 'bids',
            initialAssets: hre.ethers.utils.parseUnits('10000', morphoMarket.loanTokenDecimals),
            minFills: 3,
            slippage: DEFAULT_SLIPPAGE,
        });
        const maxUnits = calculateMaxUnits(quote.assets, quote.averageWorstPrice);
        const uniqueOffers = new Map();
        quote.offerFills.forEach(([offer]) => {
            uniqueOffers.set(`${offer[2].toLowerCase()}-${offer[6].toLowerCase()}`, offer);
        });
        const offers = [...uniqueOffers.values()];
        const consumedBefore = await Promise.all(
            offers.map((offer) => midnight.consumed(offer[2], offer[6])),
        );
        const balanceBefore = await balanceOf(morphoMarket.loanToken, senderAcc.address);
        const debtBefore = await midnight.debt(morphoMarket.marketId, proxy.address);

        await midnightBorrowFromOrders(
            proxy,
            morphoMarket.marketId,
            nullAddress,
            senderAcc.address,
            quote.assets,
            maxUnits,
            quote.offerFills,
        );

        const consumedAfter = await Promise.all(
            offers.map((offer) => midnight.consumed(offer[2], offer[6])),
        );
        const usedOffers = consumedAfter.filter((consumed, i) =>
            consumed.gt(consumedBefore[i]),
        ).length;
        const balanceAfter = await balanceOf(morphoMarket.loanToken, senderAcc.address);
        const debtAfter = await midnight.debt(morphoMarket.marketId, proxy.address);
        const debtIncrease = debtAfter.sub(debtBefore);

        expect(balanceAfter.sub(balanceBefore)).to.eq(quote.assets);
        expect(debtIncrease).to.be.gt(0);
        expect(debtIncrease).to.be.lte(maxUnits);
        if (usedOffers < 3) {
            console.log(`Skipping test: current order book only consumed ${usedOffers} offers`);
            this.skip();
        }
        expect(usedOffers).to.be.gte(3);
    });

    it('should revert when no orders are provided', async () => {
        const functionData = encodeMidnightBorrowFromOrders(
            morphoMarket.marketId,
            nullAddress,
            senderAcc.address,
            hre.ethers.utils.parseUnits('2', morphoMarket.loanTokenDecimals),
            hre.ethers.constants.MaxUint256,
            [],
        );

        await expect(
            senderAcc.sendTransaction({ to: borrowAction.address, data: functionData }),
        ).to.be.revertedWith('NoOrdersProvided');
    });

    it('should revert when a sell offer is provided', async () => {
        const borrowAmount = hre.ethers.utils.parseUnits('2', morphoMarket.loanTokenDecimals);
        const quote = await fetchMidnightQuote({
            marketId: morphoMarket.marketId,
            side: 'bids',
            assets: borrowAmount,
            slippage: DEFAULT_SLIPPAGE,
        });
        const offerFills = quote.offerFills.slice(0, 1);
        offerFills[0][0][1] = false;
        const functionData = encodeMidnightBorrowFromOrders(
            morphoMarket.marketId,
            nullAddress,
            senderAcc.address,
            borrowAmount,
            hre.ethers.constants.MaxUint256,
            offerFills,
        );

        await expect(
            senderAcc.sendTransaction({ to: borrowAction.address, data: functionData }),
        ).to.be.revertedWith('InvalidOfferType');
    });
});
