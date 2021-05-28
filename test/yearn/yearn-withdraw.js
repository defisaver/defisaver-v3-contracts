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

const { yearnSupply, yearnWithdraw } = require('../actions.js');

describe('Yearn-Withdraw', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    before(async () => {
        await redeploy('YearnSupply');
        await redeploy('YearnWithdraw');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should supply to Yearn', async () => {
        const amount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), 18);
        await approve(WETH_ADDRESS, proxy.address);
        await depositToWeth(amount);
        console.log((await balanceOf(WETH_ADDRESS, senderAcc.address)).toString());
        await yearnSupply(WETH_ADDRESS, amount, senderAcc.address, senderAcc.address, proxy);

        console.log((await balanceOf(WETH_ADDRESS, senderAcc.address)).toString());
        console.log((await balanceOf('0xe1237aA7f535b0CC33Fd973D66cBf830354D16c7', senderAcc.address)).toString());

        await approve('0xe1237aA7f535b0CC33Fd973D66cBf830354D16c7', proxy.address);
        await yearnWithdraw('0xe1237aA7f535b0CC33Fd973D66cBf830354D16c7', hre.ethers.constants.MaxUint256, senderAcc.address, senderAcc.address, proxy);

        console.log((await balanceOf(WETH_ADDRESS, senderAcc.address)).toString());
        console.log((await balanceOf('0xe1237aA7f535b0CC33Fd973D66cBf830354D16c7', senderAcc.address)).toString());
    }).timeout(50000);
});
