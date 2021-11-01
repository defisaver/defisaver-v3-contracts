const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
    WETH_ADDRESS,
} = require('../utils');

const {
    COMP_ADDR,
} = require('../utils-comp');

const {
    supplyComp,
    claimComp,
} = require('../actions');

describe('Comp-Claim', function () {
    this.timeout(80000);

    let senderAcc; let proxy;

    before(async () => {
        await redeploy('CompSupply');
        await redeploy('CompClaim');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... claim comp tokens for proxy account', async () => {
        const cEth = getAssetInfo('cETH');

        const amount = hre.ethers.utils.parseUnits('10', 18);

        await supplyComp(proxy, cEth.address, WETH_ADDRESS, amount, senderAcc.address);

        const from = proxy.address;
        const to = senderAcc.address;

        const cSupplyAddresses = [cEth.address];
        const cBorrowAddresses = [];

        const compBalanceBefore = await balanceOf(COMP_ADDR, senderAcc.address);
        const compBalanceProxyBefore = await balanceOf(COMP_ADDR, proxy.address);

        // claim comp
        await claimComp(proxy, cSupplyAddresses, cBorrowAddresses, from, to);

        const compBalanceAfter = await balanceOf(COMP_ADDR, senderAcc.address);
        const compBalanceProxyAfter = await balanceOf(COMP_ADDR, proxy.address);

        expect(compBalanceProxyAfter).to.be.eq(compBalanceProxyBefore);
        expect(compBalanceAfter).to.be.gt(compBalanceBefore);
    });
});
