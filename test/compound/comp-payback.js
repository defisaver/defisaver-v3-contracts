const { expect } = require("chai");

const { getAssetInfo, compoundCollateralAssets } = require('@defisaver/tokens');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    balanceOf,
    standardAmounts,
    send,
    WETH_ADDRESS
} = require('../utils');


const {
    supplyComp,
    borrowComp,
    paybackComp,
} = require('../actions');

const {
    getBorrowBalance,
} = require('../utils-comp');

describe("Comp-Payback", function () {
    this.timeout(80000);

    let senderAcc, proxy, compView;

    before(async () => {
        await redeploy('CompPayback');
        await redeploy('DFSSell');

        compView = await redeploy('CompView');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < compoundCollateralAssets.length; ++i) {
        const cTokenData = compoundCollateralAssets[i];

        it(`... should payback ${standardAmounts[cTokenData.underlyingAsset]} ${cTokenData.underlyingAsset} from Compound`, async () => {
            const assetInfo = getAssetInfo(cTokenData.underlyingAsset);
            const cToken = cTokenData.address;

            if (assetInfo.symbol === 'REP') return;

            if (assetInfo.symbol === 'ETH') {
                assetInfo.address = WETH_ADDRESS;
            }

            // currently can't borrow any comp
            // TODO: make the check dynamic
            if (assetInfo.symbol === 'COMP') return;

            const amount = ethers.utils.parseUnits(standardAmounts[assetInfo.symbol], assetInfo.decimals);
    
            await supplyComp(proxy, getAssetInfo('cETH').address, getAssetInfo('ETH').address, ethers.utils.parseUnits('3', 18), senderAcc.address);

            await borrowComp(proxy, cToken, amount, senderAcc.address);

            const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);
            const borrowBalanceBefore = await getBorrowBalance(compView, proxy.address, cToken);

            await paybackComp(proxy, cToken, amount, senderAcc.address);
    
            const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);
            const borrowBalanceAfter = await getBorrowBalance(compView, proxy.address, cToken);
    
            expect(balanceAfter).to.be.lt(balanceBefore);
            expect(borrowBalanceAfter).to.be.lt(borrowBalanceBefore);
        });
    }

});

