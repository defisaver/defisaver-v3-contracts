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
    standardAmounts,
    AAVE_MARKET,
    WETH_ADDRESS,
} = require('../utils');

const {
    supplyAave,
} = require('../actions');

describe('Aave-Supply', function () {
    this.timeout(80000);

    let senderAcc; let proxy; let dataProvider;

    before(async () => {
        await redeploy('AaveSupply');
        await redeploy('DFSSell');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        dataProvider = await getAaveDataProvider();
    });

    for (let i = 0; i < aaveV2assetsDefaultMarket.length; ++i) {
        const tokenSymbol = aaveV2assetsDefaultMarket[i];

        it(`... should supply ${standardAmounts[tokenSymbol]} ${tokenSymbol} to Aave`, async () => {
            const assetInfo = getAssetInfo(tokenSymbol);

            if (assetInfo.symbol === 'ETH') {
                assetInfo.address = WETH_ADDRESS;
            }

            const aaveTokenInfo = await getAaveTokenInfo(dataProvider, assetInfo.address);
            const aToken = aaveTokenInfo.aTokenAddress;

            const amount = hre.ethers.utils.parseUnits(
                standardAmounts[assetInfo.symbol],
                assetInfo.decimals,
            );

            const balanceBefore = await balanceOf(aToken, proxy.address);

            await supplyAave(proxy, AAVE_MARKET, amount, assetInfo.address, senderAcc.address);

            const balanceAfter = await balanceOf(aToken, proxy.address);

            expect(balanceAfter).to.be.gt(balanceBefore);
        });
    }
});
