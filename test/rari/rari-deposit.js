const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    redeploy,
    balanceOf,
    approve,
    USDC_ADDR,
    DAI_ADDR,
} = require('../utils');

const { buyTokenIfNeeded, rariDeposit } = require('../actions.js');

describe('Rari deposit', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    before(async () => {
        await redeploy('RariDeposit');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... Try to supply 10k USDC to Rari stable pool', async () => {
        const usdcAmount = hre.ethers.utils.parseUnits('10000', 6);
        await buyTokenIfNeeded(USDC_ADDR, senderAcc, proxy, usdcAmount);

        await approve(USDC_ADDR, proxy.address);

        const rariUsdcFundManager = '0xC6BF8C8A55f77686720E0a88e2Fd1fEEF58ddf4a';
        const rsptAddress = '0x016bf078ABcaCB987f0589a6d3BEAdD4316922B0';

        const poolTokensBalanceBefore = await balanceOf(rsptAddress, senderAcc.address);

        const usdcBalanceBefore = await balanceOf(USDC_ADDR, senderAcc.address);
        console.log('Starting deposit');
        await rariDeposit(
            rariUsdcFundManager,
            USDC_ADDR,
            rsptAddress,
            usdcBalanceBefore,
            senderAcc.address,
            senderAcc.address,
            proxy,
        );
        const poolTokensAfterDeposit = await balanceOf(rsptAddress, senderAcc.address);

        const usdcBalanceAfter = await balanceOf(USDC_ADDR, senderAcc.address);
        const usdcBalanceChange = usdcBalanceBefore.sub(usdcBalanceAfter);

        const poolTokensChange = poolTokensAfterDeposit.sub(poolTokensBalanceBefore);
        console.log(`Received rspt tokens for usdc: ${poolTokensChange.toString()}`);
        console.log(`Sent USDC to rsp: ${usdcBalanceChange.toString()}`);

        expect(poolTokensChange).to.be.gt(0);
        expect(usdcBalanceChange).to.be.gt(0);
    }).timeout(1000000);
    it('... Try to supply 10k dai to Rari DAI pool', async () => {
        const daiAmount = hre.ethers.utils.parseUnits('10000', 18);
        await buyTokenIfNeeded(DAI_ADDR, senderAcc, proxy, daiAmount);

        await approve(DAI_ADDR, proxy.address);
        const rariDaiFundManager = '0xB465BAF04C087Ce3ed1C266F96CA43f4847D9635';

        const rdptAddress = '0x0833cfcb11A5ba89FbAF73a407831c98aD2D7648';

        const poolTokensBalanceBefore = await balanceOf(rdptAddress, senderAcc.address);

        const daiBalanceBefore = await balanceOf(DAI_ADDR, senderAcc.address);
        console.log('Starting deposit');
        await rariDeposit(
            rariDaiFundManager,
            DAI_ADDR,
            rdptAddress,
            daiBalanceBefore,
            senderAcc.address,
            senderAcc.address,
            proxy,
        );
        const poolTokensAfterDeposit = await balanceOf(rdptAddress, senderAcc.address);

        const daiBalanceAfter = await balanceOf(DAI_ADDR, senderAcc.address);
        const daiBalanceChange = daiBalanceBefore.sub(daiBalanceAfter);

        const poolTokensChange = poolTokensAfterDeposit.sub(poolTokensBalanceBefore);
        console.log(`Received rsdp tokens for dai: ${poolTokensChange.toString()}`);
        console.log(`Sent DAI to rdp: ${daiBalanceChange.toString()}`);

        expect(poolTokensChange).to.be.gt(0);
        expect(daiBalanceChange).to.be.gt(0);
    }).timeout(1000000);
});
