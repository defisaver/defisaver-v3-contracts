const { expect } = require('chai');

const { getAssetInfo } = require('@defisaver/tokens');
const hre = require('hardhat');

const {
    getAaveDataProvider,
    getAaveTokenInfo,
    aaveV2assetsDefaultMarket,
} = require('../utils-aave');

const {
    getProxy,
    redeploy,
    balanceOf,
    AAVE_MARKET,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
} = require('../utils');

const {
    supplyAave,
    withdrawAave,
} = require('../actions');

describe('Aave-Withdraw', function () {
    this.timeout(150000);

    let senderAcc; let proxy; let dataProvider;

    before(async () => {
        await redeploy('AaveWithdraw');
        await redeploy('DFSSell');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        dataProvider = await getAaveDataProvider();
    });

    for (let i = 0; i < aaveV2assetsDefaultMarket.length; ++i) {
        const tokenSymbol = aaveV2assetsDefaultMarket[i];
        const fetchedAmountWithUSD = fetchAmountinUSDPrice(tokenSymbol, '10000');

        it(`... should withdraw ${fetchedAmountWithUSD} ${tokenSymbol} from Aave`, async () => {
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
                await supplyAave(proxy, AAVE_MARKET, amount, assetInfo.address, senderAcc.address);
            }

            const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

            await withdrawAave(proxy, AAVE_MARKET, assetInfo.address, amount, senderAcc.address);

            const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);

            expect(balanceAfter).to.be.gt(balanceBefore);
        });
    }
});
