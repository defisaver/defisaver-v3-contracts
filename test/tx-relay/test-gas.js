/* eslint-disable max-len */

const hre = require('hardhat');

const {
    addrs,
    network,
    redeploy,
    getOwnerAddr,
    setBalance,
    approve,
    getGasUsed,
    takeSnapshot,
    revertToSnapshot,
} = require('../utils');
const { topUp } = require('../../scripts/utils/fork');

describe('V0 test', function () {
    this.timeout(80000);
    let senderAcc;
    let gasTestRelay;
    let isFork;
    let snapshotId;

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    before(async () => {
        isFork = hre.network.name === 'fork';
        console.log('isFork', isFork);
        [senderAcc] = await hre.ethers.getSigners();

        if (isFork) {
            await topUp(senderAcc.address);
            await topUp(getOwnerAddr());
        }

        gasTestRelay = await redeploy('GasTestRelay', addrs[network].REGISTRY_ADDR, false, isFork);
    });

    it('Basic test', async () => {
        const token = addrs[network].WETH_ADDRESS;
        const gasUsedParam = 200000;

        // uncomment for EOA
        await setBalance(token, senderAcc.address, hre.ethers.utils.parseUnits('1000000', 18));
        await approve(token, gasTestRelay.address, senderAcc);

        // await setBalance(token, gasTestRelay.address, hre.ethers.utils.parseUnits('10000000', 18));

        const receipt = await gasTestRelay.test_gas(gasUsedParam, token, senderAcc.address);

        const gasUsed = await getGasUsed(receipt);
        console.log(gasUsed);
    });
});
