const { compoundCollateralAssets } = require('@defisaver/tokens');
const { withdrawCompV3 } = require('../actions');
const {
    redeploy,
    WETH_ADDRESS,
    USDC_ADDR,
    balanceOf,
    fetchAmountinUSDPrice,
    getProxy,
} = require('../utils');

describe('CompV3-Withdraw', function () {
    this.timeout(80000);

    let senderAcc;
    let proxy;

    before(async () => {
        // await redeploy('CompV3Supply');
        await redeploy('CompV3Withdraw');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    const USDCAmountWithUSD = fetchAmountinUSDPrice('USDC', '1000');

    it(`... should withdraw ${USDCAmountWithUSD} USDC from CompoundV3`, async () => {
        const amount = hre.ethers.utils.parseUnits(USDCAmountWithUSD, 18);

        // await supplyComp(proxy, cToken, assetInfo.address, amount, senderAcc.address);

        const balanceBefore = await balanceOf(USDC_ADDR, senderAcc.address);

        await withdrawCompV3(proxy, senderAcc.address, USDC_ADDR, amount);

        const balanceAfter = await balanceOf(USDC_ADDR, senderAcc.address);

        expect(balanceAfter).to.be.gt(balanceBefore);
    });

    const WETHAmountWithUSD = fetchAmountinUSDPrice('WETH', '1000');

    it(`... should withdraw ${WETHAmountWithUSD} WETH from CompoundV3`, async () => {
        const amount = hre.ethers.utils.parseUnits(WETHAmountWithUSD, 18);

        // await supplyComp(proxy, cToken, assetInfo.address, amount, senderAcc.address);

        const balanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);

        await withdrawCompV3(proxy, senderAcc.address, WETH_ADDRESS, amount);

        const balanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

        expect(balanceAfter).to.be.gt(balanceBefore);
    });
});