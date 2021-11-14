const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    redeploy,
    balanceOf,
    approve,
    DAI_ADDR,
    USDT_ADDR,
} = require('../utils');

const { gUniDeposit, buyTokenIfNeeded, gUniWithdraw } = require('../actions.js');

describe('GUNI Withdraw', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    before(async () => {
        await redeploy('GUniDeposit');
        await redeploy('GUniWithdraw');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... Try to supply 10k dai and 10k USDT do G-UNI LP pool and then withdraw everything', async () => {
        const daiUSDTpoolAddress = '0xd58c89181360dd9166881fce2bc7c9baae2d5f31';
        const daiAmount = hre.ethers.utils.parseUnits('10000', 18);
        const usdtAmount = hre.ethers.utils.parseUnits('10000', 6);
        await buyTokenIfNeeded(DAI_ADDR, senderAcc, proxy, daiAmount);
        await buyTokenIfNeeded(USDT_ADDR, senderAcc, proxy, usdtAmount);

        await approve(DAI_ADDR, proxy.address);
        await approve(USDT_ADDR, proxy.address);

        const poolTokensBalanceBefore = await balanceOf(daiUSDTpoolAddress, senderAcc.address);
        const daiBalanceBefore = await balanceOf(DAI_ADDR, senderAcc.address);
        const usdtBalanceBefore = await balanceOf(USDT_ADDR, senderAcc.address);

        await gUniDeposit(
            daiUSDTpoolAddress,
            DAI_ADDR,
            USDT_ADDR,
            daiAmount,
            usdtAmount,
            senderAcc.address,
            proxy,
        );
        const poolTokensBalanceAfter = await balanceOf(daiUSDTpoolAddress, senderAcc.address);
        const daiBalanceAfter = await balanceOf(DAI_ADDR, senderAcc.address);
        const usdtBalanceAfter = await balanceOf(USDT_ADDR, senderAcc.address);

        const poolLPChange = poolTokensBalanceAfter.sub(poolTokensBalanceBefore);
        const daiChange = daiBalanceBefore.sub(daiBalanceAfter);
        const usdtChange = usdtBalanceBefore.sub(usdtBalanceAfter);
        console.log(`Received LP tokens: ${poolLPChange.toString()}`);
        console.log(`Before dai tokens: ${daiBalanceBefore.toString()}`);
        console.log(`After dai tokens: ${daiBalanceAfter.toString()}`);
        console.log(`Sent dai tokens: ${daiChange.toString()}`);

        console.log(`Before usdt tokens: ${usdtBalanceBefore.toString()}`);
        console.log(`After usdt tokens: ${usdtBalanceAfter.toString()}`);
        console.log(`Sent usdt tokens: ${usdtChange.toString()}`);
        expect(poolLPChange).to.be.gt(0);
        expect(daiBalanceAfter).to.be.gt(0);
        expect(usdtBalanceAfter).to.be.gt(0);
        await approve(daiUSDTpoolAddress, proxy.address);

        await gUniWithdraw(daiUSDTpoolAddress, poolLPChange, senderAcc.address, proxy);

        const poolTokensBalanceFinal = await balanceOf(daiUSDTpoolAddress, senderAcc.address);
        const daiBalanceFinal = await balanceOf(DAI_ADDR, senderAcc.address);
        const usdtBalanceFinal = await balanceOf(USDT_ADDR, senderAcc.address);

        expect(poolTokensBalanceFinal).to.be.eq(poolTokensBalanceBefore);
        console.log(daiBalanceFinal.toString());
        console.log(usdtBalanceFinal.toString());
    }).timeout(100000);
});
