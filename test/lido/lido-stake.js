const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    redeploy,
    balanceOf,
} = require('../utils');

const { lidoStake } = require('../actions.js');

describe('Yearn-Supply', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    before(async () => {
        await redeploy('LidoStake');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... stake ETH to LIDO', async () => {
        const amount = hre.ethers.utils.parseUnits('10', 18);
        await lidoStake(amount, senderAcc.address, proxy);
        console.log(amount.toString());
        console.log((await balanceOf('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', senderAcc.address)).toString());
        console.log((await balanceOf('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', proxy.address)).toString());
    }).timeout(50000);
});
