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
                viewContract = await hre.ethers.getContractAt('LiquityV2View', '0x7DC97868B4b2Fd31c1002E9bfFe9a4aF2b534c06');
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
            const market = '0xd7199b16945f1ebaa0b301bf3d05bf489caa408b';
            const troveId = '67424636261021319576291112307907375011768731867548422484544596741348990692391';

            const data = await viewContract.getMarketData(market);
            console.log(data);
            const troveInfo = await viewContract.getTroveInfo(market, troveId);
            console.log(troveInfo);
            const trovesForOwner = await viewContract.getUserTroves(
                troveInfo.owner,
                market,
                0,
                10,
            );
            console.log(trovesForOwner);
        });
    });
};

describe('LiquityV2-View', function () {
    this.timeout(80000);

    it('...test LiquityV2 view', async () => {
        await eulerV2ViewTest();
    }).timeout(50000);
});
