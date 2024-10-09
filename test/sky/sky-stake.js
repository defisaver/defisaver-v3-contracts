const hre = require('hardhat');
const { expect } = require('chai');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve,
} = require('../utils');
const { skyStake } = require('../actions');

const stakingRewardsContracts = ['0x0650CAF159C5A49f711e8169D4336ECB9b950275', '0x10ab606B067C9C461d8893c47C7512472E19e2Ce'];

describe('Sky-Stake', function () {
    this.timeout(80000);

    let senderAcc; let proxy; let snapshot;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('SkyStake');
    });
    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });
    afterEach(async () => {
        await revertToSnapshot(snapshot);
    });
    for (let i = 0; i < stakingRewardsContracts.length; i++) {
        it(`should supply USDS to ${stakingRewardsContracts[i]} contract`, async () => {
            const stakingRewardsContract = await hre.ethers.getContractAt('IStakingRewards', stakingRewardsContracts[i]);
            const stakingToken = await stakingRewardsContract.stakingToken();
            const startAmount = hre.ethers.utils.parseUnits('100', 18);
            await setBalance(stakingToken, senderAcc.address, startAmount);
            await approve(stakingToken, proxy.address, senderAcc);
            await skyStake(
                proxy, stakingRewardsContract.address, stakingToken,
                senderAcc.address, startAmount.div(2).toString(),
            );
            const firstBalance = await stakingRewardsContract.balanceOf(proxy.address);
            expect(firstBalance).to.be.eq(startAmount.div(2));
            await skyStake(
                proxy, stakingRewardsContract.address, stakingToken,
                senderAcc.address, hre.ethers.constants.MaxUint256,
            );
            const secondBalance = await stakingRewardsContract.balanceOf(proxy.address);
            expect(secondBalance).to.be.eq(startAmount);
        });
    }
});
