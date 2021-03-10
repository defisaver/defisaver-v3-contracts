const { expect } = require("chai");

const { getAssetInfo, compoundCollateralAssets } = require('@defisaver/tokens');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    balanceOf,
    standardAmounts,
} = require('../utils');


const {
    supplyComp,
    withdrawComp,
} = require('../actions');

describe("Comp-Withdraw", function () {
    this.timeout(80000);

    let senderAcc, proxy;

    before(async () => {
        await redeploy('CompWithdraw');
        await redeploy('DFSSell');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < compoundCollateralAssets.length; ++i) {
        const cTokenData = compoundCollateralAssets[i];

        it(`... should withdraw ${standardAmounts[cTokenData.underlyingAsset]} ${cTokenData.underlyingAsset} from Compound`, async () => {
            const assetInfo = getAssetInfo(cTokenData.underlyingAsset);
            const cToken = cTokenData.address;

            if (assetInfo.symbol === 'REP') return;

            const amount = ethers.utils.parseUnits(standardAmounts[assetInfo.symbol], assetInfo.decimals);
    
            await supplyComp(proxy, cToken, assetInfo.address, amount, senderAcc.address);

            const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

            await withdrawComp(proxy, cToken, amount, senderAcc.address);
    
            const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);
    
            expect(balanceAfter).to.be.gt(balanceBefore);
        
        });
    }

});

