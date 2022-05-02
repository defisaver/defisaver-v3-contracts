const hre = require('hardhat');
const { qiDaoOpen } = require('../actions');

const {
    redeploy, getProxy,
} = require('../utils');

describe('QiDao-Open', () => {
    let senderAcc; let proxy;

    before(async () => {
        await redeploy('QiDaoOpen');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should open WETH QiDao vault', async () => {
        await qiDaoOpen(proxy, '1');
    });
    it('... should open WBTC QiDao vault', async () => {
        await qiDaoOpen(proxy, '1');
    });
});
