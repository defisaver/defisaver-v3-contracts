const { expect } = require('chai');
const hre = require('hardhat');

const {
    impersonateAccount,
    redeploy,
    stopImpersonatingAccount,
    getProxy,
    ADMIN_ACC,
    DFS_REG_CONTROLLER,
} = require('../utils');

const { changeProxyOwner } = require('../actions');

describe('Change owner', function () {
    this.timeout(80000);

    let dfsRegController; let senderAcc; let senderAcc2; let proxy;

    const ADMIN_VAULT = '0xCCf3d848e08b94478Ed8f46fFead3008faF581fD';

    before(async () => {
        await redeploy('ChangeProxyOwner');

        await impersonateAccount(ADMIN_ACC);

        const signer = await hre.ethers.provider.getSigner(ADMIN_ACC);

        const adminVaultInstance = await hre.ethers.getContractFactory('AdminVault', signer);
        const adminVault = await adminVaultInstance.attach(ADMIN_VAULT);

        adminVault.connect(signer);

        // change owner in registry to dfsRegController
        await adminVault.changeOwner(DFS_REG_CONTROLLER);

        await stopImpersonatingAccount(ADMIN_ACC);

        senderAcc = (await hre.ethers.getSigners())[0];
        senderAcc2 = (await hre.ethers.getSigners())[1];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should change owner of users DSProxy', async () => {
        const newOwner = senderAcc2.address;

        const oldOwner = await proxy.owner();

        await changeProxyOwner(proxy, newOwner);

        const changedOwner = await proxy.owner();
        console.log(oldOwner, changedOwner);

        expect(changedOwner).to.be.eq(newOwner);
    });

    it('... should change owner back', async () => {
        const newOwner = senderAcc.address;

        proxy = proxy.connect(senderAcc2);

        await changeProxyOwner(proxy, newOwner);

        const changedOwner = await proxy.owner();

        expect(changedOwner).to.be.eq(newOwner);
    });
});
