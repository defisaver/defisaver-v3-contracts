/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
const { expect } = require('chai');
const hre = require('hardhat');
const { convexDeposit, convexWithdraw, convexClaim } = require('../actions');
const {
    getProxy,
    redeploy,
    Float2BN,
    balanceOf,
    setBalance,
    resetForkToBlock,
    takeSnapshot,
    revertToSnapshot,
    timeTravel,
} = require('../utils');

const {
    noTest: _noTest,
    poolInfo: _poolInfo,
    DepositOptions,
    getRewards,
    WithdrawOptions,
} = require('../utils-convex');

let noTest = _noTest;
let poolInfo = _poolInfo;

const convexDepositTest = (testLength) => {
    if (testLength === undefined) {
        testLength = poolInfo.length;
    } else {
        testLength = testLength > poolInfo.length ? poolInfo.length : testLength;
    }
    describe('Convex-Deposit', function () {
        this.timeout(1000000);
        const amount = Float2BN('10000');

        let senderAcc;
        let senderAddr;
        let proxy;

        let snapshot;

        before(async () => {
            await resetForkToBlock(14500000);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAddr);

            await redeploy('ConvexDeposit');
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        it('... should wrap curve lp', async () => {
            await Promise.all(poolInfo.map(async (pool, i) => {
                if (noTest.includes(pool.pid) || i >= testLength) {
                    return;
                }
                await setBalance(pool.lpToken, senderAddr, amount);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool.lpToken,
                    amount,
                    DepositOptions.WRAP,
                );
                expect(await balanceOf(pool.token, senderAddr)).to.be.eq(amount);
            }));
        });

        it('... should stake wrapped curve lp', async () => {
            await Promise.all(poolInfo.map(async (pool, i) => {
                if (noTest.includes(pool.pid) || i >= testLength) {
                    return;
                }
                await setBalance(pool.token, senderAddr, amount);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool.lpToken,
                    amount,
                    DepositOptions.STAKE,
                );
                expect(await balanceOf(pool.crvRewards, senderAddr)).to.be.eq(amount);
            }));
        });

        it('... should wrap and stake curve lp', async () => {
            await Promise.all(poolInfo.map(async (pool, i) => {
                if (noTest.includes(pool.pid) || i >= testLength) {
                    return;
                }
                await setBalance(pool.lpToken, senderAddr, amount);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool.lpToken,
                    amount,
                    DepositOptions.WRAP_AND_STAKE,
                );
                expect(await balanceOf(pool.crvRewards, senderAddr)).to.be.eq(amount);
            }));
        });

        after(() => {
            console.log(`tested ${testLength}/${poolInfo.length} pools, skipped ${noTest}`);
        });
    });
};

const convexWithdrawTest = (testLength) => {
    if (testLength === undefined) {
        testLength = poolInfo.length;
    } else {
        testLength = testLength > poolInfo.length ? poolInfo.length : testLength;
    }
    describe('Convex-Withdraw', function () {
        this.timeout(1000000);
        const amount = Float2BN('10000');

        let senderAcc;
        let senderAddr;
        let proxy;
        let proxyAddr;

        let snapshot;

        before(async () => {
            await resetForkToBlock(14500000);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;

            proxy = await getProxy(senderAddr);
            proxyAddr = proxy.address;

            await redeploy('ConvexDeposit');
            await redeploy('ConvexWithdraw');
            await redeploy('ConvexView');
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        it('... should unwrap curve lp', async () => {
            await Promise.all(poolInfo.map(async (pool, i) => {
                if (noTest.includes(pool.pid) || i >= testLength) {
                    return;
                }

                await setBalance(pool.lpToken, senderAddr, amount);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool.lpToken,
                    amount,
                    DepositOptions.WRAP,
                );
                expect(await balanceOf(pool.token, senderAddr)).to.be.eq(amount);

                await convexWithdraw(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool.lpToken,
                    amount,
                    WithdrawOptions.UNWRAP,
                );

                expect(await balanceOf(pool.lpToken, senderAddr)).to.be.eq(amount);
            }));
        });

        it('... should unstake wrapped curve lp', async () => {
            await Promise.all(poolInfo.map(async (pool, i) => {
                if (noTest.includes(pool.pid) || i >= testLength) {
                    return;
                }
                await setBalance(pool.lpToken, senderAddr, amount);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    proxyAddr,
                    pool.lpToken,
                    amount,
                    DepositOptions.WRAP_AND_STAKE,
                );
                expect(await balanceOf(pool.crvRewards, proxyAddr)).to.be.eq(amount);
            }));

            await timeTravel(60 * 60 * 24 * 7);

            for (let i = 0; i < poolInfo.length; i++) {
                const pool = poolInfo[i];

                if (noTest.includes(pool.pid) || i >= testLength) {
                    continue;
                }
                const rewards = await getRewards(proxyAddr, pool.crvRewards);
                const balancesB4 = await Promise.all(
                    rewards.map(async (e) => balanceOf(e.token, senderAddr)),
                );

                await convexWithdraw(
                    proxy,
                    proxyAddr,
                    senderAddr,
                    pool.lpToken,
                    amount,
                    WithdrawOptions.UNSTAKE,
                );

                expect(await balanceOf(pool.token, senderAddr)).to.be.eq(amount);
                // unstaking also claims rewards
                await Promise.all(rewards.map(async (e, j) => expect(
                    (await balanceOf(e.token, senderAddr)).sub(balancesB4[j]),
                ).to.be.gte(e.earned)));
            }
        });

        it('... should unstake and unwrap curve lp', async () => {
            await Promise.all(poolInfo.map(async (pool, i) => {
                if (noTest.includes(pool.pid) || i >= testLength) {
                    return;
                }
                await setBalance(pool.lpToken, senderAddr, amount);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    proxyAddr,
                    pool.lpToken,
                    amount,
                    DepositOptions.WRAP_AND_STAKE,
                );
                expect(await balanceOf(pool.crvRewards, proxyAddr)).to.be.eq(amount);
            }));

            await timeTravel(60 * 60 * 24 * 7);

            for (let i = 0; i < poolInfo.length; i++) {
                const pool = poolInfo[i];

                if (noTest.includes(pool.pid) || i >= testLength) {
                    continue;
                }
                const rewards = await getRewards(proxyAddr, pool.crvRewards);
                const balancesB4 = await Promise.all(
                    rewards.map(async (e) => balanceOf(e.token, senderAddr)),
                );

                await convexWithdraw(
                    proxy,
                    proxyAddr,
                    senderAddr,
                    pool.lpToken,
                    amount,
                    WithdrawOptions.UNSTAKE_AND_UNWRAP,
                );
                expect(await balanceOf(pool.lpToken, senderAddr)).to.be.eq(amount);
                await Promise.all(rewards.map(async (e, j) => expect(
                    (await balanceOf(e.token, senderAddr)).sub(balancesB4[j]),
                ).to.be.gte(e.earned)));
            }
        });

        after(() => {
            console.log(`tested ${testLength}/${poolInfo.length} pools, skipped ${noTest}`);
        });
    });
};

const convexClaimTest = (testLength) => {
    if (testLength === undefined) {
        testLength = poolInfo.length;
    } else {
        testLength = testLength > poolInfo.length ? poolInfo.length : testLength;
    }
    describe('Convex-Claim', function () {
        this.timeout(1000000);
        const amount = Float2BN('10000');

        let senderAcc;
        let senderAddr;
        let proxy;
        let proxyAddr;

        let snapshot;

        before(async () => {
            await resetForkToBlock(14500000);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;

            proxy = await getProxy(senderAddr);
            proxyAddr = proxy.address;

            await redeploy('ConvexDeposit');
            await redeploy('ConvexClaim');
            await redeploy('ConvexView');
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        it('... should claim rewards for user and send to proxy', async () => {
            await Promise.all(poolInfo.map(async (pool, i) => {
                if (noTest.includes(pool.pid) || i >= testLength) {
                    return;
                }

                await setBalance(pool.token, senderAddr, amount);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool.lpToken,
                    amount,
                    DepositOptions.STAKE,
                );

                expect(await balanceOf(pool.crvRewards, senderAddr)).to.be.eq(amount);
            }));

            await timeTravel(60 * 60 * 24 * 365);

            for (let i = 0; i < poolInfo.length; i++) {
                const pool = poolInfo[i];

                if (noTest.includes(pool.pid) || i >= testLength) {
                    continue;
                }
                const rewards = await getRewards(senderAddr, pool.crvRewards);
                const balancesB4 = await Promise.all(
                    rewards.map(async (e) => balanceOf(e.token, senderAddr)),
                );

                await convexClaim(
                    proxy,
                    senderAddr,
                    proxyAddr,
                    pool.lpToken,
                );

                await Promise.all(rewards.map(async (e, j) => expect(
                    (await balanceOf(e.token, proxyAddr)).sub(balancesB4[j]),
                ).to.be.gte(e.earned)));
            }
        });

        it('... should claim rewards for proxy and send to user', async () => {
            await Promise.all(poolInfo.map(async (pool, i) => {
                if (noTest.includes(pool.pid) || i >= testLength) {
                    return;
                }

                await setBalance(pool.token, senderAddr, amount);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    proxyAddr,
                    pool.lpToken,
                    amount,
                    DepositOptions.STAKE,
                );

                expect(await balanceOf(pool.crvRewards, proxyAddr)).to.be.eq(amount);
            }));

            await timeTravel(60 * 60 * 24 * 365);

            for (let i = 0; i < poolInfo.length; i++) {
                const pool = poolInfo[i];

                if (noTest.includes(pool.pid) || i >= testLength) {
                    continue;
                }
                const rewards = await getRewards(senderAddr, pool.crvRewards);
                const balancesB4 = await Promise.all(
                    rewards.map(async (e) => balanceOf(e.token, senderAddr)),
                );

                await convexClaim(
                    proxy,
                    proxyAddr,
                    senderAddr,
                    pool.lpToken,
                );

                await Promise.all(rewards.map(async (e, j) => expect(
                    (await balanceOf(e.token, senderAddr)).sub(balancesB4[j]),
                ).to.be.gte(e.earned)));
            }
        });

        after(() => {
            console.log(`tested ${testLength}/${poolInfo.length} pools, skipped ${noTest}`);
        });
    });
};

const convexFullTest = (testLength, single) => {
    if (single) {
        poolInfo = [_poolInfo[single]];
        testLength = 1;
        noTest = [];
    }
    describe('Convex full test', () => {
        it('... should do full Convex test', async () => {
            convexDepositTest(testLength);
            convexWithdrawTest(testLength);
            convexClaimTest(testLength);
        });
    });
};

module.exports = {
    convexDepositTest,
    convexWithdrawTest,
    convexClaimTest,
    convexFullTest,
};
