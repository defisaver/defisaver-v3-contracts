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
    describe('LiquityV2-View', function () {
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
                viewContract = await hre.ethers.getContractAt('LiquityV2View', '0x88bBa5Ce5cE20286Cf866b9f310354FFB701A296');
            } else {
                viewContract = await redeploy('LiquityV2View', addrs[network].REGISTRY_ADDR, false, isFork);
            }
        });
        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });
        it('...test view calls', async () => {
            const data = await viewContract
                .getMarketData('0xd7199b16945f1ebaa0b301bf3d05bf489caa408b');
            console.log(data);
            const troveInfo = await viewContract.getTroveInfo('0xd7199b16945f1ebaa0b301bf3d05bf489caa408b', '71810214906374185731654292089929598901308110473187727225692166795279417034813');
            console.log(troveInfo);
        });
    });
};

describe('LiquityV2-View', function () {
    this.timeout(80000);

    it('...test LiquityV2 view', async () => {
        await eulerV2ViewTest();
    }).timeout(50000);
});
