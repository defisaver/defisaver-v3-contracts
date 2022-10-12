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
    balanceOf,
    fetchAmountinUSDPrice,
    AAVE_MARKET,
    WETH_ADDRESS,
    timeTravel,
    getAddrFromRegistry,
    revertToSnapshot,
    takeSnapshot,
    redeploy,
} = require('../utils');

const {
    supplyAave,
    borrowAave,
    withdrawAave,
    paybackAave,
} = require('../actions');

const aaveSupplyTest = async (testLength) => {
    describe('Aave-Supply', function () {
        this.timeout(150000);

        let senderAcc; let proxy; let dataProvider;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            dataProvider = await getAaveDataProvider();
        });

        for (let i = 0; i < testLength; i++) {
            const tokenSymbol = aaveV2assetsDefaultMarket[i];
            const fetchedAmountWithUSD = fetchAmountinUSDPrice(tokenSymbol, '10000');

            it(`... should supply ${fetchedAmountWithUSD} ${tokenSymbol} to Aave`, async () => {
                const snapshot = await takeSnapshot();
                const assetInfo = getAssetInfo(tokenSymbol);
                if (assetInfo.symbol === 'ETH') {
                    assetInfo.address = WETH_ADDRESS;
                }

                const aaveTokenInfo = await getAaveTokenInfo(dataProvider, assetInfo.address);
                const aToken = aaveTokenInfo.aTokenAddress;
                const amount = hre.ethers.utils.parseUnits(
                    fetchedAmountWithUSD,
                    assetInfo.decimals,
                );

                const balanceBefore = await balanceOf(aToken, proxy.address);
                await supplyAave(proxy, AAVE_MARKET, amount, assetInfo.address, senderAcc.address);

                const balanceAfter = await balanceOf(aToken, proxy.address);

                expect(balanceAfter).to.be.gt(balanceBefore);
                await revertToSnapshot(snapshot);
            });
        }
    });
};

const aaveBorrowTest = async (testLength) => {
    describe('Aave-Borrow', () => {
        let senderAcc; let proxy; let dataProvider;
        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            dataProvider = await getAaveDataProvider();
        });

        for (let i = 0; i < testLength; ++i) {
            const tokenSymbol = aaveV2assetsDefaultMarket[i];
            const fetchedAmountWithUSD = fetchAmountinUSDPrice(tokenSymbol, '5000');
            it(`... should variable borrow ${fetchedAmountWithUSD} ${tokenSymbol} from Aave`, async () => {
                const snapshot = await takeSnapshot();
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
                await revertToSnapshot(snapshot);
            });

            const fetchedAmountDiv10 = fetchAmountinUSDPrice(tokenSymbol, '500');
            it(`... should stable borrow ${fetchedAmountDiv10} ${tokenSymbol} from Aave`, async () => {
                const snapshot = await takeSnapshot();
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
                await revertToSnapshot(snapshot);
            });
        }
    });
};

const aaveWithdrawTest = async (testLength) => {
    describe('Aave-Withdraw', function () {
        this.timeout(150000);

        let senderAcc; let proxy; let dataProvider;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            dataProvider = await getAaveDataProvider();
        });

        for (let i = 0; i < testLength; ++i) {
            const tokenSymbol = aaveV2assetsDefaultMarket[i];
            const fetchedAmountWithUSD = fetchAmountinUSDPrice(tokenSymbol, '10000');

            it(`... should withdraw ${fetchedAmountWithUSD} ${tokenSymbol} from Aave`, async () => {
                const snapshot = await takeSnapshot();
                const assetInfo = getAssetInfo(tokenSymbol);

                if (assetInfo.symbol === 'ETH') {
                    assetInfo.address = WETH_ADDRESS;
                }

                const aaveTokenInfo = await getAaveTokenInfo(dataProvider, assetInfo.address);
                const aToken = aaveTokenInfo.aTokenAddress;

                const amount = hre.ethers.utils.parseUnits(
                    fetchedAmountWithUSD,
                    assetInfo.decimals,
                );

                const aBalanceBefore = await balanceOf(aToken, proxy.address);

                if (aBalanceBefore.lte(amount)) {
                    // eslint-disable-next-line max-len
                    await supplyAave(proxy, AAVE_MARKET, amount, assetInfo.address, senderAcc.address);
                }

                const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

                // eslint-disable-next-line max-len
                await withdrawAave(proxy, AAVE_MARKET, assetInfo.address, amount, senderAcc.address);

                const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);

                expect(balanceAfter).to.be.gt(balanceBefore);
                await revertToSnapshot(snapshot);
            });
        }
    });
};

const aavePaybackTest = async (testLength) => {
    describe('Aave-Payback', function () {
        this.timeout(80000);

        let senderAcc; let proxy; let dataProvider;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            dataProvider = await getAaveDataProvider();
        });

        for (let i = 0; i < testLength; ++i) {
            const tokenSymbol = aaveV2assetsDefaultMarket[i];
            const fetchedAmountWithUSD = fetchAmountinUSDPrice(tokenSymbol, '5000');
            it(`... should payback variable borrow ${fetchedAmountWithUSD} ${tokenSymbol} from Aave`, async () => {
                const snapshot = await takeSnapshot();
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

                await supplyAave(
                    proxy,
                    AAVE_MARKET,
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '20000'), 18),
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
                await revertToSnapshot(snapshot);
            });

            it(`... should payback stable borrow ${fetchedAmountWithUSD} ${tokenSymbol} from Aave`, async () => {
                const snapshot = await takeSnapshot();

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
                    fetchedAmountWithUSD,
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
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '20000'), 18),
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
                await revertToSnapshot(snapshot);
            });
        }
    });
};

const aaveDeployContracts = async () => {
    await redeploy('AaveWithdraw');
    await redeploy('AaveBorrow');
    await redeploy('AaveSupply');
    await redeploy('AavePayback');
    await redeploy('AaveView');
};

const aaveFullTest = async (testLength) => {
    await aaveDeployContracts();

    await aaveSupplyTest(testLength);

    await aaveBorrowTest(testLength);

    await aaveWithdrawTest(testLength);

    await aavePaybackTest(testLength);
};

module.exports = {
    aaveBorrowTest,
    aaveSupplyTest,
    aaveWithdrawTest,
    aavePaybackTest,
    aaveFullTest,
    aaveDeployContracts,
};
