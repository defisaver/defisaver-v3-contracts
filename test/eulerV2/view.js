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

const eulerV2ViewTest = async () => {
    describe('EulerV2-View', function () {
        this.timeout(100000);
        let isFork;
        let snapshot;
        let senderAcc;
        let viewContract;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            isFork = hre.network.name === 'fork';
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
                viewContract = await hre.ethers.getContractAt('EulerV2View', '0x561013c605A17f5dC5b738C8a3fF9c5F33DbC3d8');
            } else {
                viewContract = await redeploy('EulerV2View', addrs[network].REGISTRY_ADDR, false, isFork);
            }
        });
        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        it('...test view calls', async () => {
            // weth borrowed: 0xe39b916a35d28d27741B46e1B49614AC6E966d33
            // usdc borrowed: 0x1e17A75616cd74f5846B1b71622Aa8e10ea26Cc0
            const userData = await viewContract.getUserData('0x1e17A75616cd74f5846B1b71622Aa8e10ea26Cc0');
            console.log(userData);
            const accounts = await viewContract.fetchUsedAccounts('0x99fd78c210b3Dec66607d2235784C3f9512cb1C9', 8, 30);
            console.log(accounts);
        });
    });
};

describe('EulerV2-View', function () {
    this.timeout(80000);

    it('...test EulerV2 view', async () => {
        await eulerV2ViewTest();
    }).timeout(50000);
});
