/* eslint-disable no-await-in-loop */
const { expect } = require('chai');
const hre = require('hardhat');
const ethers = require('ethers');
const { allowCompV3 } = require('../actions');
const {
    redeploy,
    getProxy,
} = require('../utils');

const cometAbi = [
    'function allowance(address owner, address spender) external view returns (uint256)',
];

const cometAddress = '0xc3d688B66703497DAA19211EEdff47f25384cdc3';

describe('CompV3-Allow', function () {
    this.timeout(80000);

    let senderAcc;
    let ownerAcc;
    let proxy;

    before(async () => {
        await redeploy('CompV3Allow');
        senderAcc = (await hre.ethers.getSigners())[0];
        ownerAcc = (await hre.ethers.getSigners())[1];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should test CompoundV3 allow', async () => {
        const cometExt = new ethers.Contract(cometAddress, cometAbi, ownerAcc);

        await allowCompV3(proxy, ownerAcc.address, true);

        let tx = await cometExt.allowance(proxy.address, ownerAcc.address);

        expect(tx.toString()).not.to.equal('0');

        await allowCompV3(proxy, ownerAcc.address, false);

        tx = await cometExt.allowance(proxy.address, ownerAcc.address);

        expect(tx.toString()).to.equal('0');
    });
});
