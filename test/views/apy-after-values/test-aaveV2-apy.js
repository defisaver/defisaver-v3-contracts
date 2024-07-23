/* eslint-disable max-len */
const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getAaveDataProvider,
    VARIABLE_RATE,
    getPriceOracle,
} = require('../../utils-aave');

const {
    supplyAave,
    borrowAave,
    paybackAave,
} = require('../../actions');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    fetchAmountinUSDPrice,
    AAVE_MARKET,
    setBalance,
    approve,
} = require('../../utils');

const collateralTokens = ['WBTC', 'WETH', 'DAI', 'USDC'];
const debtTokens = ['DAI', 'USDT', 'WBTC', 'WETH', 'USDC'];

const aaveV2ApyAfterValuesTest = async () => {
    describe('Test Aave V2 apy after values', async () => {
        let senderAcc;
        let wallet;
        let snapshotId;
        let aaveV2ViewContract;
        let dataProvider;
        let priceOracle;

        before(async () => {
            [senderAcc] = await hre.ethers.getSigners();
            wallet = await getProxy(senderAcc.address);
            aaveV2ViewContract = await redeploy('AaveView');
            dataProvider = await getAaveDataProvider();
            priceOracle = await getPriceOracle();
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
                    const supplyReserveConfiguration = await dataProvider
                        .getReserveConfigurationData(collAsset.address);
                    const borrowReserveConfiguration = await dataProvider
                        .getReserveConfigurationData(debtAsset.address);

                    if (!supplyReserveConfiguration.isActive || supplyReserveConfiguration.isFrozen) {
                        console.log(`skipping test case for [coll: ${collAsset.symbol}, debt: ${debtAsset.symbol}]. Collateral reserve is not active or it is frozen`);
                        // eslint-disable-next-line no-unused-expressions
                        expect(true).to.be.true;
                        return;
                    }
                    if (!borrowReserveConfiguration.borrowingEnabled || !borrowReserveConfiguration.isActive) {
                        console.log(`skipping test case for [coll: ${collAsset.symbol}, debt: ${debtAsset.symbol}]. Borrow reserve is not active or borrowing is not enabled`);
                        // eslint-disable-next-line no-unused-expressions
                        expect(true).to.be.true;
                        return;
                    }
                    const supplyAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(collAsset.symbol, '1000000'),
                        collAsset.decimals,
                    );
                    const borrowAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(debtAsset.symbol, '500000'),
                        debtAsset.decimals,
                    );
                    const paybackAmount = borrowAmount.div(4);

                    const collTokenInfoFull = await aaveV2ViewContract.getTokenInfoFull(
                        dataProvider.address,
                        priceOracle,
                        collAsset.address,
                    );
                    const borrowTokenInfoFull = await aaveV2ViewContract.getTokenInfoFull(
                        dataProvider.address,
                        priceOracle,
                        debtAsset.address,
                    );
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
                    const result = await aaveV2ViewContract.getApyAfterValuesEstimation(
                        AAVE_MARKET,
                        params,
                    );

                    const estimatedStateAfter = {
                        collAssetSupplyRate: result[0].supplyRate,
                        collAssetVariableBorrowRate: result[0].variableBorrowRate,
                        debtAssetSupplyRate: result[1].supplyRate,
                        debtAssetVariableBorrowRate: result[1].variableBorrowRate,
                    };

                    await supplyAave(
                        wallet,
                        AAVE_MARKET,
                        supplyAmount,
                        collAsset.address,
                        senderAcc.address,
                    );
                    await borrowAave(
                        wallet,
                        AAVE_MARKET,
                        debtAsset.address,
                        borrowAmount,
                        VARIABLE_RATE,
                        senderAcc.address,
                    );
                    await setBalance(debtAsset.address, senderAcc.address, paybackAmount);
                    await approve(debtAsset.address, wallet.address, senderAcc);
                    await paybackAave(
                        wallet,
                        AAVE_MARKET,
                        debtAsset.address,
                        paybackAmount,
                        VARIABLE_RATE,
                        senderAcc.address,
                    );

                    const collTokenInfoFullAfter = await aaveV2ViewContract.getTokenInfoFull(
                        dataProvider.address,
                        priceOracle,
                        collAsset.address,
                    );
                    const borrowTokenInfoFullAfter = await aaveV2ViewContract.getTokenInfoFull(
                        dataProvider.address,
                        priceOracle,
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

describe('AaveV2-apy-after-values', () => {
    it('... should test AaveV2 APY after values', async () => {
        await aaveV2ApyAfterValuesTest();
    });
});

module.exports = {
    aaveV2ApyAfterValuesTest,
};
