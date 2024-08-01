/* eslint-disable max-len */
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const { expect } = require('chai');
const hre = require('hardhat');

const {
    morphoBlueSupply,
    morphoBlueSupplyCollateral,
    morphoBlueBorrow,
    morphoBlueWithdraw,
    morphoBluePayback,
} = require('../../actions');

const {
    getProxy,
    redeploy,
    takeSnapshot,
    revertToSnapshot,
    fetchAmountinUSDPrice,
    setBalance,
    approve,
} = require('../../utils');
const { getMarkets } = require('../../morpho-blue/utils');

const morphoBlueApyAfterValuesTest = async () => {
    describe('Test Morpho Blue apy after values', async () => {
        let senderAcc;
        let wallet;
        let snapshotId;
        let morphoBlueViewContract;
        const markets = getMarkets();

        before(async () => {
            [senderAcc] = await hre.ethers.getSigners();
            wallet = await getProxy(senderAcc.address);
            morphoBlueViewContract = await redeploy('MorphoBlueView');
            await redeploy('MorphoBlueBorrow');
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });
        for (let i = 0; i < markets.length; ++i) {
            const marketParams = markets[i];
            const debtAsset = getAssetInfoByAddress(marketParams[0]);
            const collAsset = getAssetInfoByAddress(marketParams[1]);
            it(`... should estimate borrow rate when opening position and doing repay after [coll: ${collAsset.symbol}, debt: ${debtAsset.symbol}]`, async () => {
                const supplyAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(collAsset.symbol, '1000000'),
                    collAsset.decimals,
                );
                const borrowAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(debtAsset.symbol, '400000'),
                    debtAsset.decimals,
                );
                const repayAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(debtAsset.symbol, '200000'),
                    debtAsset.decimals,
                );
                let marketInfo = await morphoBlueViewContract.callStatic.getMarketInfo(marketParams);
                const borrowRateBefore = marketInfo.borrowRate;

                if (marketInfo.totalSupplyAssets - marketInfo.totalBorrowAssets < borrowAmount) {
                    console.log('Skipping test for opening position for [coll: %s, debt: %s] as borrow amount is too high', collAsset.symbol, debtAsset.symbol);
                    return;
                }

                const estimatedBorrowRateWithMarket = await morphoBlueViewContract.callStatic.getApyAfterValuesEstimation(
                    [marketParams, true, '0', borrowAmount],
                );
                const estimatedBorrowRate = estimatedBorrowRateWithMarket.borrowRate;

                await setBalance(collAsset.address, senderAcc.address, supplyAmount);
                await approve(collAsset.address, wallet.address, senderAcc);
                await morphoBlueSupplyCollateral(
                    wallet,
                    marketParams,
                    supplyAmount,
                    senderAcc.address,
                    wallet.address,
                );
                await morphoBlueBorrow(
                    wallet,
                    marketParams,
                    borrowAmount,
                    wallet.address,
                    senderAcc.address,
                );
                marketInfo = await morphoBlueViewContract.callStatic.getMarketInfo(marketParams);
                const realBorrowRate = marketInfo.borrowRate;

                console.log('Borrow rate before:', borrowRateBefore.toString());
                console.log('Estimated borrow rate:', estimatedBorrowRate.toString());
                console.log('Real borrow rate:', realBorrowRate.toString());
                expect(estimatedBorrowRate).to.be.closeTo(realBorrowRate, 1e6);

                const estimatedBorrowRateWithMarketAfterRepay = await morphoBlueViewContract.callStatic.getApyAfterValuesEstimation(
                    [marketParams, true, repayAmount, '0'],
                );
                const estimatedBorrowRateAfterRepay = estimatedBorrowRateWithMarketAfterRepay.borrowRate;

                await setBalance(debtAsset.address, senderAcc.address, repayAmount);
                await approve(debtAsset.address, wallet.address, senderAcc);
                await morphoBluePayback(
                    wallet,
                    marketParams,
                    repayAmount,
                    senderAcc.address,
                    wallet.address,
                );
                marketInfo = await morphoBlueViewContract.callStatic.getMarketInfo(marketParams);
                const realBorrowRateAfterRepay = marketInfo.borrowRate;

                console.log('Estimated borrow rate after repay:', estimatedBorrowRateAfterRepay.toString());
                console.log('Real borrow rate after repay:', realBorrowRateAfterRepay.toString());
                expect(estimatedBorrowRateAfterRepay).to.be.closeTo(realBorrowRateAfterRepay, 1e6);
            });
            it(`... should estimate borrow rate when supplying and withdrawing ${debtAsset.symbol}`, async () => {
                const supplyAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(debtAsset.symbol, '1000000'),
                    debtAsset.decimals,
                );
                const withdrawAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(debtAsset.symbol, '500000'),
                    debtAsset.decimals,
                );
                let marketInfo = await morphoBlueViewContract.callStatic.getMarketInfo(marketParams);
                const borrowRateBefore = marketInfo.borrowRate;

                const estimatedBorrowRateWithMarket = await morphoBlueViewContract.callStatic.getApyAfterValuesEstimation(
                    [marketParams, false, supplyAmount, withdrawAmount],
                );

                const estimatedBorrowRate = estimatedBorrowRateWithMarket.borrowRate;
                await setBalance(debtAsset.address, senderAcc.address, supplyAmount);
                await approve(debtAsset.address, wallet.address, senderAcc);
                await morphoBlueSupply(
                    wallet,
                    marketParams,
                    supplyAmount,
                    senderAcc.address,
                    wallet.address,
                );
                await morphoBlueWithdraw(
                    wallet,
                    marketParams,
                    withdrawAmount,
                    wallet.address,
                    senderAcc.address,
                );
                marketInfo = await morphoBlueViewContract.callStatic.getMarketInfo(marketParams);
                const realBorrowRate = marketInfo.borrowRate;

                console.log('Borrow rate before:', borrowRateBefore.toString());
                console.log('Estimated borrow rate:', estimatedBorrowRate.toString());
                console.log('Real borrow rate:', realBorrowRate.toString());

                expect(estimatedBorrowRate).to.be.closeTo(realBorrowRate, 1e9);
            });
        }
    });
};

describe('MorphoBlue-apy-after-values', () => {
    it('... should test MorphoBlue APY after values', async () => {
        await morphoBlueApyAfterValuesTest();
    });
});

module.exports = {
    morphoBlueApyAfterValuesTest,
};
