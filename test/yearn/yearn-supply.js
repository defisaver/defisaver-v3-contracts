const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    redeploy,
    balanceOf,
    fetchAmountinUSDPrice,
    WETH_ADDRESS,
    depositToWeth,
    approve,
} = require('../utils');

const { yearnSupply } = require('../actions.js');

describe('Yearn-Supply', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    before(async () => {
        await redeploy('YearnSupply');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should supply to Yearn', async () => {
        const amount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), 18);
        await approve(WETH_ADDRESS, proxy.address);
        await depositToWeth(amount);
        console.log(amount);
        await yearnSupply(WETH_ADDRESS, amount, senderAcc.address, senderAcc.address, proxy);

        console.log(await balanceOf(WETH_ADDRESS, senderAcc.address));
        console.log(await balanceOf('0xe1237aA7f535b0CC33Fd973D66cBf830354D16c7', senderAcc.address));
    }).timeout(50000);
});
