/* eslint-disable max-len */
const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    aaveV3Supply,
    aaveV3Borrow,
    aaveV3Payback,
} = require('../../utils/actions');

const { isAssetBorrowableV3, VARIABLE_RATE } = require('../../utils/aave');
const {
    getProxy, redeploy, takeSnapshot, revertToSnapshot,
    addrs,
    network,
    fetchAmountinUSDPrice,
    setBalance,
    approve,
    isNetworkFork,
    getOwnerAddr,
} = require('../../utils/utils');
const { topUp } = require('../../../scripts/utils/fork');

const collateralTokens = ['WETH', 'wstETH', 'USDC', 'USDT', 'LINK'];
const debtTokens = ['DAI', 'USDC', 'WETH', 'LINK'];

const aaveV3ApyAfterValuesTest = async (isFork) => {
    describe('Test Aave V3 apy after values', async () => {
        let senderAcc;
        let wallet;
        let snapshotId;
        let aaveV3ViewContract;

        before(async () => {
            [senderAcc] = await hre.ethers.getSigners();
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
            }
            wallet = await getProxy(senderAcc.address);
            aaveV3ViewContract = await redeploy('AaveV3View', isFork);
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
                    const collTokenInfoFull = await aaveV3ViewContract.getTokenInfoFull(
                        addrs[network].AAVE_MARKET,
                        collAsset.address,
                    );
                    const borrowTokenInfoFull = await aaveV3ViewContract.getTokenInfoFull(
                        addrs[network].AAVE_MARKET,
                        debtAsset.address,
                    );

                    const isAssetBorrowable = await isAssetBorrowableV3(
                        addrs[network].AAVE_V3_POOL_DATA_PROVIDER, debtAsset.address,
                    );
                    if (!isAssetBorrowable) {
                        console.log('Borrow asset is paused, inactive or frozen. Skipping test');
                        // eslint-disable-next-line no-unused-expressions
                        expect(true).to.be.true;
                        return;
                    }
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
                    const result = await aaveV3ViewContract.getApyAfterValuesEstimation(
                        addrs[network].AAVE_MARKET,
                        params,
                    );

                    const estimatedStateAfter = {
                        collAssetSupplyRate: result[0].supplyRate,
                        collAssetVariableBorrowRate: result[0].variableBorrowRate,
                        debtAssetSupplyRate: result[1].supplyRate,
                        debtAssetVariableBorrowRate: result[1].variableBorrowRate,
                    };

                    await setBalance(collAsset.address, senderAcc.address, supplyAmount);
                    await aaveV3Supply(
                        wallet,
                        addrs[network].AAVE_MARKET,
                        supplyAmount,
                        collAsset.address,
                        collTokenInfoFull.assetId,
                        senderAcc.address,
                        senderAcc,
                    );
                    await aaveV3Borrow(
                        wallet,
                        addrs[network].AAVE_MARKET,
                        borrowAmount,
                        senderAcc.address,
                        VARIABLE_RATE,
                        borrowTokenInfoFull.assetId,
                    );
                    await setBalance(debtAsset.address, senderAcc.address, paybackAmount);
                    await approve(debtAsset.address, wallet.address, senderAcc);
                    await aaveV3Payback(
                        wallet,
                        addrs[network].AAVE_MARKET,
                        paybackAmount,
                        senderAcc.address,
                        VARIABLE_RATE,
                        borrowTokenInfoFull.assetId,
                        debtAsset.address,
                    );

                    const collTokenInfoFullAfter = await aaveV3ViewContract.getTokenInfoFull(
                        addrs[network].AAVE_MARKET,
                        collAsset.address,
                    );
                    const borrowTokenInfoFullAfter = await aaveV3ViewContract.getTokenInfoFull(
                        addrs[network].AAVE_MARKET,
                        debtAsset.address,
                    );
                    const stateAfter = {
                        collAssetSupplyRate: collTokenInfoFullAfter.supplyRate,
                        collAssetVariableBorrowRate: collTokenInfoFullAfter.borrowRateVariable,
                        debtAssetSupplyRate: borrowTokenInfoFullAfter.supplyRate,
                        debtAssetVariableBorrowRate: borrowTokenInfoFullAfter.borrowRateVariable,
                    };
                    console.log('=======================');
                    console.log('STATE BEFORE');
                    console.log(stateBefore);
                    console.log('----');
                    console.log('ESTIMATED STATE AFTER');
                    console.log(estimatedStateAfter);
                    console.log('----');
                    console.log('STATE AFTER');
                    console.log(stateAfter);

                    // rate is scaled by 1e27. We want first 7 digits to be the same
                    const precision = hre.ethers.BigNumber.from(10).pow(27 - 7);

                    expect(estimatedStateAfter.collAssetSupplyRate).to.be.closeTo(stateAfter.collAssetSupplyRate, precision);
                    expect(estimatedStateAfter.collAssetVariableBorrowRate).to.be.closeTo(stateAfter.collAssetVariableBorrowRate, precision);
                    expect(estimatedStateAfter.debtAssetSupplyRate).to.be.closeTo(stateAfter.debtAssetSupplyRate, precision);
                    expect(estimatedStateAfter.debtAssetVariableBorrowRate).to.be.closeTo(stateAfter.debtAssetVariableBorrowRate, precision);
                });
            }
        }
    });
};

describe('AaveV3-apy-after-values', () => {
    it('... should test AaveV3 APY after values', async () => {
        const isFork = isNetworkFork();
        await aaveV3ApyAfterValuesTest(isFork);
    });
});

module.exports = {
    aaveV3ApyAfterValuesTest,
};
