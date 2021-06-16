const { expect } = require('chai');
const hre = require('hardhat');
const {
    balanceOf,
    getProxy,
    redeploy,
    depositToWeth,
    send,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
    BN2Float,
    Float2BN,
} = require('../utils');

const {
    liquityOpen,
    liquityRedeem,
} = require('../actions.js');

describe('Liquity-Redeem', function () {
    this.timeout(1000000);
    const WETHAmount = Float2BN(fetchAmountinUSDPrice('WETH', 20000), 18);
    const collAmountOpen = Float2BN(fetchAmountinUSDPrice('WETH', 12000), 18);
    const LUSDAmountOpen = Float2BN(fetchAmountinUSDPrice('LUSD', 8000), 18);
    const LUSDAmountRedeem = Float2BN(fetchAmountinUSDPrice('LUSD', 2000), 18);
    const maxFeePercentage = Float2BN('5', 16);

    let senderAcc; let proxy; let proxyAddr;
    let liquityView; let LUSDAddr;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        liquityView = await redeploy('LiquityView');
        LUSDAddr = await liquityView.LUSDTokenAddr();

        await depositToWeth(WETHAmount);
        await send(WETH_ADDRESS, proxyAddr, WETHAmount);

        await redeploy('LiquityOpen');
        await redeploy('LiquityRedeem');
    });

    afterEach(async () => {
        console.log(`\tWETH balance: ${BN2Float(await balanceOf(WETH_ADDRESS, proxyAddr))}`);
        console.log(`\tLUSD balance: ${BN2Float(await balanceOf(LUSDAddr, proxyAddr))}`);
    });

    it(`... should open Trove with ${BN2Float(collAmountOpen)} WETH collateral and ${BN2Float(LUSDAmountOpen)} LUSD debt`, async () => {
        // eslint-disable-next-line max-len
        await liquityOpen(proxy, maxFeePercentage, collAmountOpen, LUSDAmountOpen, proxyAddr, proxyAddr);

        const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);

        expect(collAmount).to.equal(collAmountOpen);
        expect(await balanceOf(LUSDAddr, proxyAddr)).to.equal(LUSDAmountOpen);
    });

    it(`... should redeem ${BN2Float(LUSDAmountRedeem)} LUSD worth of collateral`, async () => {
        // eslint-disable-next-line max-len
        await liquityRedeem(proxy, LUSDAmountRedeem, proxyAddr, proxyAddr, Float2BN('100', 16));
    });

    it('... should redeem using the whole LUSD balance', async () => {
        // eslint-disable-next-line max-len
        await liquityRedeem(proxy, hre.ethers.constants.MaxUint256, proxyAddr, proxyAddr, maxFeePercentage);
    });
});
