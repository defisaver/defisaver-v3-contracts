/* eslint-disable no-await-in-loop */
const { expect } = require('chai');
const hre = require('hardhat');
const ethers = require('ethers');
const { allowCompV3 } = require('../actions');
const {
    redeploy,
    getProxy,
} = require('../utils');

const cometExtAbi = [
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function allow(address manager, bool isAllowed_) external',
];

const cometExtAddress = '0x285617313887d43256F852cAE0Ee4de4b68D45B0';

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
        const cometExt = new ethers.Contract(cometExtAddress, cometExtAbi, ownerAcc);

        await allowCompV3(proxy, ownerAcc.address, true);

        let tx = await cometExt.allowance(proxy.address, ownerAcc.address);

        expect(tx.toString()).not.to.equal('0');

        await allowCompV3(proxy, ownerAcc.address, false);

        tx = await cometExt.allowance(proxy.address, ownerAcc.address);

        expect(tx.toString()).to.equal('0');
    });
});
