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
    fetchAmountinUSDPrice,
    AAVE_MARKET,
    WETH_ADDRESS,
} = require('../utils');

const {
    supplyAave,
    borrowAave,
} = require('../actions');

describe('Aave-Borrow', function () {
    this.timeout(80000);

    let senderAcc; let proxy; let dataProvider;

    before(async () => {
        await redeploy('AaveSupply');
        await redeploy('AaveBorrow');
        await redeploy('DFSSell');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        dataProvider = await getAaveDataProvider();
    });

    for (let i = 0; i < aaveV2assetsDefaultMarket.length; ++i) {
        const tokenSymbol = aaveV2assetsDefaultMarket[i];
        const fetchedAmountWithUSD = fetchAmountinUSDPrice(tokenSymbol, '5000');
        it(`... should variable borrow ${fetchedAmountWithUSD} ${tokenSymbol} from Aave`, async () => {
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
                fetchedAmountWithUSD,
                assetInfo.decimals,
            );

            if (reserveData.availableLiquidity.lt(amount)) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            // eth bada bing bada bum
            await supplyAave(proxy, AAVE_MARKET, hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '20000'), 18), WETH_ADDRESS, senderAcc.address);

            const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);
            const debtBalanceBefore = await balanceOf(
                aTokenInfo.variableDebtTokenAddress,
                proxy.address,
            );

            await borrowAave(
                proxy,
                AAVE_MARKET,
                assetInfo.address,
                amount,
                VARIABLE_RATE,
                senderAcc.address,
            );

            const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);
            const debtBalanceAfter = await balanceOf(
                aTokenInfo.variableDebtTokenAddress,
                proxy.address,
            );

            expect(debtBalanceAfter).to.be.gt(debtBalanceBefore);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        const fetchedAmountDiv10 = fetchAmountinUSDPrice(tokenSymbol, '5000');
        it(`... should stable borrow ${fetchedAmountDiv10} ${tokenSymbol} from Aave`, async () => {
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
                fetchedAmountDiv10,
                assetInfo.decimals,
            );

            if (reserveData.availableLiquidity.lt(amount)) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            // eth bada bing bada bum
            await supplyAave(proxy, AAVE_MARKET, hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '20000'), 18), WETH_ADDRESS, senderAcc.address);

            const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);
            const debtBalanceBefore = await balanceOf(
                aTokenInfo.stableDebtTokenAddress,
                proxy.address,
            );

            await borrowAave(
                proxy,
                AAVE_MARKET,
                assetInfo.address,
                amount,
                STABLE_RATE,
                senderAcc.address,
            );

            const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);
            const debtBalanceAfter = await balanceOf(
                aTokenInfo.stableDebtTokenAddress,
                proxy.address,
            );

            expect(debtBalanceAfter).to.be.gt(debtBalanceBefore);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });
    }
});
