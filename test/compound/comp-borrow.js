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
    borrowComp,
} = require('../actions');

describe('Comp-Borrow', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    before(async () => {
        await redeploy('CompSupply');
        await redeploy('CompBorrow');
        await redeploy('DFSSell');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < compoundCollateralAssets.length; ++i) {
        const cTokenData = compoundCollateralAssets[i];
        if (cTokenData.symbol === 'cWBTC Legacy') {
            // Jump over WBTC Legacy
            // eslint-disable-next-line no-continue
            continue;
        }

        it(`... should borrow ${fetchAmountinUSDPrice(cTokenData.underlyingAsset, '1000')} ${cTokenData.underlyingAsset} from Compound`, async () => {
            const assetInfo = getAssetInfo(cTokenData.underlyingAsset);
            const cToken = cTokenData.address;

            if (assetInfo.symbol === 'REP') return;

            // currently can't borrow any comp
            // TODO: make the check dynamic
            if (assetInfo.symbol === 'COMP') return;

            if (assetInfo.symbol === 'ETH') {
                assetInfo.address = WETH_ADDRESS;
            }

            const supplyingAmount = hre.ethers.utils.parseUnits(
                fetchAmountinUSDPrice(cTokenData.underlyingAsset, '3000'),
                assetInfo.decimals,
            );

            const borrowingAmount = hre.ethers.utils.parseUnits(
                fetchAmountinUSDPrice(cTokenData.underlyingAsset, '1000'),
                assetInfo.decimals,
            );

            await supplyComp(
                proxy,
                cToken,
                assetInfo.address,
                supplyingAmount,
                senderAcc.address,
            );

            const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

            await borrowComp(proxy, cToken, borrowingAmount, senderAcc.address);

            const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);

            expect(balanceAfter).to.be.gt(balanceBefore);
        });
    }
});
