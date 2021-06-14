const { expect } = require('chai');
const hre = require('hardhat');

const {
    impersonateAccount,
    stopImpersonatingAccount,
    redeploy,
    balanceOf,
    getProxy,
    send,
    OWNER_ACC,
    ADMIN_ACC,
    DAI_ADDR,
    UNISWAP_WRAPPER,
    WETH_ADDRESS,
} = require('../utils.js');

const {
    sell,
} = require('../actions');

describe('Admin-Auth', () => {
    let sender; let ownerAcc; let adminAcc; let proxy; let adminAuth;
    before(async () => {
        adminAuth = await redeploy('AdminAuth');
        await redeploy('DFSSell');

        adminAcc = await hre.ethers.provider.getSigner(ADMIN_ACC);
        ownerAcc = await hre.ethers.provider.getSigner(OWNER_ACC);

        sender = (await hre.ethers.getSigners())[0];

        proxy = await getProxy(sender.address);
    });

    it('... owner should withdraw 10 Dai from contract', async () => {
        const tokenBalance = await balanceOf(DAI_ADDR, sender.address);

        // 10 Dai
        const amount = hre.ethers.utils.parseUnits('10', 18);

        if (tokenBalance.lt(amount)) {
            await sell(
                proxy,
                WETH_ADDRESS,
                DAI_ADDR,
                hre.ethers.utils.parseUnits('1', 18),
                UNISWAP_WRAPPER,
                sender.address,
                sender.address,
            );
        }

        const tokenBalanceBefore = await balanceOf(DAI_ADDR, sender.address);

        await send(DAI_ADDR, adminAuth.address, amount);

        await impersonateAccount(OWNER_ACC);

        const adminAuthByOwner = adminAuth.connect(ownerAcc);
        await adminAuthByOwner.withdrawStuckFunds(DAI_ADDR, sender.address, amount);

        await stopImpersonatingAccount(OWNER_ACC);

        const tokenBalanceAfter = await balanceOf(DAI_ADDR, sender.address);

        expect(tokenBalanceBefore).to.be.eq(tokenBalanceAfter);
    });

    it('... non owner should fail to withdraw Dai from contract', async () => {
        try {
            await adminAuth.withdrawStuckFunds(DAI_ADDR, sender.address, 0);
            // eslint-disable-next-line no-unused-expressions
            expect(true).to.be.false;
        } catch (err) {
            console.log(err);
            expect(err.toString()).to.have.string('msg.sender not owner');
        }
    });

    it('... non admin should not be able to kill the contract', async () => {
        try {
            await adminAuth.kill();
            // eslint-disable-next-line no-unused-expressions
            expect(true).to.be.false;
        } catch (err) {
            console.log(err);

            expect(err.toString()).to.have.string('msg.sender not admin');
        }
    });

    it('... admin should be able to kill the contract', async () => {
        await impersonateAccount(ADMIN_ACC);

        const adminAuthByAdmin = adminAuth.connect(adminAcc);
        await adminAuthByAdmin.kill();

        await stopImpersonatingAccount(ADMIN_ACC);

        try {
            await adminAuth.adminVault();
            // eslint-disable-next-line no-unused-expressions
            expect(true).to.be.false;
        } catch (err) {
            // eslint-disable-next-line no-unused-expressions
            expect(true).to.be.true;
        }
    });
});
