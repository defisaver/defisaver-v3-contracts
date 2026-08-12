const { expect } = require('chai');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');

const {
    approve,
    balanceOf,
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
} = require('../../utils/midnight');

const MARKET_ID = '0x05959752fdeff325962b9d263edb421efc6e2186a49360dba6c32e86ebf6c84c';
const TENOR_MARKET_ID = '0x44495af1cca7842191a65a73978e01ed72238731e193c3b11460083efd60a318';
const MIDNIGHT_ADDRESS = '0xAdedD8ab6dE832766Fedf0FaC4992E5C4D3EA18A';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CBBTC_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
const SLIPPAGE = '0.5';

const BORROW_MARKETS = [
    {
        name: 'one Morpho order',
        marketId: MARKET_ID,
        quoteProvider: 'morpho',
    },
    {
        name: 'a Tenor route',
        marketId: TENOR_MARKET_ID,
        quoteProvider: 'tenor',
    },
];

describe('Midnight-Borrow-From-Orders', function () {
    this.timeout(150000);

    let senderAcc;
    let proxy;
    let midnight;
    let borrowAction;
    let snapshotId;

    before(async function () {
        if (hre.network.config.name !== 'base') this.skip();

        dfs.configure({ chainId: 8453, testingMode: true });
        senderAcc = (await hre.ethers.getSigners())[0];
        await setForkForTesting();
        await hre.network.provider.send('evm_mine');
        proxy = await getProxy(senderAcc.address, false);
        midnight = await hre.ethers.getContractAt('IMidnight', MIDNIGHT_ADDRESS);

        await redeploy('MidnightSupplyCollateral');
        borrowAction = await redeploy('MidnightBorrowFromOrders');

        const collateralAmount = hre.ethers.utils.parseUnits('1000', 8);
        await setBalance(
            CBBTC_ADDRESS,
            senderAcc.address,
            collateralAmount.mul(BORROW_MARKETS.length),
        );
        await approve(CBBTC_ADDRESS, proxy.address, senderAcc);
        for (const { marketId } of BORROW_MARKETS) {
            await midnightSupplyCollateral(
                proxy,
                marketId,
                nullAddress,
                senderAcc.address,
                collateralAmount,
                0,
            );
        }
    });

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    BORROW_MARKETS.forEach(({ name, marketId, quoteProvider }) => {
        it(`should borrow using ${name}`, async () => {
            const borrowAmount = hre.ethers.utils.parseUnits('2', 6);
            const quote = await fetchQuote({
                quoteProvider,
                marketId,
                side: 'bids',
                assets: borrowAmount,
                slippage: SLIPPAGE,
                taker: proxy.address,
            });
            const offerFills =
                quoteProvider === 'tenor' ? quote.offerFills : quote.offerFills.slice(0, 1);
            const maxUnits =
                quoteProvider === 'tenor'
                    ? calculateTenorMaxUnits(quote.quotedUnits, SLIPPAGE)
                    : calculateMaxUnits(borrowAmount, quote.averageWorstPrice);
            if (quoteProvider === 'tenor') {
                expect(maxUnits).to.be.gt(quote.quotedUnits);
            }
            const [offer] = offerFills[0];

            const balanceBefore = await balanceOf(USDC_ADDRESS, senderAcc.address);
            const debtBefore = await midnight.debt(marketId, proxy.address);
            const consumedBefore = await midnight.consumed(offer[2], offer[6]);

            await midnightBorrowFromOrders(
                proxy,
                marketId,
                nullAddress,
                senderAcc.address,
                borrowAmount,
                maxUnits,
                offerFills,
            );

            const balanceAfter = await balanceOf(USDC_ADDRESS, senderAcc.address);
            const debtAfter = await midnight.debt(marketId, proxy.address);
            const consumedAfter = await midnight.consumed(offer[2], offer[6]);
            const debtIncrease = debtAfter.sub(debtBefore);

            expect(balanceAfter.sub(balanceBefore)).to.eq(borrowAmount);
            expect(debtIncrease).to.be.gt(0);
            expect(debtIncrease).to.be.lte(maxUnits);
            expect(consumedAfter).to.be.gt(consumedBefore);
            expect(await balanceOf(USDC_ADDRESS, proxy.address)).to.eq(0);
            expect(await getAllowance(USDC_ADDRESS, proxy.address, MIDNIGHT_ADDRESS)).to.eq(0);
        });
    });

    it('should borrow using at least three orders', async () => {
        const quote = await fetchMidnightQuoteForMinFills({
            marketId: MARKET_ID,
            side: 'bids',
            initialAssets: hre.ethers.utils.parseUnits('10000', 6),
            minFills: 3,
            slippage: SLIPPAGE,
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
        const balanceBefore = await balanceOf(USDC_ADDRESS, senderAcc.address);
        const debtBefore = await midnight.debt(MARKET_ID, proxy.address);

        await midnightBorrowFromOrders(
            proxy,
            MARKET_ID,
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
        const balanceAfter = await balanceOf(USDC_ADDRESS, senderAcc.address);
        const debtAfter = await midnight.debt(MARKET_ID, proxy.address);
        const debtIncrease = debtAfter.sub(debtBefore);

        expect(balanceAfter.sub(balanceBefore)).to.eq(quote.assets);
        expect(debtIncrease).to.be.gt(0);
        expect(debtIncrease).to.be.lte(maxUnits);
        expect(usedOffers).to.be.gte(3);
    });

    it('should revert when no orders are provided', async () => {
        const functionData = encodeMidnightBorrowFromOrders(
            MARKET_ID,
            nullAddress,
            senderAcc.address,
            hre.ethers.utils.parseUnits('2', 6),
            hre.ethers.constants.MaxUint256,
            [],
        );

        await expect(
            senderAcc.sendTransaction({ to: borrowAction.address, data: functionData }),
        ).to.be.revertedWith('NoOrdersProvided');
    });

    it('should revert when a sell offer is provided', async () => {
        const borrowAmount = hre.ethers.utils.parseUnits('2', 6);
        const quote = await fetchMidnightQuote({
            marketId: MARKET_ID,
            side: 'bids',
            assets: borrowAmount,
            slippage: SLIPPAGE,
        });
        const offerFills = quote.offerFills.slice(0, 1);
        offerFills[0][0][1] = false;
        const functionData = encodeMidnightBorrowFromOrders(
            MARKET_ID,
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
