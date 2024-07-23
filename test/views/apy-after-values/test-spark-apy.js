/* eslint-disable max-len */
const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    sparkSupply,
    sparkBorrow,
    sparkPayback,
} = require('../../actions');
const { VARIABLE_RATE } = require('../../utils-aave');

const {
    getProxy,
    redeploy,
    takeSnapshot,
    revertToSnapshot,
    addrs,
    network,
    fetchAmountinUSDPrice,
    setBalance,
    approve,
} = require('../../utils');

const collateralTokens = ['wbtc', 'wstETH', 'rETH'];
const debtTokens = ['USDC', 'DAI'];

const sparkApyAfterValuesTest = async () => {
    describe('Test Spark V3 apy after values', async () => {
        let senderAcc;
        let wallet;
        let snapshotId;
        let sparkViewContract;

        before(async () => {
            [senderAcc] = await hre.ethers.getSigners();
            wallet = await getProxy(senderAcc.address);
            sparkViewContract = await redeploy('SparkView');
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });
        for (let i = 0; i < collateralTokens.length; ++i) {
            for (let j = 0; j < debtTokens.length; ++j) {
                const collAsset = getAssetInfo(collateralTokens[i]);
                const debtAsset = getAssetInfo(debtTokens[j]);
                if (collAsset.symbol === debtAsset.symbol) {
                    // eslint-disable-next-line no-continue
                    continue;
                }
                it(`... should estimate supply and borrow rates for [coll: ${collAsset.symbol}, debt: ${debtAsset.symbol}]`, async () => {
                    const collTokenInfoFull = await sparkViewContract.getTokenInfoFull(
                        addrs[network].SPARK_MARKET,
                        collAsset.address,
                    );
                    const borrowTokenInfoFull = await sparkViewContract.getTokenInfoFull(
                        addrs[network].SPARK_MARKET,
                        debtAsset.address,
                    );

                    if (!collTokenInfoFull.usageAsCollateralEnabled) {
                        console.log('Collateral asset cant be used as collateral. Skipping test');
                        // eslint-disable-next-line no-unused-expressions
                        expect(true).to.be.true;
                        return;
                    }

                    const supplyAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(collAsset.symbol, '1000000'),
                        collAsset.decimals,
                    );
                    let borrowAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(debtAsset.symbol, '500000'),
                        debtAsset.decimals,
                    );
                    if (borrowTokenInfoFull.availableLiquidity.lt(borrowAmount)) {
                        borrowAmount = borrowTokenInfoFull.availableLiquidity.div(2);
                    }
                    const paybackAmount = borrowAmount.div(4);

                    const stateBefore = {
                        collAssetSupplyRate: collTokenInfoFull.supplyRate,
                        collAssetVariableBorrowRate: collTokenInfoFull.borrowRateVariable,
                        debtAssetSupplyRate: borrowTokenInfoFull.supplyRate,
                        debtAssetVariableBorrowRate: borrowTokenInfoFull.borrowRateVariable,
                    };
                    const params = [
                        {
                            reserveAddress: collAsset.address,
                            liquidityAdded: supplyAmount,
                            liquidityTaken: '0',
                            isDebtAsset: false,
                        },
                        {
                            reserveAddress: debtAsset.address,
                            liquidityAdded: paybackAmount,
                            liquidityTaken: borrowAmount,
                            isDebtAsset: true,
                        },
                    ];
                    const result = await sparkViewContract.getApyAfterValuesEstimation(
                        addrs[network].SPARK_MARKET,
                        params,
                    );

                    const estimatedStateAfter = {
                        collAssetSupplyRate: result[0].supplyRate,
                        collAssetVariableBorrowRate: result[0].variableBorrowRate,
                        debtAssetSupplyRate: result[1].supplyRate,
                        debtAssetVariableBorrowRate: result[1].variableBorrowRate,
                    };

                    await setBalance(collAsset.address, senderAcc.address, supplyAmount);
                    await sparkSupply(
                        wallet,
                        addrs[network].SPARK_MARKET,
                        supplyAmount,
                        collAsset.address,
                        collTokenInfoFull.assetId,
                        senderAcc.address,
                        senderAcc,
                    );
                    await sparkBorrow(
                        wallet,
                        addrs[network].SPARK_MARKET,
                        borrowAmount,
                        senderAcc.address,
                        VARIABLE_RATE,
                        borrowTokenInfoFull.assetId,
                    );
                    await setBalance(debtAsset.address, senderAcc.address, paybackAmount);
                    await approve(debtAsset.address, wallet.address, senderAcc);
                    await sparkPayback(
                        wallet,
                        addrs[network].SPARK_MARKET,
                        paybackAmount,
                        senderAcc.address,
                        VARIABLE_RATE,
                        borrowTokenInfoFull.assetId,
                        debtAsset.address,
                    );

                    const collTokenInfoFullAfter = await sparkViewContract.getTokenInfoFull(
                        addrs[network].SPARK_MARKET,
                        collAsset.address,
                    );
                    const borrowTokenInfoFullAfter = await sparkViewContract.getTokenInfoFull(
                        addrs[network].SPARK_MARKET,
                        debtAsset.address,
                    );
                    const stateAfter = {
                        collAssetSupplyRate: collTokenInfoFullAfter.supplyRate,
                        collAssetVariableBorrowRate: collTokenInfoFullAfter.borrowRateVariable,
                        debtAssetSupplyRate: borrowTokenInfoFullAfter.supplyRate,
                        debtAssetVariableBorrowRate: borrowTokenInfoFullAfter.borrowRateVariable,
                    };
                    console.log('=======================');
                    console.log(stateBefore);
                    console.log('----');
                    console.log(estimatedStateAfter);
                    console.log('----');
                    console.log(stateAfter);
                });
            }
        }
    });
};

describe('Spark-apy-after-values', () => {
    it('... should test Spark APY after values', async () => {
        await sparkApyAfterValuesTest();
    });
});

module.exports = {
    sparkApyAfterValuesTest,
};
