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
    encodeMidnightPaybackFromOrders,
    midnightPaybackFromOrders,
} = require('../../utils/actions');
const {
    calculateMinUnits,
    fetchMidnightQuote,
    fetchMidnightQuoteForMinFills,
    fetchQuote,
    seedMidnightDebt,
} = require('../../utils/midnight');

const MARKET_ID = '0x05959752fdeff325962b9d263edb421efc6e2186a49360dba6c32e86ebf6c84c';
const MIDNIGHT_ADDRESS = '0xAdedD8ab6dE832766Fedf0FaC4992E5C4D3EA18A';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const SLIPPAGE = '0.5';
const WAD = hre.ethers.constants.WeiPerEther;

const PAYBACK_MARKETS = [
    { name: 'one Morpho order', marketId: MARKET_ID, quoteProvider: 'morpho' },
    { name: 'a Tenor route', marketId: MARKET_ID, quoteProvider: 'tenor' },
];

const sumOfferFillUnits = (offerFills) =>
    offerFills.reduce((sum, offerFill) => sum.add(offerFill[2]), hre.ethers.constants.Zero);

const getUniqueOffers = (offerFills) => {
    const uniqueOffers = new Map();
    offerFills.forEach(([offer]) => {
        uniqueOffers.set(`${offer[2].toLowerCase()}-${offer[6].toLowerCase()}`, offer);
    });
    return [...uniqueOffers.values()];
};

describe('Midnight-Payback-From-Orders', function () {
    this.timeout(180000);

    let senderAcc;
    let proxy;
    let midnight;
    let paybackAction;
    let snapshotId;

    const fetchSmallAskQuote = (amount) =>
        fetchMidnightQuote({
            marketId: MARKET_ID,
            side: 'asks',
            assets: amount,
            slippage: SLIPPAGE,
        });

    const fundAndApprove = async (amount, spender = proxy.address) => {
        await setBalance(USDC_ADDRESS, senderAcc.address, amount);
        await approve(USDC_ADDRESS, spender, senderAcc);
    };

    const assertNoTokenResidue = async (wallet) => {
        expect(await balanceOf(USDC_ADDRESS, wallet)).to.eq(0);
        expect(await getAllowance(USDC_ADDRESS, wallet, MIDNIGHT_ADDRESS)).to.eq(0);
    };

    const executePaybackDirect = (amount, minUnits, offerFills) => {
        const functionData = encodeMidnightPaybackFromOrders(
            MARKET_ID,
            nullAddress,
            senderAcc.address,
            amount,
            minUnits,
            offerFills,
        );
        return senderAcc.sendTransaction({ to: paybackAction.address, data: functionData });
    };

    const prepareDirectPayback = async (debt, amount) => {
        await seedMidnightDebt(midnight, MARKET_ID, paybackAction.address, debt);
        await fundAndApprove(amount, paybackAction.address);

        return {
            balance: await balanceOf(USDC_ADDRESS, senderAcc.address),
            debt: await midnight.debt(MARKET_ID, paybackAction.address),
        };
    };

    const assertDirectStateUnchanged = async (stateBefore) => {
        expect(await balanceOf(USDC_ADDRESS, senderAcc.address)).to.eq(stateBefore.balance);
        expect(await midnight.debt(MARKET_ID, paybackAction.address)).to.eq(stateBefore.debt);
        await assertNoTokenResidue(paybackAction.address);
    };

    before(async function () {
        if (hre.network.config.name !== 'base') this.skip();

        dfs.configure({ chainId: 8453, testingMode: true });
        senderAcc = (await hre.ethers.getSigners())[0];
        await setForkForTesting();
        await hre.network.provider.send('evm_mine');
        proxy = await getProxy(senderAcc.address, false);
        midnight = await hre.ethers.getContractAt('IMidnight', MIDNIGHT_ADDRESS);
        paybackAction = await redeploy('MidnightPaybackFromOrders');
    });

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    PAYBACK_MARKETS.forEach(({ name, marketId, quoteProvider }) => {
        it(`should pay back using ${name}`, async () => {
            const paybackAmount = hre.ethers.utils.parseUnits('2', 6);
            const quote = await fetchQuote({
                quoteProvider,
                marketId,
                side: 'asks',
                assets: paybackAmount,
                slippage: SLIPPAGE,
                taker: proxy.address,
            });

            let offerFills;
            let minUnits;
            let seededDebt;
            if (quoteProvider === 'tenor') {
                offerFills = quote.offerFills;
                minUnits = quote.quotedUnits;
                seededDebt = quote.quotedUnits.mul(2);
            } else {
                const expectedUnits = calculateMinUnits(paybackAmount, quote.averageBestPrice);
                const offerFill = quote.offerFills.find((fill) =>
                    hre.ethers.BigNumber.from(fill[2]).gt(expectedUnits),
                );
                if (!offerFill) throw new Error('Midnight quote has no single ask large enough');

                offerFills = [offerFill];
                minUnits = calculateMinUnits(paybackAmount, quote.averageWorstPrice);
                seededDebt = hre.ethers.BigNumber.from(offerFill[2]);
            }

            const [offer] = offerFills[0];
            await seedMidnightDebt(midnight, marketId, proxy.address, seededDebt);
            await fundAndApprove(paybackAmount);

            const balanceBefore = await balanceOf(USDC_ADDRESS, senderAcc.address);
            const debtBefore = await midnight.debt(marketId, proxy.address);
            const consumedBefore = await midnight.consumed(offer[2], offer[6]);

            await midnightPaybackFromOrders(
                proxy,
                marketId,
                nullAddress,
                senderAcc.address,
                paybackAmount,
                minUnits,
                offerFills,
            );

            const balanceAfter = await balanceOf(USDC_ADDRESS, senderAcc.address);
            const debtAfter = await midnight.debt(marketId, proxy.address);
            const consumedAfter = await midnight.consumed(offer[2], offer[6]);
            const repaidUnits = debtBefore.sub(debtAfter);

            expect(balanceBefore.sub(balanceAfter)).to.eq(paybackAmount);
            expect(repaidUnits).to.be.gte(minUnits);
            expect(debtAfter).to.be.gt(0);
            expect(consumedAfter).to.be.gt(consumedBefore);
            await assertNoTokenResidue(proxy.address);
        });
    });

    it('should pay back using at least three orders', async () => {
        const quote = await fetchMidnightQuoteForMinFills({
            marketId: MARKET_ID,
            side: 'asks',
            initialAssets: hre.ethers.utils.parseUnits('10000', 6),
            minFills: 3,
            slippage: SLIPPAGE,
        });
        const minUnits = calculateMinUnits(quote.assets, quote.averageWorstPrice);
        const seededDebt = sumOfferFillUnits(quote.offerFills);
        const offers = getUniqueOffers(quote.offerFills);

        await seedMidnightDebt(midnight, MARKET_ID, proxy.address, seededDebt);
        await fundAndApprove(quote.assets);

        const consumedBefore = await Promise.all(
            offers.map((offer) => midnight.consumed(offer[2], offer[6])),
        );
        const balanceBefore = await balanceOf(USDC_ADDRESS, senderAcc.address);
        const debtBefore = await midnight.debt(MARKET_ID, proxy.address);

        await midnightPaybackFromOrders(
            proxy,
            MARKET_ID,
            nullAddress,
            senderAcc.address,
            quote.assets,
            minUnits,
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

        expect(balanceBefore.sub(balanceAfter)).to.eq(quote.assets);
        expect(debtBefore.sub(debtAfter)).to.be.gte(minUnits);
        expect(usedOffers).to.be.gte(3);
        await assertNoTokenResidue(proxy.address);
    });

    it('should fully pay back with max amount and refund unused tokens', async () => {
        const seededDebt = hre.ethers.utils.parseUnits('100', 6);
        const quote = await fetchMidnightQuote({
            marketId: MARKET_ID,
            side: 'asks',
            units: seededDebt,
            slippage: SLIPPAGE,
        });
        if (!quote.averageBestPrice.lt(WAD)) {
            throw new Error('Midnight ask price must be below one for the refund test');
        }

        const offers = getUniqueOffers(quote.offerFills);
        await seedMidnightDebt(midnight, MARKET_ID, proxy.address, seededDebt);
        await fundAndApprove(seededDebt);

        const consumedBefore = await Promise.all(
            offers.map((offer) => midnight.consumed(offer[2], offer[6])),
        );
        const balanceBefore = await balanceOf(USDC_ADDRESS, senderAcc.address);

        await midnightPaybackFromOrders(
            proxy,
            MARKET_ID,
            nullAddress,
            senderAcc.address,
            hre.ethers.constants.MaxUint256,
            seededDebt,
            quote.offerFills,
        );

        const consumedAfter = await Promise.all(
            offers.map((offer) => midnight.consumed(offer[2], offer[6])),
        );
        const usedOffers = consumedAfter.filter((consumed, i) =>
            consumed.gt(consumedBefore[i]),
        ).length;
        const balanceAfter = await balanceOf(USDC_ADDRESS, senderAcc.address);
        const spentAmount = balanceBefore.sub(balanceAfter);
        const worstPrice = quote.averageWorstPrice.gt(WAD) ? WAD : quote.averageWorstPrice;
        const maxSpend = seededDebt.mul(worstPrice).add(WAD.sub(1)).div(WAD);

        expect(await midnight.debt(MARKET_ID, proxy.address)).to.eq(0);
        expect(spentAmount).to.be.gt(0);
        expect(spentAmount).to.be.lt(seededDebt);
        expect(spentAmount).to.be.lte(maxSpend);
        expect(balanceAfter).to.eq(seededDebt.sub(spentAmount));
        expect(usedOffers).to.be.gte(1);
        await assertNoTokenResidue(proxy.address);
    });

    it('should skip a failed order and use a fallback order', async () => {
        const paybackAmount = hre.ethers.utils.parseUnits('2', 6);
        const quote = await fetchSmallAskQuote(paybackAmount);
        if (quote.offerFills.length < 2) {
            throw new Error('Midnight quote needs at least two asks for the fallback test');
        }

        const offerFills = quote.offerFills;
        offerFills[0][0][4] = 1;
        const firstOffer = offerFills[0][0];
        const fallbackOffers = getUniqueOffers(offerFills.slice(1));
        const minUnits = calculateMinUnits(paybackAmount, quote.averageWorstPrice);
        const seededDebt = sumOfferFillUnits(offerFills);

        await seedMidnightDebt(midnight, MARKET_ID, proxy.address, seededDebt);
        await fundAndApprove(paybackAmount);

        const firstConsumedBefore = await midnight.consumed(firstOffer[2], firstOffer[6]);
        const fallbackConsumedBefore = await Promise.all(
            fallbackOffers.map((offer) => midnight.consumed(offer[2], offer[6])),
        );
        const balanceBefore = await balanceOf(USDC_ADDRESS, senderAcc.address);

        await midnightPaybackFromOrders(
            proxy,
            MARKET_ID,
            nullAddress,
            senderAcc.address,
            paybackAmount,
            minUnits,
            offerFills,
        );

        const fallbackConsumedAfter = await Promise.all(
            fallbackOffers.map((offer) => midnight.consumed(offer[2], offer[6])),
        );
        const usedFallback = fallbackConsumedAfter.some((consumed, i) =>
            consumed.gt(fallbackConsumedBefore[i]),
        );
        const balanceAfter = await balanceOf(USDC_ADDRESS, senderAcc.address);

        expect(balanceBefore.sub(balanceAfter)).to.eq(paybackAmount);
        expect(await midnight.consumed(firstOffer[2], firstOffer[6])).to.eq(firstConsumedBefore);
        expect(usedFallback).to.eq(true);
        await assertNoTokenResidue(proxy.address);
    });

    it('should revert when no orders are provided', async () => {
        await expect(
            executePaybackDirect(
                hre.ethers.utils.parseUnits('2', 6),
                hre.ethers.constants.Zero,
                [],
            ),
        ).to.be.revertedWith('NoOrdersProvided');
    });

    it('should revert when zero amount is requested', async () => {
        const quote = await fetchSmallAskQuote(hre.ethers.utils.parseUnits('2', 6));

        await expect(
            executePaybackDirect(0, hre.ethers.constants.Zero, quote.offerFills),
        ).to.be.revertedWith('ZeroAmountRequested');
    });

    it('should revert when a buy offer is provided', async () => {
        const paybackAmount = hre.ethers.utils.parseUnits('2', 6);
        const quote = await fetchSmallAskQuote(paybackAmount);
        quote.offerFills[0][0][1] = true;
        const seededDebt = sumOfferFillUnits(quote.offerFills);
        const stateBefore = await prepareDirectPayback(seededDebt, paybackAmount);

        await expect(executePaybackDirect(paybackAmount, 0, quote.offerFills)).to.be.revertedWith(
            'InvalidOfferType',
        );
        await assertDirectStateUnchanged(stateBefore);
    });

    it('should revert when an offer has a different market', async () => {
        const paybackAmount = hre.ethers.utils.parseUnits('2', 6);
        const quote = await fetchSmallAskQuote(paybackAmount);
        quote.offerFills[0][0][0][0] = 1;
        const seededDebt = sumOfferFillUnits(quote.offerFills);
        const stateBefore = await prepareDirectPayback(seededDebt, paybackAmount);

        await expect(executePaybackDirect(paybackAmount, 0, quote.offerFills)).to.be.revertedWith(
            'InvalidOfferMarketId',
        );
        await assertDirectStateUnchanged(stateBefore);
    });

    it('should revert when orders cannot fulfill the payback', async () => {
        const paybackAmount = hre.ethers.utils.parseUnits('2', 6);
        const quote = await fetchSmallAskQuote(paybackAmount);
        const seededDebt = sumOfferFillUnits(quote.offerFills);
        quote.offerFills.forEach((offerFill) => {
            offerFill[2] = '0';
        });
        const stateBefore = await prepareDirectPayback(seededDebt, paybackAmount);

        await expect(executePaybackDirect(paybackAmount, 0, quote.offerFills)).to.be.revertedWith(
            'CannotFulfillPayback',
        );
        await assertDirectStateUnchanged(stateBefore);
    });

    it('should revert when minimum units are not reached', async () => {
        const paybackAmount = hre.ethers.utils.parseUnits('2', 6);
        const quote = await fetchSmallAskQuote(paybackAmount);
        const seededDebt = sumOfferFillUnits(quote.offerFills);
        const stateBefore = await prepareDirectPayback(seededDebt, paybackAmount);

        await expect(
            executePaybackDirect(paybackAmount, hre.ethers.constants.MaxUint256, quote.offerFills),
        ).to.be.revertedWith('MinUnitsSlippage');
        await assertDirectStateUnchanged(stateBefore);
    });
});
