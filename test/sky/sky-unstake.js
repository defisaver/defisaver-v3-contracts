const hre = require('hardhat');
const { expect } = require('chai');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve,
    balanceOf,
} = require('../utils');
const { skyStake, skyUnstake } = require('../actions');

const stakingRewardsContracts = ['0x0650CAF159C5A49f711e8169D4336ECB9b950275', '0x10ab606B067C9C461d8893c47C7512472E19e2Ce'];

describe('Sky-Stake', function () {
    this.timeout(80000);

    let senderAcc; let proxy; let snapshot;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('SkyStake');
        await redeploy('SkyUnstake');
    });
    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });
    afterEach(async () => {
        await revertToSnapshot(snapshot);
    });
    for (let i = 0; i < stakingRewardsContracts.length; i++) {
        it(`should supply and withdraw USDS from ${stakingRewardsContracts[i]} contract`, async () => {
            const stakingRewardsContract = await hre.ethers.getContractAt('IStakingRewards', stakingRewardsContracts[i]);
            const stakingToken = await stakingRewardsContract.stakingToken();
            const startAmount = hre.ethers.utils.parseUnits('100', 18);
            await setBalance(stakingToken, senderAcc.address, startAmount);
            await approve(stakingToken, proxy.address, senderAcc);
            await skyStake(
                proxy, stakingRewardsContract.address, stakingToken,
                senderAcc.address, hre.ethers.constants.MaxUint256,
            );
            const firstBalance = await stakingRewardsContract.balanceOf(proxy.address);
            expect(firstBalance).to.be.eq(startAmount);
            await skyUnstake(
                proxy, stakingRewardsContract.address, stakingToken,
                senderAcc.address, startAmount.div(2).toString(),
            );
            const secondBalance = await stakingRewardsContract.balanceOf(proxy.address);
            expect(secondBalance).to.be.eq(startAmount.div(2));
            const usdsFirstBalance = await balanceOf(stakingToken, senderAcc.address);
            expect(usdsFirstBalance).to.be.eq(startAmount.div(2));
            await skyUnstake(
                proxy, stakingRewardsContract.address, stakingToken,
                senderAcc.address, hre.ethers.constants.MaxUint256,
            );
            const thirdBalance = await stakingRewardsContract.balanceOf(proxy.address);
            expect(thirdBalance).to.be.eq(0);
            const usdsSecondBalance = await balanceOf(stakingToken, senderAcc.address);
            expect(usdsSecondBalance).to.be.eq(startAmount);
        });
    }
});
