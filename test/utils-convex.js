const hre = require('hardhat');
const { getAddrFromRegistry } = require('./utils');
const poolInfo = require('./convex/poolInfo.json');

const noTest = [];
poolInfo.forEach((e, i) => {
    if (e.noTest) noTest.push(i);
});

const getRewards = async (account, rewardContract) => {
    const convexView = await hre.ethers.getContractAt(
        'ConvexView',
        await getAddrFromRegistry('ConvexView'),
    );
    const rewards = await convexView['earnedRewards(address,address)'](account, rewardContract);
    return rewards.filter((e) => (e.token !== '0x0000000000000000000000000000000000000000'));
};

const DepositOptions = {
    WRAP: 0,
    STAKE: 1,
    WRAP_AND_STAKE: 2,
};

const WithdrawOptions = {
    UNWRAP: 0,
    UNSTAKE: 1,
    UNSTAKE_AND_UNWRAP: 2,
};

module.exports = {
    getRewards,
    poolInfo,
    noTest,
    DepositOptions,
    WithdrawOptions,
};
