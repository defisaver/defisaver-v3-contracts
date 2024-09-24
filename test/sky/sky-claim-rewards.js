const hre = require('hardhat');
const { expect } = require('chai');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve,
    nullAddress,
    timeTravel,
    balanceOf,
} = require('../utils');
const { skyStake, skyClaimRewards } = require('../actions');

const stakingRewardsContracts = ['0x0650CAF159C5A49f711e8169D4336ECB9b950275', '0x10ab606B067C9C461d8893c47C7512472E19e2Ce'];

describe('Sky-Stake', function () {
    this.timeout(80000);

    let senderAcc; let proxy; let snapshot;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('SkyStake');
        await redeploy('SkyClaimRewards');
    });
    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });
    afterEach(async () => {
        await revertToSnapshot(snapshot);
    });
    for (let i = 0; i < stakingRewardsContracts.length; i++) {
        it(`should supply USDS and claim rewards from ${stakingRewardsContracts[i]} contract`, async () => {
            const stakingRewardsContract = await hre.ethers.getContractAt('IStakingRewards', stakingRewardsContracts[i]);
            const rewardToken = await stakingRewardsContract.rewardsToken();
            if (rewardToken === nullAddress) return;
            const stakingToken = await stakingRewardsContract.stakingToken();
            const startAmount = hre.ethers.utils.parseUnits('100', 18);
            await setBalance(stakingToken, senderAcc.address, startAmount);
            await approve(stakingToken, proxy.address, senderAcc);
            await skyStake(
                proxy, stakingRewardsContract.address, stakingToken,
                senderAcc.address, hre.ethers.constants.MaxUint256,
            );
            const secondBalance = await stakingRewardsContract.balanceOf(proxy.address);
            expect(secondBalance).to.be.eq(startAmount);
            await timeTravel(86400);

            const rewards = await stakingRewardsContract.earned(proxy.address);
            await skyClaimRewards(
                proxy, stakingRewardsContract.address, rewardToken, senderAcc.address,
            );
            const rewardBalance = await balanceOf(rewardToken, senderAcc.address);
            expect(rewardBalance).to.be.gt(0);
            expect(rewards).to.be.gt(0);
        });
    }
});
