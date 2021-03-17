const { expect } = require("chai");

const { getAssetInfo, compoundCollateralAssets } = require('@defisaver/tokens');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    balanceOf,
    standardAmounts,
    WETH_ADDRESS
} = require('../utils');


const {
    supplyComp,
    borrowComp,
} = require('../actions');

describe("Comp-Borrow", function () {
    this.timeout(80000);

    let senderAcc, proxy;

    before(async () => {
        await redeploy('CompBorrow');
        await redeploy('DFSSell');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < compoundCollateralAssets.length; ++i) {
        const cTokenData = compoundCollateralAssets[i];

        it(`... should borrow ${standardAmounts[cTokenData.underlyingAsset]} ${cTokenData.underlyingAsset} from Compound`, async () => {
            const assetInfo = getAssetInfo(cTokenData.underlyingAsset);
            const cToken = cTokenData.address;

            if (assetInfo.symbol === 'REP') return;

            // currently can't borrow any comp
            // TODO: make the check dynamic
            if (assetInfo.symbol === 'COMP') return;

            if (assetInfo.symbol === 'ETH') {
                assetInfo.address = WETH_ADDRESS;
            }

            const amount = ethers.utils.parseUnits(standardAmounts[assetInfo.symbol], assetInfo.decimals);
    
            await supplyComp(proxy, getAssetInfo('cETH').address, getAssetInfo('ETH').address, ethers.utils.parseUnits('3', 18), senderAcc.address);

            const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

            await borrowComp(proxy, cToken, amount, senderAcc.address);
    
            const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);
    
            expect(balanceAfter).to.be.gt(balanceBefore);
        
        });
    }

});

