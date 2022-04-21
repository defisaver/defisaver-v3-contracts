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
    approve,
    setBalance,
    resetForkToBlock,
    takeSnapshot,
    revertToSnapshot,
    timeTravel,
} = require('../utils');

const {
    noTest,
    poolInfo,
    DepositOptions,
    getRewards,
    WithdrawOptions,
} = require('../utils-convex');

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
        let proxyAddr;

        let snapshot;

        before(async () => {
            await resetForkToBlock(14500000);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;

            proxy = await getProxy(senderAddr);
            proxyAddr = proxy.address;

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
                if (pool.noTest || i > testLength) {
                    return;
                }
                await setBalance(pool.lpToken, senderAddr, amount);
                await approve(pool.lpToken, proxyAddr);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    i,
                    amount,
                    DepositOptions.WRAP,
                );
                expect(await balanceOf(pool.token, senderAddr)).to.be.eq(amount);
            }));
        });

        it('... should stake wrapped curve lp', async () => {
            await Promise.all(poolInfo.map(async (pool, i) => {
                if (pool.noTest || i > testLength) {
                    return;
                }
                await setBalance(pool.token, senderAddr, amount);
                await approve(pool.token, proxyAddr);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    i,
                    amount,
                    DepositOptions.STAKE,
                );
                expect(await balanceOf(pool.crvRewards, senderAddr)).to.be.eq(amount);
            }));
        });

        it('... should wrap and stake curve lp', async () => {
            await Promise.all(poolInfo.map(async (pool, i) => {
                if (pool.noTest || i > testLength) {
                    return;
                }
                await setBalance(pool.lpToken, senderAddr, amount);
                await approve(pool.lpToken, proxyAddr);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    i,
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
                if (pool.noTest || i + 1 > testLength) {
                    return;
                }

                await setBalance(pool.lpToken, senderAddr, amount);
                await approve(pool.lpToken, proxyAddr);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    i,
                    amount,
                    DepositOptions.WRAP,
                );
                expect(await balanceOf(pool.token, senderAddr)).to.be.eq(amount);

                await approve(pool.token, proxyAddr);
                await convexWithdraw(
                    proxy,
                    senderAddr,
                    senderAddr,
                    i,
                    amount,
                    WithdrawOptions.UNWRAP,
                );

                expect(await balanceOf(pool.lpToken, senderAddr)).to.be.eq(amount);
            }));
        });

        it('... should unstake wrapped curve lp', async () => {
            await Promise.all(poolInfo.map(async (pool, i) => {
                if (pool.noTest || i + 1 > testLength) {
                    return;
                }
                await setBalance(pool.lpToken, senderAddr, amount);
                await approve(pool.lpToken, proxyAddr);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    proxyAddr,
                    i,
                    amount,
                    DepositOptions.WRAP_AND_STAKE,
                );
                expect(await balanceOf(pool.crvRewards, proxyAddr)).to.be.eq(amount);
            }));

            await timeTravel(60 * 60 * 24 * 7);

            for (let i = 0; i < poolInfo.length; i++) {
                const pool = poolInfo[i];
                if (pool.noTest || i + 1 > testLength) {
                    continue;
                }
                const rewards = await getRewards(proxyAddr, pool.crvRewards);
                await Promise.all(
                    rewards.map(async (e) => setBalance(e.token, senderAddr, Float2BN('0'))),
                );

                await convexWithdraw(
                    proxy,
                    proxyAddr,
                    senderAddr,
                    i,
                    amount,
                    WithdrawOptions.UNSTAKE,
                );

                expect(await balanceOf(pool.token, senderAddr)).to.be.eq(amount);
                // unstaking also claims rewards
                await Promise.all(rewards.map(async (e) => expect(
                    await balanceOf(e.token, senderAddr),
                ).to.be.gte(e.earned)));
            }
        });

        it('... should unstake and unwrap curve lp', async () => {
            await Promise.all(poolInfo.map(async (pool, i) => {
                if (pool.noTest || i + 1 > testLength) {
                    return;
                }
                await setBalance(pool.lpToken, senderAddr, amount);
                await approve(pool.lpToken, proxyAddr);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    proxyAddr,
                    i,
                    amount,
                    DepositOptions.WRAP_AND_STAKE,
                );
                expect(await balanceOf(pool.crvRewards, proxyAddr)).to.be.eq(amount);
            }));

            await timeTravel(60 * 60 * 24 * 7);

            for (let i = 0; i < poolInfo.length; i++) {
                const pool = poolInfo[i];
                if (pool.noTest || i + 1 > testLength) {
                    continue;
                }
                const rewards = await getRewards(proxyAddr, pool.crvRewards);
                await Promise.all(
                    rewards.map(async (e) => setBalance(e.token, senderAddr, Float2BN('0'))),
                );

                await convexWithdraw(
                    proxy,
                    proxyAddr,
                    senderAddr,
                    i,
                    amount,
                    WithdrawOptions.UNSTAKE_AND_UNWRAP,
                );
                expect(await balanceOf(pool.lpToken, senderAddr)).to.be.eq(amount);
                await Promise.all(rewards.map(async (e) => expect(
                    await balanceOf(e.token, senderAddr),
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
                if (pool.noTest || i > testLength) {
                    return;
                }

                await setBalance(pool.token, senderAddr, amount);
                await approve(pool.token, proxyAddr);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    i,
                    amount,
                    DepositOptions.STAKE,
                );

                expect(await balanceOf(pool.crvRewards, senderAddr)).to.be.eq(amount);
            }));

            await timeTravel(60 * 60 * 24 * 365);

            for (let i = 0; i < poolInfo.length; i++) {
                const pool = poolInfo[i];
                if (pool.noTest || i > testLength) {
                    continue;
                }
                const rewards = await getRewards(senderAddr, pool.crvRewards);
                await Promise.all([
                    ...rewards.map(async (e) => setBalance(e.token, proxyAddr, Float2BN('0'))),
                    ...rewards.map(async (e) => approve(e.token, proxyAddr)),
                ]);

                await convexClaim(
                    proxy,
                    senderAddr,
                    proxyAddr,
                    pool.crvRewards,
                );

                await Promise.all(rewards.map(async (e) => expect(
                    await balanceOf(e.token, proxyAddr),
                ).to.be.gte(e.earned)));
            }
        });

        it('... should claim rewards for proxy and send to user', async () => {
            await Promise.all(poolInfo.map(async (pool, i) => {
                if (pool.noTest || i > testLength) {
                    return;
                }

                await setBalance(pool.token, senderAddr, amount);
                await approve(pool.token, proxyAddr);
                await convexDeposit(
                    proxy,
                    senderAddr,
                    proxyAddr,
                    i,
                    amount,
                    DepositOptions.STAKE,
                );

                expect(await balanceOf(pool.crvRewards, proxyAddr)).to.be.eq(amount);
            }));

            await timeTravel(60 * 60 * 24 * 365);

            for (let i = 0; i < poolInfo.length; i++) {
                const pool = poolInfo[i];
                if (pool.noTest || i + 1 > testLength) {
                    continue;
                }
                const rewards = await getRewards(senderAddr, pool.crvRewards);
                await Promise.all(
                    rewards.map(async (e) => setBalance(e.token, senderAddr, Float2BN('0'))),
                );

                await convexClaim(
                    proxy,
                    proxyAddr,
                    senderAddr,
                    pool.crvRewards,
                );

                await Promise.all(rewards.map(async (e) => expect(
                    await balanceOf(e.token, senderAddr),
                ).to.be.gte(e.earned)));
            }
        });

        after(() => {
            console.log(`tested ${testLength}/${poolInfo.length} pools, skipped ${noTest}`);
        });
    });
};

const convexFullTest = (testLength) => {
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
