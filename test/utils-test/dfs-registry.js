const { expect } = require('chai');
const hre = require('hardhat');

const {
    redeploy,
    impersonateAccount,
    stopImpersonatingAccount,
    getProxy,
    ADMIN_ACC,
} = require('../utils');

describe('DFS-Registry-Controller', function () {
    this.timeout(80000);

    let dfsRegController; let senderAcc;

    const ADMIN_VAULT = '0xCCf3d848e08b94478Ed8f46fFead3008faF581fD';

    before(async () => {
        dfsRegController = await redeploy('DFSProxyRegistryController');

        await impersonateAccount(ADMIN_ACC);

        const signer = await hre.ethers.provider.getSigner(ADMIN_ACC);

        const adminVaultInstance = await hre.ethers.getContractFactory('AdminVault', signer);
        const adminVault = await adminVaultInstance.attach(ADMIN_VAULT);

        adminVault.connect(signer);

        console.log('dfsRegController: ', dfsRegController.address);

        // change owner in registry to dfsRegController
        await adminVault.changeOwner(dfsRegController.address);

        await stopImpersonatingAccount(ADMIN_ACC);

        senderAcc = (await hre.ethers.getSigners())[0];
        await getProxy(senderAcc.address);
    });

    it('... should create an additional proxy for the user', async () => {
        const proxiesBefore = await dfsRegController.getProxies(senderAcc.address);

        let recipe = await dfsRegController.addNewProxy({ gasLimit: 900_000 });

        recipe = await recipe.wait();

        console.log('Gas used: ', recipe.gasUsed.toString());

        const proxiesAfter = await dfsRegController.getProxies(senderAcc.address);

        // check new proxy if owner is user
        const latestProxy = proxiesAfter[proxiesAfter.length - 1];
        const dsProxy = await hre.ethers.getContractAt('IDSProxy', latestProxy);

        const owner = await dsProxy.owner();

        expect(owner).to.be.eq(senderAcc.address);
        expect(proxiesBefore.length + 1).to.be.eq(proxiesAfter.length);
    });

    it('... add to proxy pool and use that to assign new proxy', async () => {
        const proxiesBefore = await dfsRegController.getProxies(senderAcc.address);

        await dfsRegController.addToPool(1, { gasLimit: 5_000_000 });

        let recipe = await dfsRegController.addNewProxy({ gasLimit: 900_000 });
        let recipe2 = await dfsRegController.addNewProxy({ gasLimit: 900_000 });

        recipe = await recipe.wait();
        recipe2 = await recipe2.wait();

        console.log('Gas used with proxy pool: ', recipe.gasUsed.toString());
        console.log('Gas used with proxy pool: ', recipe2.gasUsed.toString());

        const proxiesAfter = await dfsRegController.getProxies(senderAcc.address);

        const latestProxy = proxiesAfter[proxiesAfter.length - 1];
        const dsProxy = await hre.ethers.getContractAt('IDSProxy', latestProxy);

        const owner = await dsProxy.owner();

        expect(owner).to.be.eq(senderAcc.address);
        expect(proxiesBefore.length + 2).to.be.eq(proxiesAfter.length);
    });
});
