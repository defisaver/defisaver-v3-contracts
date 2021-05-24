const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo, compoundCollateralAssets } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
} = require('../utils');

const {
    supplyComp,
} = require('../actions');

describe('Comp-Supply', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    before(async () => {
        await redeploy('CompSupply');
        await redeploy('DFSSell');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });
    // WBTC Supply fails
    for (let i = 0; i < compoundCollateralAssets.length; ++i) {
        const cTokenData = compoundCollateralAssets[i];
        const fetchedAmountWithUSD = fetchAmountinUSDPrice(cTokenData.underlyingAsset, '10000');

        it(`... should supply ${fetchedAmountWithUSD} ${cTokenData.underlyingAsset} to Compound`, async () => {
            const assetInfo = getAssetInfo(cTokenData.underlyingAsset);
            const cToken = cTokenData.address;

            if (assetInfo.symbol === 'REP') return;

            if (assetInfo.symbol === 'ETH') {
                assetInfo.address = WETH_ADDRESS;
            }

            const amount = hre.ethers.utils.parseUnits(
                fetchedAmountWithUSD,
                assetInfo.decimals,
            );

            const balanceBefore = await balanceOf(cToken, proxy.address);

            await supplyComp(proxy, cToken, assetInfo.address, amount, senderAcc.address);

            const balanceAfter = await balanceOf(cToken, proxy.address);

            expect(balanceAfter).to.be.gt(balanceBefore);
        });
    }
});
