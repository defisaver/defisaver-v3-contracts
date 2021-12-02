const { expect } = require('chai');
const hre = require('hardhat');

const {
    impersonateAccount,
    stopImpersonatingAccount,
    redeploy,
    balanceOf,
    send,
    OWNER_ACC,
    ADMIN_ACC,
    WETH_ADDRESS,
    depositToWeth,
} = require('../utils.js');

describe('Admin-Auth', () => {
    let sender;
    let ownerAcc;
    let adminAcc;
    let adminAuth;

    before(async () => {
        adminAuth = await redeploy('AdminAuth');

        adminAcc = await hre.ethers.provider.getSigner(ADMIN_ACC);
        ownerAcc = await hre.ethers.provider.getSigner(OWNER_ACC);

        sender = (await hre.ethers.getSigners())[0];
    });

    it('... owner should withdraw 1 WETH from contract', async () => {
        // 10 Dai
        const amount = hre.ethers.utils.parseUnits('11', 18);
        await depositToWeth(amount);

        const tokenBalanceBefore = await balanceOf(WETH_ADDRESS, sender.address);

        await send(WETH_ADDRESS, adminAuth.address, amount);

        await impersonateAccount(OWNER_ACC);

        const adminAuthByOwner = adminAuth.connect(ownerAcc);
        await adminAuthByOwner.withdrawStuckFunds(WETH_ADDRESS, sender.address, amount);

        await stopImpersonatingAccount(OWNER_ACC);

        const tokenBalanceAfter = await balanceOf(WETH_ADDRESS, sender.address);

        expect(tokenBalanceBefore).to.be.eq(tokenBalanceAfter);
    });

    it('... non owner should fail to withdraw WETH from contract', async () => {
        try {
            await adminAuth.withdrawStuckFunds(WETH_ADDRESS, sender.address, 0);

            expect(true).to.be(false);
        } catch (err) {
            expect(err.toString()).to.have.string('SenderNotOwner');
        }
    });

    it('... non admin should not be able to kill the contract', async () => {
        try {
            await adminAuth.kill();

            expect(true).to.be(false);
        } catch (err) {
            expect(err.toString()).to.have.string('SenderNotAdmin');
        }
    });

    it('... admin should be able to kill the contract', async () => {
        await impersonateAccount(ADMIN_ACC);

        const adminAuthByAdmin = adminAuth.connect(adminAcc);
        await adminAuthByAdmin.kill();

        await stopImpersonatingAccount(ADMIN_ACC);

        try {
            await adminAuth.adminVault();

            expect(true).to.be(false);
        } catch (err) {
            expect(err.toString()).to.have.string('Error: call revert exception');
        }
    });
});
