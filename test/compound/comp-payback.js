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
    paybackComp,
} = require('../actions');

const {
    getBorrowBalance,
} = require('../utils-comp');

describe('Comp-Payback', function () {
    this.timeout(80000);

    let senderAcc; let proxy; let
        compView;

    before(async () => {
        await redeploy('CompSupply');
        await redeploy('CompBorrow');
        await redeploy('CompPayback');
        await redeploy('DFSSell');

        compView = await redeploy('CompView');

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
        const fetchedAmountWithUSD = fetchAmountinUSDPrice(cTokenData.underlyingAsset, '1000');

        it(`... should payback ${fetchedAmountWithUSD} ${cTokenData.underlyingAsset} from Compound`, async () => {
            const assetInfo = getAssetInfo(cTokenData.underlyingAsset);
            const cToken = cTokenData.address;

            if (assetInfo.symbol === 'REP') return;

            if (assetInfo.symbol === 'ETH') {
                assetInfo.address = WETH_ADDRESS;
            }

            // currently can't borrow any comp
            // TODO: make the check dynamic
            if (assetInfo.symbol === 'COMP') return;

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

            await borrowComp(proxy, cToken, borrowingAmount, senderAcc.address);

            const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);
            const borrowBalanceBefore = await getBorrowBalance(compView, proxy.address, cToken);

            await paybackComp(proxy, cToken, borrowingAmount, senderAcc.address);

            const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);
            const borrowBalanceAfter = await getBorrowBalance(compView, proxy.address, cToken);

            expect(balanceAfter).to.be.lt(balanceBefore);
            expect(borrowBalanceAfter).to.be.lt(borrowBalanceBefore);
        });
    }
});
