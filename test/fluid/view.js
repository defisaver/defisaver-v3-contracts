const hre = require('hardhat');
const {
    takeSnapshot,
    revertToSnapshot,
    getOwnerAddr,
    addrs,
    network,
    redeploy,
} = require('../utils');
const { topUp } = require('../../scripts/utils/fork');

const fluidViewTest = async () => {
    describe('Fluid-View', function () {
        this.timeout(100000);
        let isFork;
        let snapshot;
        let senderAcc;
        let viewContract;
        let resolverContract;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            isFork = hre.network.name === 'fork';
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
            }
            viewContract = await redeploy('FluidView', addrs[network].REGISTRY_ADDR, false, isFork);
            resolverContract = await hre.ethers.getContractAt('IFluidVaultResolver', '0x814c8C7ceb1411B364c2940c4b9380e739e06686');
        });
        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });
        it('...call fluid resolver', async () => {
            const VAULT_ID = 1;
            const vaultAddr = await resolverContract.getVaultAddress(VAULT_ID);
            const vaultDataFromOurView = await viewContract.getVaultData(vaultAddr);
            const vaultData = await resolverContract.getVaultEntireData(vaultAddr);
            console.log(vaultDataFromOurView);
        });
    });
};

describe('fluidViewTest', function () {
    this.timeout(80000);
    it('fluidViewTest', async () => {
        await fluidViewTest();
    }).timeout(50000);
});
