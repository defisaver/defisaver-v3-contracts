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
    encodeMidnightPaybackFromOrders,
    midnightPaybackFromOrders,
} = require('../../utils/actions');
const {
    calculateMinUnits,
    calculateTenorMinUnits,
    fetchMidnightQuote,
    fetchMidnightQuoteForMinFills,
    fetchQuote,
    getMidnightMarkets,
    seedMidnightDebt,
    DEFAULT_SLIPPAGE,
} = require('../../utils/midnight');

const WAD = hre.ethers.constants.WeiPerEther;
const network = hre.network.config.name;
const chainId = chainIds[network];
const midnightAddress = addrs[network]?.MIDNIGHT_ADDRESS;
const paybackMarkets = getMidnightMarkets(network);
const morphoMarket = paybackMarkets.find(({ quoteProvider }) => quoteProvider === 'morpho');

const sumOfferFillUnits = (offerFills) =>
    offerFills.reduce((sum, offerFill) => sum.add(offerFill[2]), hre.ethers.constants.Zero);

const getUniqueOffers = (offerFills) => {
    const uniqueOffers = new Map();
    offerFills.forEach(([offer]) => {
        uniqueOffers.set(`${offer[2].toLowerCase()}-${offer[6].toLowerCase()}`, offer);
    });
    return [...uniqueOffers.values()];
};

const fetchAskQuoteOrSkip = async (context, quotePromise) => {
    try {
        return await quotePromise;
    } catch (error) {
        if (error.status === 422 || error.code === 'NO_OFFERS') {
            console.log('Skipping test: no asks available for this market');
            context.skip();
        }
        throw error;
    }
};

describe('Midnight-Payback-From-Orders', function () {
    this.timeout(180000);

    let senderAcc;
    let proxy;
    let midnight;
    let paybackAction;
    let snapshotId;

    const fetchSmallAskQuote = (context, amount) =>
        fetchAskQuoteOrSkip(
            context,
            fetchMidnightQuote({
                marketId: morphoMarket.marketId,
                side: 'asks',
                assets: amount,
                slippage: DEFAULT_SLIPPAGE,
            }),
        );

    const fundAndApprove = async (amount, spender = proxy.address) => {
        await setBalance(morphoMarket.loanToken, senderAcc.address, amount);
        await approve(morphoMarket.loanToken, spender, senderAcc);
    };

    const assertNoTokenResidue = async (wallet, loanToken = morphoMarket.loanToken) => {
        expect(await balanceOf(loanToken, wallet)).to.eq(0);
        expect(await getAllowance(loanToken, wallet, midnightAddress)).to.eq(0);
    };

    const executePaybackDirect = (amount, minUnits, offerFills) => {
        const functionData = encodeMidnightPaybackFromOrders(
            morphoMarket.marketId,
            nullAddress,
            senderAcc.address,
            amount,
            minUnits,
            offerFills,
        );
        return senderAcc.sendTransaction({ to: paybackAction.address, data: functionData });
    };

    const prepareDirectPayback = async (debt, amount) => {
        await seedMidnightDebt(midnight, morphoMarket.marketId, paybackAction.address, debt);
        await fundAndApprove(amount, paybackAction.address);

        return {
            balance: await balanceOf(morphoMarket.loanToken, senderAcc.address),
            debt: await midnight.debt(morphoMarket.marketId, paybackAction.address),
        };
    };

    const assertDirectStateUnchanged = async (stateBefore) => {
        expect(await balanceOf(morphoMarket.loanToken, senderAcc.address)).to.eq(
            stateBefore.balance,
        );
        expect(await midnight.debt(morphoMarket.marketId, paybackAction.address)).to.eq(
            stateBefore.debt,
        );
        await assertNoTokenResidue(paybackAction.address);
    };

    before(async function () {
        if (!midnightAddress || !morphoMarket) this.skip();

        dfs.configure({ chainId, testingMode: true });
        senderAcc = (await hre.ethers.getSigners())[0];
        await setForkForTesting();
        await hre.network.provider.send('evm_mine');
        proxy = await getProxy(senderAcc.address, false);
        midnight = await hre.ethers.getContractAt('IMidnight', midnightAddress);
        paybackAction = await redeploy('MidnightPaybackFromOrders');

        const loanTokens = [...new Set(paybackMarkets.map(({ loanToken }) => loanToken))];
        const tokenDecimals = new Map(
            await Promise.all(
                loanTokens.map(async (token) => [
                    token,
                    await hre.ethers
                        .getContractAt('IERC20', token)
                        .then((contract) => contract.decimals()),
                ]),
            ),
        );
        paybackMarkets.forEach((market) => {
            market.loanTokenDecimals = tokenDecimals.get(market.loanToken);
        });
    });

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    paybackMarkets.forEach((market) => {
        it(`should pay back through ${market.label}`, async function () {
            const paybackAmount = hre.ethers.utils.parseUnits('2', market.loanTokenDecimals);
            const quote = await fetchAskQuoteOrSkip(
                this,
                fetchQuote({
                    quoteProvider: market.quoteProvider,
                    marketId: market.marketId,
                    side: 'asks',
                    assets: paybackAmount,
                    slippage: DEFAULT_SLIPPAGE,
                    taker: proxy.address,
                    chainId,
                    midnightAddress,
                }),
            );

            let offerFills;
            let minUnits;
            let seededDebt;
            if (market.quoteProvider === 'tenor') {
                offerFills = quote.offerFills;
                minUnits = calculateTenorMinUnits(quote.quotedUnits, DEFAULT_SLIPPAGE);
                seededDebt = quote.quotedUnits.mul(2);
                expect(minUnits).to.be.lt(quote.quotedUnits);
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
            await seedMidnightDebt(midnight, market.marketId, proxy.address, seededDebt);
            await setBalance(market.loanToken, senderAcc.address, paybackAmount);
            await approve(market.loanToken, proxy.address, senderAcc);

            const balanceBefore = await balanceOf(market.loanToken, senderAcc.address);
            const debtBefore = await midnight.debt(market.marketId, proxy.address);
            const consumedBefore = await midnight.consumed(offer[2], offer[6]);

            await midnightPaybackFromOrders(
                proxy,
                market.marketId,
                nullAddress,
                senderAcc.address,
                paybackAmount,
                minUnits,
                offerFills,
            );

            const balanceAfter = await balanceOf(market.loanToken, senderAcc.address);
            const debtAfter = await midnight.debt(market.marketId, proxy.address);
            const consumedAfter = await midnight.consumed(offer[2], offer[6]);
            const repaidUnits = debtBefore.sub(debtAfter);

            expect(balanceBefore.sub(balanceAfter)).to.eq(paybackAmount);
            expect(repaidUnits).to.be.gte(minUnits);
            expect(debtAfter).to.be.gt(0);
            expect(consumedAfter).to.be.gt(consumedBefore);
            await assertNoTokenResidue(proxy.address, market.loanToken);
        });
    });

    it('should pay back using at least three orders', async function () {
        const quote = await fetchAskQuoteOrSkip(
            this,
            fetchMidnightQuoteForMinFills({
                marketId: morphoMarket.marketId,
                side: 'asks',
                initialAssets: hre.ethers.utils.parseUnits('10000', morphoMarket.loanTokenDecimals),
                minFills: 3,
                slippage: DEFAULT_SLIPPAGE,
            }),
        );
        const minUnits = calculateMinUnits(quote.assets, quote.averageWorstPrice);
        const seededDebt = sumOfferFillUnits(quote.offerFills);
        const offers = getUniqueOffers(quote.offerFills);

        await seedMidnightDebt(midnight, morphoMarket.marketId, proxy.address, seededDebt);
        await fundAndApprove(quote.assets);

        const consumedBefore = await Promise.all(
            offers.map((offer) => midnight.consumed(offer[2], offer[6])),
        );
        const balanceBefore = await balanceOf(morphoMarket.loanToken, senderAcc.address);
        const debtBefore = await midnight.debt(morphoMarket.marketId, proxy.address);

        await midnightPaybackFromOrders(
            proxy,
            morphoMarket.marketId,
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
        const balanceAfter = await balanceOf(morphoMarket.loanToken, senderAcc.address);
        const debtAfter = await midnight.debt(morphoMarket.marketId, proxy.address);

        expect(balanceBefore.sub(balanceAfter)).to.eq(quote.assets);
        expect(debtBefore.sub(debtAfter)).to.be.gte(minUnits);
        expect(usedOffers).to.be.gte(3);
        await assertNoTokenResidue(proxy.address);
    });

    paybackMarkets.forEach((market) => {
        it(`should fully pay back through ${market.label} and refund unused tokens`, async function () {
            const seededDebt = hre.ethers.utils.parseUnits('100', market.loanTokenDecimals);
            const quote = await fetchAskQuoteOrSkip(
                this,
                fetchQuote({
                    quoteProvider: market.quoteProvider,
                    marketId: market.marketId,
                    side: 'asks',
                    units: seededDebt,
                    slippage: DEFAULT_SLIPPAGE,
                    taker: proxy.address,
                    chainId,
                    midnightAddress,
                }),
            );

            if (market.quoteProvider === 'tenor') {
                expect(quote.quotedUnits).to.eq(seededDebt);
                expect(quote.buyerAssets).to.be.lt(seededDebt);
            } else if (!quote.averageBestPrice.lt(WAD)) {
                throw new Error('Midnight ask price must be below one for the refund test');
            }

            const offers = getUniqueOffers(quote.offerFills);
            await seedMidnightDebt(midnight, market.marketId, proxy.address, seededDebt);
            await setBalance(market.loanToken, senderAcc.address, seededDebt);
            await approve(market.loanToken, proxy.address, senderAcc);

            const consumedBefore = await Promise.all(
                offers.map((offer) => midnight.consumed(offer[2], offer[6])),
            );
            const balanceBefore = await balanceOf(market.loanToken, senderAcc.address);

            await midnightPaybackFromOrders(
                proxy,
                market.marketId,
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
            const balanceAfter = await balanceOf(market.loanToken, senderAcc.address);
            const spentAmount = balanceBefore.sub(balanceAfter);

            expect(await midnight.debt(market.marketId, proxy.address)).to.eq(0);
            expect(spentAmount).to.be.gt(0);
            expect(spentAmount).to.be.lt(seededDebt);
            if (market.quoteProvider === 'tenor') {
                expect(spentAmount).to.eq(quote.buyerAssets);
                expect(balanceAfter).to.eq(seededDebt.sub(quote.buyerAssets));
            } else {
                const worstPrice = quote.averageWorstPrice.gt(WAD) ? WAD : quote.averageWorstPrice;
                const maxSpend = seededDebt.mul(worstPrice).add(WAD.sub(1)).div(WAD);
                expect(spentAmount).to.be.lte(maxSpend);
                expect(balanceAfter).to.eq(seededDebt.sub(spentAmount));
            }
            expect(usedOffers).to.be.gte(1);
            await assertNoTokenResidue(proxy.address, market.loanToken);
        });
    });

    it('should skip a failed order and use a fallback order', async function () {
        const paybackAmount = hre.ethers.utils.parseUnits('2', morphoMarket.loanTokenDecimals);
        const quote = await fetchSmallAskQuote(this, paybackAmount);
        if (quote.offerFills.length < 2) {
            throw new Error('Midnight quote needs at least two asks for the fallback test');
        }

        const offerFills = quote.offerFills;
        offerFills[0][0][4] = 1;
        const firstOffer = offerFills[0][0];
        const fallbackOffers = getUniqueOffers(offerFills.slice(1));
        const minUnits = calculateMinUnits(paybackAmount, quote.averageWorstPrice);
        const seededDebt = sumOfferFillUnits(offerFills);

        await seedMidnightDebt(midnight, morphoMarket.marketId, proxy.address, seededDebt);
        await fundAndApprove(paybackAmount);

        const firstConsumedBefore = await midnight.consumed(firstOffer[2], firstOffer[6]);
        const fallbackConsumedBefore = await Promise.all(
            fallbackOffers.map((offer) => midnight.consumed(offer[2], offer[6])),
        );
        const balanceBefore = await balanceOf(morphoMarket.loanToken, senderAcc.address);

        await midnightPaybackFromOrders(
            proxy,
            morphoMarket.marketId,
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
        const balanceAfter = await balanceOf(morphoMarket.loanToken, senderAcc.address);

        expect(balanceBefore.sub(balanceAfter)).to.eq(paybackAmount);
        expect(await midnight.consumed(firstOffer[2], firstOffer[6])).to.eq(firstConsumedBefore);
        expect(usedFallback).to.eq(true);
        await assertNoTokenResidue(proxy.address);
    });

    it('should revert when no orders are provided', async () => {
        await expect(
            executePaybackDirect(
                hre.ethers.utils.parseUnits('2', morphoMarket.loanTokenDecimals),
                hre.ethers.constants.Zero,
                [],
            ),
        ).to.be.revertedWith('NoOrdersProvided');
    });

    it('should revert when zero amount is requested', async function () {
        const quote = await fetchSmallAskQuote(
            this,
            hre.ethers.utils.parseUnits('2', morphoMarket.loanTokenDecimals),
        );

        await expect(
            executePaybackDirect(0, hre.ethers.constants.Zero, quote.offerFills),
        ).to.be.revertedWith('ZeroAmountRequested');
    });

    it('should revert when a buy offer is provided', async function () {
        const paybackAmount = hre.ethers.utils.parseUnits('2', morphoMarket.loanTokenDecimals);
        const quote = await fetchSmallAskQuote(this, paybackAmount);
        quote.offerFills[0][0][1] = true;
        const seededDebt = sumOfferFillUnits(quote.offerFills);
        const stateBefore = await prepareDirectPayback(seededDebt, paybackAmount);

        await expect(executePaybackDirect(paybackAmount, 0, quote.offerFills)).to.be.revertedWith(
            'InvalidOfferType',
        );
        await assertDirectStateUnchanged(stateBefore);
    });

    it('should revert when an offer has a different market', async function () {
        const paybackAmount = hre.ethers.utils.parseUnits('2', morphoMarket.loanTokenDecimals);
        const quote = await fetchSmallAskQuote(this, paybackAmount);
        quote.offerFills[0][0][0][0] = 1;
        const seededDebt = sumOfferFillUnits(quote.offerFills);
        const stateBefore = await prepareDirectPayback(seededDebt, paybackAmount);

        await expect(executePaybackDirect(paybackAmount, 0, quote.offerFills)).to.be.revertedWith(
            'InvalidOfferMarketId',
        );
        await assertDirectStateUnchanged(stateBefore);
    });

    it('should revert when orders cannot fulfill the payback', async function () {
        const paybackAmount = hre.ethers.utils.parseUnits('2', morphoMarket.loanTokenDecimals);
        const quote = await fetchSmallAskQuote(this, paybackAmount);
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

    it('should revert when minimum units are not reached', async function () {
        const paybackAmount = hre.ethers.utils.parseUnits('2', morphoMarket.loanTokenDecimals);
        const quote = await fetchSmallAskQuote(this, paybackAmount);
        const seededDebt = sumOfferFillUnits(quote.offerFills);
        const stateBefore = await prepareDirectPayback(seededDebt, paybackAmount);

        await expect(
            executePaybackDirect(paybackAmount, hre.ethers.constants.MaxUint256, quote.offerFills),
        ).to.be.revertedWith('MinUnitsSlippage');
        await assertDirectStateUnchanged(stateBefore);
    });
});
