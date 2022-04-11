const { expect } = require('chai');
const hre = require('hardhat');

const { deployContract } = require('../../scripts/utils/deployer');

const {
    impersonateAccount,
    stopImpersonatingAccount,
    redeploy,
    balanceOf,
    send,
    getProxyAuth,
    getAddrFromRegistry,
    depositToWeth,
    sendEther,
    getProxy,
    OWNER_ACC,
    ADMIN_ACC,
    WETH_ADDRESS,
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
};

const adminVaultTest = async () => {
    describe('Admin-Vault', () => {
        let notOwner; let adminAcc; let adminVault; let
            newOwner; let newAdminAcc;

        before(async () => {
            adminVault = await redeploy('AdminVault');

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
            try {
                await adminVault.changeAdmin(newOwner.address);
                expect(true).to.be(false);
            } catch (err) {
                expect(err.toString()).to.have.string('SenderNotAdmin');
            }
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

                expect(true).to.be(false);
            } catch (err) {
                expect(err.toString()).to.have.string('SenderNotAdmin');
            }
        });
    });
};
const proxyPermissionTest = async () => {
    describe('Proxy-Permission', () => {
        let ownerAcc1; let ownerAcc2; let
            proxy; let proxyPermission;

        before(async () => {
            proxyPermission = await deployContract('ProxyPermission');

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

            await proxy['execute(address,bytes)'](proxyPermission.address, functionData, { gasLimit: 1500000 });

            const hasPermission = await getProxyAuth(proxy.address, ownerAcc2.address);
            expect(hasPermission).to.be.equal(true);
        });

        it('... should through DSProxy remove contract permission', async () => {
            const ProxyPermission = await hre.ethers.getContractFactory('ProxyPermission');
            const functionData = ProxyPermission.interface.encodeFunctionData(
                'removePermission',
                [ownerAcc2.address],
            );

            await proxy['execute(address,bytes)'](proxyPermission.address, functionData, { gasLimit: 1500000 });

            const hasPermission = await getProxyAuth(proxy.address, ownerAcc2.address);
            expect(hasPermission).to.be.equal(false);
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
