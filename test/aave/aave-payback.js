const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getAaveDataProvider,
    getAaveTokenInfo,
    getAaveReserveInfo,
    getAaveReserveData,
    VARIABLE_RATE,
    STABLE_RATE,
    aaveV2assetsDefaultMarket,
} = require('../utils-aave');

const {
    getProxy,
    redeploy,
    balanceOf,
    standardAmounts,
    AAVE_MARKET,
    WETH_ADDRESS,
} = require('../utils');

const {
    supplyAave,
    paybackAave,
    borrowAave,
} = require('../actions');

describe('Aave-Payback', function () {
    this.timeout(80000);

    let senderAcc; let proxy; let dataProvider;

    before(async () => {
        await redeploy('AavePayback');
        await redeploy('DFSSell');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        dataProvider = await getAaveDataProvider();
    });

    for (let i = 0; i < aaveV2assetsDefaultMarket.length; ++i) {
        const tokenSymbol = aaveV2assetsDefaultMarket[i];

        it(`... should payback variable borrow ${standardAmounts[tokenSymbol]} ${tokenSymbol} from Aave`, async () => {
            const assetInfo = getAssetInfo(tokenSymbol);

            if (assetInfo.symbol === 'ETH') {
                assetInfo.address = WETH_ADDRESS;
            }

            const reserveInfo = await getAaveReserveInfo(dataProvider, assetInfo.address);
            const aTokenInfo = await getAaveTokenInfo(dataProvider, assetInfo.address);
            const reserveData = await getAaveReserveData(dataProvider, assetInfo.address);

            if (!reserveInfo.borrowingEnabled) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            const amount = hre.ethers.utils.parseUnits(
                standardAmounts[assetInfo.symbol],
                assetInfo.decimals,
            );

            if (reserveData.availableLiquidity.lt(amount)) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            await supplyAave(
                proxy,
                AAVE_MARKET,
                hre.ethers.utils.parseUnits('3', 18),
                WETH_ADDRESS,
                senderAcc.address,
            );

            await borrowAave(
                proxy,
                AAVE_MARKET,
                assetInfo.address,
                amount,
                VARIABLE_RATE,
                senderAcc.address,
            );

            const debtBalanceBefore = await balanceOf(
                aTokenInfo.variableDebtTokenAddress,
                proxy.address,
            );

            await paybackAave(
                proxy,
                AAVE_MARKET,
                assetInfo.address,
                amount,
                VARIABLE_RATE,
                senderAcc.address,
            );

            const debtBalanceAfter = await balanceOf(
                aTokenInfo.variableDebtTokenAddress,
                proxy.address,
            );

            expect(debtBalanceAfter).to.be.lt(debtBalanceBefore);
        });

        it(`... should payback stable borrow ${standardAmounts[tokenSymbol]} ${tokenSymbol} from Aave`, async () => {
            const assetInfo = getAssetInfo(tokenSymbol);

            if (assetInfo.symbol === 'ETH') {
                // can't currently stable borrow if position already has eth
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
                // assetInfo.address = WETH_ADDRESS;
            }

            const reserveInfo = await getAaveReserveInfo(dataProvider, assetInfo.address);
            const aTokenInfo = await getAaveTokenInfo(dataProvider, assetInfo.address);
            const reserveData = await getAaveReserveData(dataProvider, assetInfo.address);

            if (!reserveInfo.stableBorrowRateEnabled) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            const amount = hre.ethers.utils.parseUnits(
                standardAmounts[assetInfo.symbol],
                assetInfo.decimals,
            );

            if (reserveData.availableLiquidity.lt(amount)) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            await supplyAave(
                proxy,
                AAVE_MARKET,
                hre.ethers.utils.parseUnits('3', 18),
                WETH_ADDRESS,
                senderAcc.address,
            );

            await borrowAave(
                proxy,
                AAVE_MARKET,
                assetInfo.address,
                amount,
                STABLE_RATE,
                senderAcc.address,
            );

            const debtBalanceBefore = await balanceOf(
                aTokenInfo.stableDebtTokenAddress,
                proxy.address,
            );

            await paybackAave(
                proxy,
                AAVE_MARKET,
                assetInfo.address,
                amount,
                STABLE_RATE,
                senderAcc.address,
            );

            const debtBalanceAfter = await balanceOf(
                aTokenInfo.stableDebtTokenAddress,
                proxy.address,
            );

            expect(debtBalanceAfter).to.be.lt(debtBalanceBefore);
        });
    }
});
