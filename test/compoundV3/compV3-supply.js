const { compoundCollateralAssets } = require('@defisaver/tokens');
const { supplyCompV3 } = require('../actions');
const {
    redeploy,
    WETH_ADDRESS,
    USDC_ADDR,
    balanceOf,
    fetchAmountinUSDPrice,
    getProxy,
} = require('../utils');

COMET_ADDR = '0xc3d688B66703497DAA19211EEdff47f25384cdc3';

describe('CompV3-Supply', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    before(async () => {

        await redeploy('CompV3Supply');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

        it(`... should supply 1000 USDC to Compound`, async () => {

            const USDCAmountWithUSD = fetchAmountinUSDPrice('USDC', '1000');
            const amount = hre.ethers.utils.parseUnits(USDCAmountWithUSD, 18);

            //const balanceBefore = await balanceOf(cToken, proxy.address);
            await supplyCompV3(proxy, USDC_ADDR, amount, senderAcc.address);

            //const balanceAfter = await balanceOf(cToken, proxy.address);

            //expect(balanceAfter).to.be.gt(balanceBefore);
        });
    
});

