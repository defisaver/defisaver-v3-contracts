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
        let vaultsResolverContract;
        let dexResolverContract;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            isFork = hre.network.name === 'fork';
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
            }
            viewContract = await redeploy('FluidView', addrs[network].REGISTRY_ADDR, false, isFork);
            vaultsResolverContract = await hre.ethers.getContractAt('IFluidVaultResolver', '0x814c8C7ceb1411B364c2940c4b9380e739e06686');
            dexResolverContract = await hre.ethers.getContractAt('IFluidDexResolver', '0x7af0C11F5c787632e567e6418D74e5832d8FFd4c');
        });
        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });
        it('...call fluid resolver', async () => {
            const VAULT_ID = 53;
            // const vaultAddr = await vaultsResolverContract.getVaultAddress(VAULT_ID);

            // const vaultData = await vaultsResolverContract.getVaultEntireData(vaultAddr);
            // console.log(vaultData);

            //const vaultDataFromOurView = await viewContract.getVaultData(vaultAddr);
            //console.log(vaultDataFromOurView);

            const dexData = await dexResolverContract.callStatic.getDexEntireData('0x3C0441B42195F4aD6aa9a0978E06096ea616CDa7');
            console.log(dexData);
        });
    });
};

describe('fluidViewTest', function () {
    this.timeout(80000);
    it('fluidViewTest', async () => {
        await fluidViewTest();
    }).timeout(50000);
});
