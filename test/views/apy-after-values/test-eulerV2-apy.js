/* eslint-disable max-len */
const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const hre = require('hardhat');

const {
    eulerV2Supply,
    eulerV2Borrow,
    eulerV2Payback,
    eulerV2Withdraw,
} = require('../../actions');

const {
    getProxy,
    redeploy,
    takeSnapshot,
    revertToSnapshot,
    setBalance,
    approve,
} = require('../../utils');
const { getEulerV2TestPairs } = require('../../eulerV2/utils');

const eulerV2ApyAfterValuesTest = async (testPairs) => {
    describe('Test EulerV2 apy after values', async () => {
        let senderAcc;
        let wallet;
        let snapshotId;
        let eulerV2ViewContract;

        before(async () => {
            [senderAcc] = await hre.ethers.getSigners();
            wallet = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            eulerV2ViewContract = await redeploy('EulerV2View');
            await redeploy('EulerV2Supply');
            await redeploy('EulerV2Borrow');
            await redeploy('EulerV2Withdraw');
            await redeploy('EulerV2Payback');
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });
        for (let i = 0; i < testPairs.length; ++i) {
            const supplyVault = testPairs[i].supplyVault;
            const supplyTokenSymbol = testPairs[i].supplyTokenSymbol;
            const supplyTokenAsset = getAssetInfo(supplyTokenSymbol);
            const supplyToken = supplyTokenAsset.address;
            const supplyAmount = testPairs[i].supplyAmount;
            const borrowVault = testPairs[i].borrowVault;
            const borrowTokenSymbol = testPairs[i].borrowTokenSymbol;
            const borrowTokenAsset = getAssetInfo(borrowTokenSymbol);
            const borrowToken = borrowTokenAsset.address;
            const borrowAmount = testPairs[i].borrowAmount;
            it(`... should estimate borrow rate when opening position and doing repay after [coll: ${supplyTokenSymbol}, debt: ${borrowTokenSymbol}]`, async () => {
                const repayAmount = borrowAmount.div(2);
                const supplyVaultContract = await hre.ethers.getContractAt('IEVault', supplyVault);
                const borrowVaultContract = await hre.ethers.getContractAt('IEVault', borrowVault);

                // 1. Fetch borrow rates before creating position
                // ----------------------------------------------
                const supplyVaultBorrowRateBefore = await supplyVaultContract.interestRate();
                let borrowVaultBorrowRateBefore = await borrowVaultContract.interestRate();

                // 2. estimate borrow rates before creating position
                // --------------------------------------------------
                let estimatedBorrowRates = await eulerV2ViewContract.callStatic.getApyAfterValuesEstimation(
                    [
                        [
                            supplyVault,
                            false,
                            supplyAmount,
                            '0',
                        ],
                        [
                            borrowVault,
                            true,
                            '0',
                            borrowAmount,
                        ],
                    ],
                );
                console.log('Estimated borrow rates:', estimatedBorrowRates);

                // 3. create position
                // -------------------
                await setBalance(supplyToken, senderAcc.address, supplyAmount);
                await approve(supplyToken, wallet.address, senderAcc);
                await eulerV2Supply(
                    wallet,
                    supplyVault,
                    supplyToken,
                    wallet.address,
                    senderAcc.address,
                    supplyAmount,
                );
                await eulerV2Borrow(
                    wallet,
                    borrowVault,
                    wallet.address,
                    senderAcc.address,
                    borrowAmount,
                );

                // 4. Fetch borrow rates after creating position
                // ---------------------------------------------
                const supplyVaultBorrowRateAfter = await supplyVaultContract.interestRate();
                let borrowVaultBorrowRateAfter = await borrowVaultContract.interestRate();

                // 5. Compare estimated and real borrow rates
                // ------------------------------------------
                console.log('Supply vault borrow rate before:', supplyVaultBorrowRateBefore.toString());
                console.log('Borrow vault borrow rate before:', borrowVaultBorrowRateBefore.toString());
                console.log('Estimated supply vault borrow rate:', estimatedBorrowRates[0].toString());
                console.log('Estimated borrow vault borrow rate:', estimatedBorrowRates[1].toString());
                console.log('Real supply vault borrow rate:', supplyVaultBorrowRateAfter.toString());
                console.log('Real borrow vault borrow rate:', borrowVaultBorrowRateAfter.toString());

                expect(estimatedBorrowRates[0]).to.be.closeTo(supplyVaultBorrowRateAfter, 5e10);
                expect(estimatedBorrowRates[1]).to.be.closeTo(borrowVaultBorrowRateAfter, 5e10);

                // 7. Fetch borrow rate before repay
                // ----------------------------------------------
                borrowVaultBorrowRateBefore = await borrowVaultContract.interestRate();

                // 8. estimate borrow rate before repay
                // --------------------------------------------------
                estimatedBorrowRates = await eulerV2ViewContract.callStatic.getApyAfterValuesEstimation(
                    [
                        [
                            borrowVault,
                            true,
                            repayAmount,
                            '0',
                        ],
                    ],
                );

                // 9. Execute repay
                // -------------------
                await setBalance(borrowToken, senderAcc.address, repayAmount);
                await approve(borrowToken, wallet.address, senderAcc);
                await eulerV2Payback(
                    wallet,
                    borrowVault,
                    borrowToken,
                    wallet.address,
                    senderAcc.address,
                    repayAmount,
                );

                // 10. Fetch borrow rate after repay
                // ---------------------------------------------
                borrowVaultBorrowRateAfter = await borrowVaultContract.interestRate();

                // 11. Compare estimated and real borrow rates after repay
                // ------------------------------------------
                console.log('Borrow vault borrow rate before repay:', borrowVaultBorrowRateBefore.toString());
                console.log('Estimated borrow vault borrow rate after repay:', estimatedBorrowRates[0].toString());
                console.log('Real borrow vault borrow rate after repay:', borrowVaultBorrowRateAfter.toString());

                expect(estimatedBorrowRates[0]).to.be.closeTo(borrowVaultBorrowRateAfter, 5e10);
            });
            it(`... should estimate borrow rate when supplying and withdrawing ${borrowTokenSymbol}`, async () => {
                const withdrawAmount = supplyAmount.div(2);
                const supplyVaultContract = await hre.ethers.getContractAt('IEVault', supplyVault);

                // 1. Fetch borrow rates before creating position
                // ----------------------------------------------
                const supplyVaultBorrowRateBefore = await supplyVaultContract.interestRate();

                // 2. estimate borrow rates before creating position
                // --------------------------------------------------
                const estimatedBorrowRates = await eulerV2ViewContract.callStatic.getApyAfterValuesEstimation(
                    [
                        [
                            supplyVault,
                            false,
                            supplyAmount,
                            withdrawAmount,
                        ],
                    ],
                );
                console.log('Estimated borrow rates:', estimatedBorrowRates);

                // 3. Supply and withdraw
                // -------------------
                await setBalance(supplyToken, senderAcc.address, supplyAmount);
                await approve(supplyToken, wallet.address, senderAcc);
                await eulerV2Supply(
                    wallet,
                    supplyVault,
                    supplyToken,
                    wallet.address,
                    senderAcc.address,
                    supplyAmount,
                );
                await eulerV2Withdraw(
                    wallet,
                    supplyVault,
                    wallet.address,
                    senderAcc.address,
                    withdrawAmount,
                );

                // 4. Fetch borrow rates after supplying and withdrawing
                // ---------------------------------------------
                const supplyVaultBorrowRateAfter = await supplyVaultContract.interestRate();

                // 5. Compare estimated and real borrow rates
                // ------------------------------------------
                console.log('Supply vault borrow rate before:', supplyVaultBorrowRateBefore.toString());
                console.log('Estimated supply vault borrow rate:', estimatedBorrowRates[0].toString());
                console.log('Real supply vault borrow rate:', supplyVaultBorrowRateAfter.toString());

                expect(estimatedBorrowRates[0]).to.be.closeTo(supplyVaultBorrowRateAfter, 5e10);
            });
        }
    });
};

describe('EulerV2-apy-after-values', () => {
    it('... should test EulerV2 APY after values', async () => {
        const supplyAmountInUsd = '50000';
        const borrowAmountInUsd = '25000';
        const testPairs = await getEulerV2TestPairs(supplyAmountInUsd, borrowAmountInUsd);
        await eulerV2ApyAfterValuesTest(testPairs);
    });
});

module.exports = {
    eulerV2ApyAfterValuesTest,
};
