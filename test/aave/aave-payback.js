const { expect } = require("chai");

const { getAssetInfo, ilks, } = require('@defisaver/tokens');

const dfs = require('@defisaver/sdk')

const {
    getAaveDataProvider,
    getAaveTokenInfo,
    getAaveReserveInfo,
    getAaveReserveData,
    VARIABLE_RATE,
    STABLE_RATE,
    aaveV2assetsDefaultMarket
} = require('../utils-aave');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    balanceOf,
    isEth,
    standardAmounts,
    nullAddress,
    REGISTRY_ADDR,
    ETH_ADDR,
    AAVE_MARKET,
    WETH_ADDRESS
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
} = require('../utils-mcd');

const {
    supplyAave,
    paybackAave,
    borrowAave,
} = require('../actions');

describe("Aave-Payback", function () {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy, tokensInAave, dataProvider;

    before(async () => {
        await redeploy('AavePayback');
        await redeploy('DFSSell');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        dataProvider = await getAaveDataProvider();

        tokensInAave = await dataProvider.getAllReservesTokens();

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
                expect(true).to.be.true;
                return;
            }

            const amount = ethers.utils.parseUnits(standardAmounts[assetInfo.symbol], assetInfo.decimals);
    
            if(reserveData.availableLiquidity.lt(amount)) {
                expect(true).to.be.true;
                return;
            }

            await supplyAave(proxy, AAVE_MARKET,ethers.utils.parseUnits('3', 18), ETH_ADDR, senderAcc.address);
            await borrowAave(proxy, AAVE_MARKET, assetInfo.address, amount, VARIABLE_RATE, senderAcc.address);

            const debtBalanceBefore = await balanceOf(aTokenInfo.variableDebtTokenAddress, proxy.address);

            await paybackAave(proxy, AAVE_MARKET, assetInfo.address, amount, VARIABLE_RATE, senderAcc.address);

            const debtBalanceAfter = await balanceOf(aTokenInfo.variableDebtTokenAddress, proxy.address);

            expect(debtBalanceAfter).to.be.lt(debtBalanceBefore);
        });

        it(`... should payback stable borrow ${standardAmounts[tokenSymbol]} ${tokenSymbol} from Aave`, async () => {
            const assetInfo = getAssetInfo(tokenSymbol);

            if (assetInfo.symbol === 'ETH') {
                assetInfo.address = WETH_ADDRESS;
            }

            const reserveInfo = await getAaveReserveInfo(dataProvider, assetInfo.address);
            const aTokenInfo = await getAaveTokenInfo(dataProvider, assetInfo.address);
            const reserveData = await getAaveReserveData(dataProvider, assetInfo.address);

            if (!reserveInfo.stableBorrowRateEnabled) {
                expect(true).to.be.true;
                return;
            }

            const amount = ethers.utils.parseUnits(standardAmounts[assetInfo.symbol], assetInfo.decimals);
    
            if(reserveData.availableLiquidity.lt(amount)) {
                expect(true).to.be.true;
                return;
            }

            await supplyAave(proxy, AAVE_MARKET,ethers.utils.parseUnits('3', 18), ETH_ADDR, senderAcc.address);
            await borrowAave(proxy, AAVE_MARKET, assetInfo.address, amount, STABLE_RATE, senderAcc.address);

            const debtBalanceBefore = await balanceOf(aTokenInfo.stableDebtTokenAddress, proxy.address);

            await paybackAave(proxy, AAVE_MARKET, assetInfo.address, amount, STABLE_RATE, senderAcc.address);

            const debtBalanceAfter = await balanceOf(aTokenInfo.stableDebtTokenAddress, proxy.address);

            expect(debtBalanceAfter).to.be.lt(debtBalanceBefore);
        });
    }

});

