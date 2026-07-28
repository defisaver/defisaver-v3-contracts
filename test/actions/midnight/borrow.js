const { expect } = require('chai');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');

const {
    approve,
    balanceOf,
    getProxy,
    nullAddress,
    redeploy,
    revertToSnapshot,
    setBalance,
    setForkForTesting,
    takeSnapshot,
} = require('../../utils/utils');
const { midnightBorrowFromOrders, midnightSupplyCollateral } = require('../../utils/actions');
const {
    calculateMaxUnits,
    fetchMidnightQuote,
    fetchMidnightQuoteForMinFills,
} = require('../../utils/midnight');

const MARKET_ID = '0x05959752fdeff325962b9d263edb421efc6e2186a49360dba6c32e86ebf6c84c';
const MIDNIGHT_ADDRESS = '0xAdedD8ab6dE832766Fedf0FaC4992E5C4D3EA18A';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CBBTC_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
const SLIPPAGE = '0.5';

describe('Midnight-Borrow-From-Orders', function () {
    this.timeout(150000);

    let senderAcc;
    let proxy;
    let midnight;
    let snapshotId;

    before(async function () {
        if (hre.network.config.name !== 'base') this.skip();

        dfs.configure({ chainId: 8453, testingMode: true });
        senderAcc = (await hre.ethers.getSigners())[0];
        await setForkForTesting();
        proxy = await getProxy(senderAcc.address, false);
        midnight = await hre.ethers.getContractAt('IMidnight', MIDNIGHT_ADDRESS);

        await redeploy('MidnightSupplyCollateral');
        await redeploy('MidnightBorrowFromOrders');

        const collateralAmount = hre.ethers.utils.parseUnits('1000', 8);
        await setBalance(CBBTC_ADDRESS, senderAcc.address, collateralAmount);
        await approve(CBBTC_ADDRESS, proxy.address, senderAcc);
        await midnightSupplyCollateral(
            proxy,
            MARKET_ID,
            nullAddress,
            senderAcc.address,
            collateralAmount,
            0,
        );
    });

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    it('should borrow using one order', async () => {
        const borrowAmount = hre.ethers.utils.parseUnits('2', 6);
        const quote = await fetchMidnightQuote({
            marketId: MARKET_ID,
            side: 'bids',
            assets: borrowAmount,
            slippage: SLIPPAGE,
        });
        const offerFills = quote.offerFills.slice(0, 1);
        const maxUnits = calculateMaxUnits(borrowAmount, quote.averageWorstPrice);
        const [offer] = offerFills[0];

        const balanceBefore = await balanceOf(USDC_ADDRESS, senderAcc.address);
        const debtBefore = await midnight.debt(MARKET_ID, proxy.address);
        const consumedBefore = await midnight.consumed(offer[2], offer[6]);

        await midnightBorrowFromOrders(
            proxy,
            MARKET_ID,
            nullAddress,
            senderAcc.address,
            borrowAmount,
            maxUnits,
            offerFills,
        );

        const balanceAfter = await balanceOf(USDC_ADDRESS, senderAcc.address);
        const debtAfter = await midnight.debt(MARKET_ID, proxy.address);
        const consumedAfter = await midnight.consumed(offer[2], offer[6]);
        const debtIncrease = debtAfter.sub(debtBefore);

        expect(balanceAfter.sub(balanceBefore)).to.eq(borrowAmount);
        expect(debtIncrease).to.be.gt(0);
        expect(debtIncrease).to.be.lte(maxUnits);
        expect(consumedAfter).to.be.gt(consumedBefore);
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
        await expect(
            midnightBorrowFromOrders(
                proxy,
                MARKET_ID,
                nullAddress,
                senderAcc.address,
                hre.ethers.utils.parseUnits('2', 6),
                hre.ethers.constants.MaxUint256,
                [],
            ),
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

        await expect(
            midnightBorrowFromOrders(
                proxy,
                MARKET_ID,
                nullAddress,
                senderAcc.address,
                borrowAmount,
                hre.ethers.constants.MaxUint256,
                offerFills,
            ),
        ).to.be.revertedWith('InvalidOfferType');
    });
});
