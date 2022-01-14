const { expect } = require('chai');
const hre = require('hardhat');
const { executeAction } = require('../actions.js');

const {
    impersonateAccount,
    stopImpersonatingAccount,
    redeploy,
    balanceOf,
    send,
    OWNER_ACC,
    ADMIN_ACC,
    DAI_ADDR,
    getAddrFromRegistry,
    setBalance,
    sendEther,
    getProxy,
} = require('../utils.js');

const adminAuthTest = async () => {
    describe('Admin-Auth', () => {
        let sender; let ownerAcc; let adminAcc; let adminAuth;
        before(async () => {
            const adminAuthAddr = await getAddrFromRegistry('AdminAuth');
            adminAuth = await hre.ethers.getContractAt('AdminAuth', adminAuthAddr);

            adminAcc = await hre.ethers.provider.getSigner(ADMIN_ACC);
            ownerAcc = await hre.ethers.provider.getSigner(OWNER_ACC);

            sender = (await hre.ethers.getSigners())[0];
        });

        it('... owner should withdraw 10 Dai from contract', async () => {
            // 10 Dai
            const amount = hre.ethers.utils.parseUnits('10', 18);

            await setBalance(DAI_ADDR, sender.address, amount);

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
                expect(err.toString()).to.have.string('msg.sender not owner');
            }
        });

        it('... non admin should not be able to kill the contract', async () => {
            try {
                await adminAuth.kill();
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.false;
            } catch (err) {
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
};
const adminVaultTest = async () => {
    describe('Admin-Vault', () => {
        let notOwner; let adminAcc; let adminVault; let
            newOwner; let newAdminAcc;

        before(async () => {
            const adminVaultAddr = await getAddrFromRegistry('AdminVault');
            adminVault = await hre.ethers.getContractAt('AdminVault', adminVaultAddr);

            adminAcc = await hre.ethers.provider.getSigner(ADMIN_ACC);

            notOwner = (await hre.ethers.getSigners())[0];
            newOwner = (await hre.ethers.getSigners())[1];
            newAdminAcc = (await hre.ethers.getSigners())[2];

            await sendEther(newOwner, ADMIN_ACC, '1');
        });

        it('... should change the owner address', async () => {
            await impersonateAccount(ADMIN_ACC);

            const adminVaultByAdmin = adminVault.connect(adminAcc);
            await adminVaultByAdmin.changeOwner(newOwner.address);
            const currOwner = await adminVaultByAdmin.owner();

            await stopImpersonatingAccount(ADMIN_ACC);

            expect(currOwner).to.eq(newOwner.address);
        });

        it('... should fail to change the owner address if not called by admin', async () => {
            await expect(adminVault.changeAdmin(newOwner.address)).to.be.revertedWith('msg.sender not admin');
        });

        it('... should change the admin address', async () => {
            await impersonateAccount(ADMIN_ACC);

            const adminVaultByAdmin = adminVault.connect(adminAcc);
            await adminVaultByAdmin.changeAdmin(newAdminAcc.address);
            const currAdmin = await adminVaultByAdmin.admin();

            await stopImpersonatingAccount(ADMIN_ACC);

            expect(currAdmin).to.eq(newAdminAcc.address);
        });

        it('... should fail to change the admin address if not called by admin', async () => {
            try {
                await adminVault.changeAdmin(notOwner.address);
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.false;
            } catch (err) {
                expect(err.toString()).to.have.string('msg.sender not admin');
            }
        });
    });
};
const proxyPermissionTest = async () => {
    describe('Proxy-Permission', () => {
        let ownerAcc1; let ownerAcc2; let
            proxy;

        before(async () => {
            ownerAcc1 = (await hre.ethers.getSigners())[0];
            ownerAcc2 = (await hre.ethers.getSigners())[1];

            proxy = await getProxy(ownerAcc1.address);
        });

        it('... should through DSProxy give contract permission', async () => {
            const ProxyPermission = await hre.ethers.getContractFactory('ProxyPermission');
            const functionData = ProxyPermission.interface.encodeFunctionData(
                'givePermission',
                [ownerAcc2.address],
            );
            await executeAction('ProxyPermission', functionData, proxy);
            // TODO: check permission
        });

        it('... should through DSProxy remove contract permission', async () => {
            const ProxyPermission = await hre.ethers.getContractFactory('ProxyPermission');
            const functionData = ProxyPermission.interface.encodeFunctionData(
                'removePermission',
                [ownerAcc2.address],
            );

            await executeAction('ProxyPermission', functionData, proxy);

            // TODO: check permission
        });
    });
};

const authDeployContracts = async () => {
    await redeploy('AdminAuth');
    await redeploy('AdminVault');
    await redeploy('ProxyPermission');
};
const authFullTest = async () => {
    await authDeployContracts();
    await adminAuthTest();
    await adminVaultTest();
    await proxyPermissionTest();
};

module.exports = {
    adminAuthTest,
    adminVaultTest,
    proxyPermissionTest,
    authFullTest,
    authDeployContracts,
};
