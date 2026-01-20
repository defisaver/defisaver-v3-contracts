const { expect } = require('chai');
const hre = require('hardhat');
const { redeploy, getProxy } = require('../utils/utils');
const { createSafe } = require('../utils/safe');

describe('SmartWalletUtils', () => {
    let senderAcc;
    let checkWalletTypeInstance;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        const realCheckWalletTypeInstance = await redeploy('SmartWalletUtils');
        const mock = await hre.ethers.getContractFactory('MockSmartWalletUtils');
        checkWalletTypeInstance = await mock.deploy(realCheckWalletTypeInstance.address);
    });

    it('... should return true for DsProxy wallet', async () => {
        const proxy = await getProxy(senderAcc.address);

        const isDSProxy = await checkWalletTypeInstance._isDSProxy(proxy.address);
        expect(isDSProxy).to.be.equal(true);
    });

    it('... should return false for safe wallet', async () => {
        const safeAddr = await createSafe(senderAcc.address);

        const isDSProxy = await checkWalletTypeInstance._isDSProxy(safeAddr);
        expect(isDSProxy).to.be.equal(false);
    });

    it('... should return false for zero address', async () => {
        const isDSProxy = await checkWalletTypeInstance._isDSProxy(
            hre.ethers.constants.AddressZero,
        );
        expect(isDSProxy).to.be.equal(false);
    });

    it('... should return false for EOA address', async () => {
        const isDSProxy = await checkWalletTypeInstance._isDSProxy(senderAcc.address);
        expect(isDSProxy).to.be.equal(false);
    });
});
