const dfs = require('@defisaver/sdk');
let { utils: { curveUtils: { poolInfo } } } = require('@defisaver/sdk');
const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');
const {
    balanceOf,
    getProxy,
    redeploy,
    approve,
    WETH_ADDRESS,
    setBalance,
    Float2BN,
    resetForkToBlock,
    timeTravel,
    BN2Float,
    STETH_ADDRESS,
    revertToSnapshot,
    takeSnapshot,
    setNetwork,
    getContractFromRegistry,
    ETH_ADDR,
} = require('../../utils/utils');

const {
    curveDeposit,
    curveWithdraw,
    curveGaugeDeposit,
    curveGaugeWithdraw,
    curveClaimFees,
    curveStethPoolDeposit,
    curveStethPoolWithdraw,
} = require('../../utils/actions');

console.log({ poolInfoLength: poolInfo.length });
poolInfo = poolInfo.filter(({ name }) => !['aave'].includes(name));
// const forkNum = 14700000;
const forkNum = 17020442;

const testDeposit = async (
    proxy,
    sender,
    receiver,
    pool,
    minMintAmount,
    useUnderlying,
    amountEach,
) => {
    const amounts = (useUnderlying ? pool.underlyingDecimals : pool.decimals).map(
        (e) => Float2BN(amountEach, e),
    );

    const assetsToApprove = await (new dfs.actions.curve.CurveDepositAction(
        sender,
        receiver,
        pool.swapAddr,
        minMintAmount,
        useUnderlying,
        amounts,
    )).getAssetsToApprove();

    await Promise.all(assetsToApprove.map(async (e, i) => {
        await setBalance(e.asset, sender, amounts[i]);
        await approve(e.asset, proxy.address);
    }));

    await setBalance(pool.lpToken, receiver, Float2BN('0'));
    await curveDeposit(
        proxy,
        sender,
        receiver,
        pool.swapAddr,
        minMintAmount,
        useUnderlying,
        amounts,
    );
    const tokensAfter = await balanceOf(pool.lpToken, receiver);
    expect(tokensAfter).to.be.gt('0');
    return tokensAfter;
};

const testWithdraw = async (
    proxy,
    sender,
    receiver,
    pool,
    burnAmount,
    useUnderlying,
    withdrawExact,
    amountEach,
    { removeOneCoin } = { removeOneCoin: false },
) => {
    const amounts = (useUnderlying ? pool.underlyingDecimals : pool.decimals).map(
        (e, i) => ((!removeOneCoin || i === 0) ? Float2BN(amountEach, e) : Float2BN('0')),
    );
    await approve(pool.lpToken, proxy.address);

    const balancesBefore = await Promise.all(
        (useUnderlying ? pool.underlyingCoins : pool.coins)
            .map(async (c) => {
                // eslint-disable-next-line no-param-reassign
                if (c === ETH_ADDR) c = WETH_ADDRESS;
                return balanceOf(c, receiver);
            }),
    );

    await curveWithdraw(
        proxy,
        sender,
        receiver,
        pool.swapAddr,
        burnAmount,
        useUnderlying,
        withdrawExact,
        removeOneCoin,
        amounts,
    );

    await Promise.all(
        (useUnderlying ? pool.underlyingCoins : pool.coins).map(async (c, i) => {
            // eslint-disable-next-line no-param-reassign
            if (c === ETH_ADDR) c = WETH_ADDRESS;
            const balance = await balanceOf(c, receiver).then((e) => e.sub(balancesBefore[i]));
            expect(
                balance,
            ).to.be.gte(amounts[i].sub(
                amounts[i].div(1_00_00), // max allowed slippage hardcoded in CurveWithdraw
            ));
            if (withdrawExact || (removeOneCoin && i !== 0)) {
                expect(balance).to.be.lte(amounts[i]);
                // if we are getting tokens we arent expecting something is probably wrong
                // this check would have prevented ca7d7080cc3488038ed2b56783d18ea23391c425
            }
        }),
    );
};

const curveDepositTest = async (testLength) => {
    describe('Curve-Deposit', async function () {
        this.timeout(1000000);
        const amountEach = '1000';

        let senderAcc;
        let senderAddr;
        let proxy;
        let snapshot;

        before(async () => {
            await resetForkToBlock(forkNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);

            await redeploy('CurveDeposit');
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        await Promise.all(poolInfo.slice(0, testLength).map(async (pool) => {
            const poolName = pool.name;
            it(`... should deposit coins [${poolName}]`, async () => {
                await testDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool,
                    '0', // minMintAmount
                    false,
                    amountEach,
                );
            });
            it(`... should deposit underlyingCoins [${poolName}]`, async function () {
                /// @dev no test if no underlying
                if (!pool.depositContract && !pool.underlyingFlag) this.skip();
                await testDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool,
                    '0', // minMintAmount
                    true,
                    amountEach,
                );
            });
        }));
    });
};

const curveWithdrawOneCoinTest = async (testLength) => {
    describe('Curve-Withdraw-One-Coin', async function () {
        this.timeout(1000000);
        const amountEach = '1000';

        let senderAcc;
        let senderAddr;
        let proxy;
        let snapshot;

        setNetwork('mainnet');

        before(async () => {
            await resetForkToBlock(forkNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);

            await redeploy('CurveDeposit');
            await redeploy('CurveWithdraw');
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        await Promise.all(poolInfo.slice(0, testLength).map(async (pool) => {
            const poolName = pool.name;

            it(`... should deposit then withdraw one coin [${poolName}]`, async function () {
                /// @dev these two pools dont implement remove_liquidity_one_coin
                if (['susd', 'compound'].includes(poolName)) this.skip();
                const lpMinted = await testDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool,
                    '0', // minMintAmount
                    false,
                    amountEach,
                );
                await testWithdraw(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool,
                    lpMinted,
                    false,
                    false,
                    `${+amountEach * 0.2}`,
                    { removeOneCoin: true },
                );
            });
            it(`... should deposit then withdraw one underlying coin [${poolName}]`, async function () {
                /// @dev no test if no underlying
                if (!pool.depositContract && !pool.underlyingFlag) this.skip();
                const lpMinted = await testDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool,
                    '0', // minMintAmount
                    true,
                    amountEach,
                );
                await testWithdraw(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool,
                    lpMinted,
                    true,
                    false,
                    `${+amountEach * 0.2}`,
                    { removeOneCoin: true },
                );
            });
        }));
    });
};

const curveWithdrawTest = async (testLength) => {
    describe('Curve-Withdraw', async function () {
        this.timeout(1000000);
        const amountEach = '1000';

        let senderAcc;
        let senderAddr;
        let proxy;
        let snapshot;

        setNetwork('mainnet');

        before(async () => {
            await resetForkToBlock(forkNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);

            await redeploy('CurveDeposit');
            await redeploy('CurveWithdraw');
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        await Promise.all(poolInfo.slice(0, testLength).map(async (pool) => {
            const poolName = pool.name;
            it(`... should deposit then withdraw coins [${poolName}]`, async () => {
                const lpMinted = await testDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool,
                    '0', // minMintAmount
                    false,
                    amountEach,
                );
                await testWithdraw(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool,
                    lpMinted,
                    false,
                    false,
                    `${+amountEach * 0.2}`,
                );
            });
            it(`... should deposit then withdraw underlyingCoins [${poolName}]`, async function () {
                /// @dev no test if no underlying
                if (!pool.depositContract && !pool.underlyingFlag) this.skip();
                const lpMinted = await testDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool,
                    '0', // minMintAmount
                    true,
                    amountEach,
                );
                await testWithdraw(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool,
                    lpMinted,
                    true,
                    false,
                    `${+amountEach * 0.2}`,
                );
            });
        }));
    });
};

const curveWithdrawExactTest = async (testLength) => {
    describe('Curve-Withdraw-Exact', async function () {
        this.timeout(1000000);
        const amountEach = '1000';

        let senderAcc;
        let senderAddr;
        let proxy;
        let snapshot;

        setNetwork('mainnet');

        before(async () => {
            await resetForkToBlock(forkNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);

            await redeploy('CurveDeposit');
            await redeploy('CurveWithdraw');
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        await Promise.all(
            poolInfo
                .slice(0, testLength)
                .map(async (pool) => {
                    const poolName = pool.name;
                    it(`... should deposit then withdraw exact coins [${poolName}]`, async function () {
                        /// @dev factory pools dont implement this method
                        if (pool.isFactory) this.skip();
                        const lpMinted = await testDeposit(
                            proxy,
                            senderAddr,
                            senderAddr,
                            pool,
                            '0', // minMintAmount
                            false,
                            amountEach,
                        );
                        await testWithdraw(
                            proxy,
                            senderAddr,
                            senderAddr,
                            pool,
                            lpMinted,
                            false,
                            true,
                            `${+amountEach * 0.2}`,
                        );
                    });
                    it(`... should deposit then withdraw exact underlyingCoins [${poolName}]`, async function () {
                        /// @dev factory pools dont implement this method
                        if (pool.isFactory) this.skip();
                        /// @dev no test if no underlying
                        if (!pool.depositContract && !pool.underlyingFlag) this.skip();
                        const lpMinted = await testDeposit(
                            proxy,
                            senderAddr,
                            senderAddr,
                            pool,
                            '0', // minMintAmount
                            true,
                            amountEach,
                        );
                        await testWithdraw(
                            proxy,
                            senderAddr,
                            senderAddr,
                            pool,
                            lpMinted,
                            true,
                            true,
                            `${+amountEach * 0.2}`,
                        );
                    });
                }),
        );
    });
};

const curveGaugeDepositTest = async (testLength) => {
    describe('Curve-Gauge-Deposit', async function () {
        this.timeout(1000000);
        const amountEach = '1000';

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let curveView;

        before(async () => {
            await resetForkToBlock(forkNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            await redeploy('CurveDeposit');
            await getContractFromRegistry('CurveGaugeDeposit');
            curveView = await getContractFromRegistry('CurveView');
        });

        await Promise.all(poolInfo.slice(0, testLength).map(async (pool) => {
            const poolName = pool.name;

            it(`... should deposit LP tokens into gauge [${poolName}]`, async () => {
                const lpMinted = await testDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool,
                    '0', // minMintAmount
                    false,
                    amountEach,
                );

                await approve(pool.lpToken, proxyAddr);
                // eslint-disable-next-line max-len
                await curveGaugeDeposit(proxy, pool.gauges[0], pool.lpToken, senderAddr, proxyAddr, lpMinted);
                expect(await curveView.gaugeBalance(pool.gauges[0], proxyAddr)).to.be.gt('0');
            });
        }));
    });
};

const curveGaugeWithdrawTest = async (testLength) => {
    describe('Curve-Gauge-Withdraw', function () {
        this.timeout(1000000);
        const amountEach = '1000';

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let curveView;

        before(async () => {
            await resetForkToBlock(forkNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            await redeploy('CurveDeposit');
            await getContractFromRegistry('CurveGaugeDeposit');
            await getContractFromRegistry('CurveGaugeWithdraw');
            curveView = await getContractFromRegistry('CurveView');
        });

        poolInfo.slice(0, testLength).map(async (pool) => {
            const poolName = pool.name;

            it(`... should deposit LP tokens into gauge then withdraw [${poolName}]`, async () => {
                const lpMinted = await testDeposit(
                    proxy,
                    senderAddr,
                    senderAddr,
                    pool,
                    '0', // minMintAmount
                    false,
                    amountEach,
                );

                await approve(pool.lpToken, proxyAddr);
                // eslint-disable-next-line max-len
                await curveGaugeDeposit(proxy, pool.gauges[0], pool.lpToken, senderAddr, proxyAddr, lpMinted);
                expect(await curveView.gaugeBalance(pool.gauges[0], proxyAddr)).to.be.gt('0');

                // eslint-disable-next-line max-len
                await curveGaugeWithdraw(proxy, pool.gauges[0], pool.lpToken, senderAddr, hre.ethers.constants.MaxUint256);
                expect(await balanceOf(pool.lpToken, senderAddr)).to.be.eq(lpMinted);
            });
        });
    });
};

const curveClaimFeesTest = async () => {
    describe('Curve-Claim-Fees', function () {
        this.timeout(1000000);

        const claimFor = '0x7563839e02004d3f419ff78df4256e9c5dd713ed';
        const WEEK = 3600 * 24 * 7;
        const crv3crvToken = getAssetInfo('3Crv').address;

        let senderAcc;
        let proxy;
        let feesRewarded;

        before(async () => {
            await resetForkToBlock(forkNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            await getContractFromRegistry('CurveClaimFees');
        });

        after(async () => {
            console.log(`3Crv rewarded: ${BN2Float(feesRewarded)}`);
        });

        it('... should claim rewards', async () => {
            await timeTravel(WEEK);
            const balanceBefore = await balanceOf(crv3crvToken, claimFor);

            await curveClaimFees(proxy, claimFor, claimFor);

            feesRewarded = (await balanceOf(crv3crvToken, claimFor)).sub(balanceBefore);

            expect(feesRewarded).to.be.gt(0);
        });
    });
};

const curveStethPoolDepositTest = async () => {
    const STE_CRV_ADDR = '0x06325440D014e39736583c165C2963BA99fAf14E';

    describe('Curve-Steth-Pool-Deposit', function () {
        this.timeout(1000000);
        const ethAmount = '10';
        const ethAmountHalf = '5';

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;

        before(async () => {
            await resetForkToBlock(13000000);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            await getContractFromRegistry('CurveStethPoolDeposit');
        });

        it(`... should deposit ${ethAmount} Eth into Curve stEth pool`, async () => {
            const amount = Float2BN(ethAmount);

            await setBalance(WETH_ADDRESS, senderAddr, amount);
            await approve(WETH_ADDRESS, proxyAddr);

            const tokensBefore = await balanceOf(STE_CRV_ADDR, senderAddr);
            await curveStethPoolDeposit(
                proxy,
                senderAddr,
                senderAddr,
                [amount, '0'],
                '0',
            );

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpMinted = tokensAfter.sub(tokensBefore);

            console.log(`Minted ${BN2Float(lpMinted)} steCrv`);
            expect(lpMinted).to.be.gt('0');
        });

        it(`... should deposit ${ethAmount} stEth into Curve stEth pool`, async () => {
            const amount = Float2BN(ethAmount);

            await setBalance(STETH_ADDRESS, senderAddr, amount);
            await approve(STETH_ADDRESS, proxyAddr);

            const tokensBefore = await balanceOf(STE_CRV_ADDR, senderAddr);
            await curveStethPoolDeposit(
                proxy,
                senderAddr,
                senderAddr,
                ['0', amount],
                '0',
            );

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpMinted = tokensAfter.sub(tokensBefore);

            console.log(`Minted ${BN2Float(lpMinted)} steCrv`);
            expect(lpMinted).to.be.gt('0');
        });

        it(`... should deposit ${ethAmountHalf} stEth and ${ethAmountHalf} Eth into Curve stEth pool`, async () => {
            const amount = Float2BN(ethAmountHalf);

            await setBalance(WETH_ADDRESS, senderAddr, amount);
            await approve(WETH_ADDRESS, proxyAddr);
            await setBalance(STETH_ADDRESS, senderAddr, amount);
            await approve(STETH_ADDRESS, proxyAddr);

            const tokensBefore = await balanceOf(STE_CRV_ADDR, senderAddr);
            await curveStethPoolDeposit(
                proxy,
                senderAddr,
                senderAddr,
                [amount, amount],
                '0',
            );

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpMinted = tokensAfter.sub(tokensBefore);

            console.log(`Minted ${BN2Float(lpMinted)} steCrv`);
            expect(lpMinted).to.be.gt('0');
        });

        it('... should deposit maxUint stEth and Eth into Curve stEth pool', async () => {
            const amount = Float2BN(ethAmountHalf);

            await setBalance(WETH_ADDRESS, senderAddr, amount);
            await approve(WETH_ADDRESS, proxyAddr);
            await setBalance(STETH_ADDRESS, senderAddr, amount);
            await approve(STETH_ADDRESS, proxyAddr);

            const tokensBefore = await balanceOf(STE_CRV_ADDR, senderAddr);
            await curveStethPoolDeposit(
                proxy,
                senderAddr,
                senderAddr,
                [hre.ethers.constants.MaxUint256, hre.ethers.constants.MaxUint256],
                '0',
            );

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpMinted = tokensAfter.sub(tokensBefore);

            console.log(`Minted ${BN2Float(lpMinted)} steCrv`);
            expect(lpMinted).to.be.gt('0');
        });
    });
};

const curveStethPoolWithdrawTest = async () => {
    const STE_CRV_ADDR = '0x06325440D014e39736583c165C2963BA99fAf14E';

    describe('Curve-Steth-Pool-Withdraw', function () {
        this.timeout(1000000);
        const amount = '10';
        const amountHalf = '5';

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;

        before(async () => {
            await resetForkToBlock(13000000);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            await getContractFromRegistry('CurveStethPoolWithdraw');
        });

        it(`... should burn ${amount} steCrv and withdraw ${amount} Eth`, async () => {
            const maxBurnAmount = Float2BN(amount);

            await setBalance(STE_CRV_ADDR, senderAddr, maxBurnAmount);
            await approve(STE_CRV_ADDR, proxyAddr);

            const wethBefore = await balanceOf(WETH_ADDRESS, senderAddr);

            await curveStethPoolWithdraw(
                proxy,
                senderAddr,
                senderAddr,
                [maxBurnAmount, '0'],
                maxBurnAmount,
                0,
            );

            const wethAfter = await balanceOf(WETH_ADDRESS, senderAddr);

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpBurned = maxBurnAmount.sub(tokensAfter);
            const wethWithdrawn = wethAfter.sub(wethBefore);
            expect(+BN2Float(wethWithdrawn)).to.be.closeTo(+BN2Float(maxBurnAmount), 0.01);
            console.log(`Withdrawn ${BN2Float(wethWithdrawn)} WETH burning ${BN2Float(lpBurned)} steCrv`);
        });

        it(`... should burn ${amount} steCrv and withdraw ${amount} stEth`, async () => {
            const maxBurnAmount = Float2BN(amount);

            await setBalance(STE_CRV_ADDR, senderAddr, maxBurnAmount);
            await approve(STE_CRV_ADDR, proxyAddr);

            const stethBefore = await balanceOf(STETH_ADDRESS, senderAddr);

            await curveStethPoolWithdraw(
                proxy,
                senderAddr,
                senderAddr,
                ['0', maxBurnAmount],
                maxBurnAmount,
                0,
            );

            const stethAfter = await balanceOf(STETH_ADDRESS, senderAddr);

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpBurned = maxBurnAmount.sub(tokensAfter);
            const stethWithdrawn = stethAfter.sub(stethBefore);
            expect(+BN2Float(stethWithdrawn)).to.be.closeTo(+BN2Float(maxBurnAmount), 0.01);
            console.log(`Withdrawn ${BN2Float(stethWithdrawn)} stEth burning ${BN2Float(lpBurned)} steCrv`);
        });

        it(`... should burn ${amount} steCrv and withdraw ${amountHalf} Eth and ${amountHalf} stEth`, async () => {
            const maxBurnAmount = Float2BN(amount);
            const withdrawAmount = Float2BN(amountHalf);

            await setBalance(STE_CRV_ADDR, senderAddr, maxBurnAmount);
            await approve(STE_CRV_ADDR, proxyAddr);

            const wethBefore = await balanceOf(WETH_ADDRESS, senderAddr);
            const stethBefore = await balanceOf(STETH_ADDRESS, senderAddr);

            await curveStethPoolWithdraw(
                proxy,
                senderAddr,
                senderAddr,
                [withdrawAmount, withdrawAmount],
                maxBurnAmount,
                0,
            );

            const wethAfter = await balanceOf(WETH_ADDRESS, senderAddr);
            const stethAfter = await balanceOf(STETH_ADDRESS, senderAddr);

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpBurned = maxBurnAmount.sub(tokensAfter);
            const wethWithdrawn = wethAfter.sub(wethBefore);
            const stethWithdrawn = stethAfter.sub(stethBefore);
            expect(+BN2Float(wethWithdrawn)).to.be.closeTo(+BN2Float(withdrawAmount), 0.01);
            expect(+BN2Float(stethWithdrawn)).to.be.closeTo(+BN2Float(withdrawAmount), 0.01);
            console.log(`Withdrawn ${BN2Float(wethWithdrawn)} WETH and ${BN2Float(stethWithdrawn)} stEth burning ${BN2Float(lpBurned)} steCrv`);
        });
    });
};

const curveFullTest = async (testLength) => {
    await curveDepositTest(testLength);
    await curveWithdrawOneCoinTest(testLength);
    await curveWithdrawTest(testLength);
    await curveWithdrawExactTest(testLength);
    await curveGaugeDepositTest(testLength);
    await curveGaugeWithdrawTest(testLength);
    await curveClaimFeesTest();
};

module.exports = {
    curveFullTest,

    curveDepositTest,
    curveWithdrawTest,
    curveWithdrawOneCoinTest,
    curveWithdrawExactTest,

    curveGaugeDepositTest,
    curveGaugeWithdrawTest,
    curveClaimFeesTest,

    curveStethPoolDepositTest,
    curveStethPoolWithdrawTest,
};
