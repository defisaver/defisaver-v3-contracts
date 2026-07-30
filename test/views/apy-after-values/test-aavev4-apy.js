const { expect } = require('chai');
const hre = require('hardhat');

const { AAVE_V4_TEST_PAIRS } = require('../../utils/aaveV4');
const {
    approve,
    fetchAmountInUSDPriceByAddress,
    getOwnerAddr,
    isNetworkFork,
    redeploy,
    revertToSnapshot,
    setBalance,
    takeSnapshot,
} = require('../../utils/utils');
const { topUp } = require('../../../scripts/utils/fork');

const ZERO = hre.ethers.constants.Zero;
const BPS = hre.ethers.BigNumber.from(10000);
const MAX_UINT = hre.ethers.constants.MaxUint256;

const calcSupplyRate = (drawnRate, totalDrawn, liquidity, swept, liquidityFee) => {
    const denominator = liquidity.add(totalDrawn).add(swept);
    if (denominator.isZero() || totalDrawn.isZero()) {
        return ZERO;
    }

    return drawnRate
        .mul(totalDrawn)
        .div(denominator)
        .mul(BPS.sub(hre.ethers.BigNumber.from(liquidityFee)))
        .div(BPS);
};

const stateFromEstimation = (rateEstimation) => ({
    drawnRate: rateEstimation.hubDrawnRateEstimation,
    supplyRate: calcSupplyRate(
        rateEstimation.hubDrawnRateEstimation,
        rateEstimation.hubTotalDrawnEstimation,
        rateEstimation.hubTotalLiquidityEstimation,
        rateEstimation.hubSwept,
        rateEstimation.liquidityFee,
    ),
});

const getActualRateState = async (aaveV4ViewContract, spokeAddr, reserveId) => {
    const reserve = await (
        await hre.ethers.getContractAt('ISpoke', spokeAddr)
    ).getReserve(reserveId);
    const hubData = await aaveV4ViewContract.getHubAssetData(reserve.hub, reserve.assetId);

    return {
        drawnRate: hubData.drawnRate,
        supplyRate: calcSupplyRate(
            hubData.drawnRate,
            hubData.totalDrawn,
            hubData.liquidity,
            hubData.swept,
            hubData.liquidityFee,
        ),
    };
};

const getCapHeadroom = (cap, used) => {
    if (cap.eq(MAX_UINT)) {
        return MAX_UINT;
    }
    return cap.gt(used) ? cap.sub(used) : ZERO;
};

const fitAmountToHeadroom = (amount, headroom) => {
    if (headroom.eq(MAX_UINT)) {
        return amount;
    }
    return amount.gt(headroom.div(2)) ? headroom.div(2) : amount;
};

const getPairContext = async (aaveV4ViewContract, pair) => {
    const spoke = await hre.ethers.getContractAt('ISpoke', pair.spoke);
    const collReserveData = await aaveV4ViewContract.getReserveDataFull(
        pair.spoke,
        pair.collReserveId,
    );
    const debtReserveData = await aaveV4ViewContract.getReserveDataFull(
        pair.spoke,
        pair.debtReserveId,
    );
    const collHubData = await aaveV4ViewContract.getHubAssetData(
        collReserveData.hub,
        collReserveData.assetId,
    );
    const debtHubData = await aaveV4ViewContract.getHubAssetData(
        debtReserveData.hub,
        debtReserveData.assetId,
    );

    let skipReason;
    if (collReserveData.paused || collReserveData.frozen) {
        skipReason = 'Collateral reserve is paused or frozen';
    } else if (hre.ethers.BigNumber.from(collReserveData.collateralFactor).isZero()) {
        skipReason = 'Collateral reserve has zero collateral factor';
    } else if (debtReserveData.paused || debtReserveData.frozen || !debtReserveData.borrowable) {
        skipReason = 'Debt reserve is paused, frozen or not borrowable';
    } else if (debtHubData.liquidity.isZero()) {
        skipReason = 'Debt reserve has zero hub liquidity';
    }

    return {
        spoke,
        collReserveId: pair.collReserveId,
        debtReserveId: pair.debtReserveId,
        collReserveData,
        debtReserveData,
        collHubData,
        debtHubData,
        skipReason,
    };
};

const getOperationAmounts = async (
    collReserveData,
    debtReserveData,
    debtHubData,
    collAmountUsd,
    debtAmountUsd,
) => {
    let supplyAmount = await fetchAmountInUSDPriceByAddress(
        collReserveData.underlying,
        collReserveData.decimals,
        collAmountUsd,
    );
    let borrowAmount = await fetchAmountInUSDPriceByAddress(
        debtReserveData.underlying,
        debtReserveData.decimals,
        debtAmountUsd,
    );

    const supplyHeadroom = getCapHeadroom(collReserveData.supplyCap, collReserveData.totalSupplied);
    const borrowHeadroom = getCapHeadroom(debtReserveData.borrowCap, debtReserveData.totalDebt);

    supplyAmount = fitAmountToHeadroom(supplyAmount, supplyHeadroom);
    borrowAmount = fitAmountToHeadroom(borrowAmount, borrowHeadroom);
    borrowAmount = fitAmountToHeadroom(borrowAmount, debtHubData.liquidity);

    return { supplyAmount, borrowAmount };
};

const executeSpokeCalls = async (spoke, signer, calls) => {
    const encodedCalls = calls.map(({ name, args }) =>
        spoke.interface.encodeFunctionData(name, args),
    );

    await spoke.connect(signer).multicall(encodedCalls);
};

const seedAaveV4Position = async (ctx, signer, supplyAmount, borrowAmount) => {
    await setBalance(ctx.collReserveData.underlying, signer.address, supplyAmount);
    await approve(ctx.collReserveData.underlying, ctx.spoke.address, signer);

    await executeSpokeCalls(ctx.spoke, signer, [
        {
            name: 'supply',
            args: [ctx.collReserveId, supplyAmount, signer.address],
        },
        {
            name: 'setUsingAsCollateral',
            args: [ctx.collReserveId, true, signer.address],
        },
        {
            name: 'borrow',
            args: [ctx.debtReserveId, borrowAmount, signer.address],
        },
    ]);
};

const assertRateStateClose = (estimatedState, actualState, precision) => {
    console.log('============ START LOGGING RATES ============');
    console.log('DRAWN RATE');
    console.log('estimatedState.drawnRate', estimatedState.drawnRate.toString());
    console.log('actualState.drawnRate', actualState.drawnRate.toString());
    console.log('---------');
    console.log('SUPPLY RATE');
    console.log('estimatedState.supplyRate', estimatedState.supplyRate.toString());
    console.log('actualState.supplyRate', actualState.supplyRate.toString());
    console.log('============ END LOGGING RATES ============');
    console.log('\n\n');
    expect(estimatedState.drawnRate).to.be.closeTo(actualState.drawnRate, precision);
    expect(estimatedState.supplyRate).to.be.closeTo(actualState.supplyRate, precision);
};

const aaveV4ApyAfterValuesTest = (isFork) => {
    describe('AaveV4-apy-after-values', () => {
        let senderAcc;
        let snapshotId;
        let aaveV4ViewContract;

        before(async () => {
            [senderAcc] = await hre.ethers.getSigners();
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
            }
            aaveV4ViewContract = await redeploy('AaveV4View', isFork);
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        for (let i = 0; i < AAVE_V4_TEST_PAIRS.length; ++i) {
            const pair = AAVE_V4_TEST_PAIRS[i];

            it(`... should estimate rates when opening ${pair.collSymbol}/${pair.debtSymbol}`, async function () {
                const ctx = await getPairContext(aaveV4ViewContract, pair);
                if (ctx.skipReason) {
                    console.log(`${ctx.skipReason}. Skipping test`);
                    this.skip();
                }

                const { supplyAmount, borrowAmount } = await getOperationAmounts(
                    ctx.collReserveData,
                    ctx.debtReserveData,
                    ctx.debtHubData,
                    '500000',
                    '200000',
                );
                if (supplyAmount.isZero() || borrowAmount.isZero()) {
                    console.log(
                        'Operation amount is zero after live liquidity/cap checks. Skipping test',
                    );
                    this.skip();
                }

                const paybackAmount = borrowAmount.div(4);
                const estimatedRates =
                    await aaveV4ViewContract.callStatic.getApyAfterValuesEstimation(pair.spoke, [
                        {
                            reserveId: pair.collReserveId,
                            liquidityAdded: supplyAmount,
                            liquidityTaken: '0',
                            isDebtAsset: false,
                        },
                        {
                            reserveId: pair.debtReserveId,
                            liquidityAdded: paybackAmount,
                            liquidityTaken: borrowAmount,
                            isDebtAsset: true,
                        },
                    ]);
                const estimatedCollState = stateFromEstimation(estimatedRates[0]);
                const estimatedDebtState = stateFromEstimation(estimatedRates[1]);

                await setBalance(ctx.collReserveData.underlying, senderAcc.address, supplyAmount);
                await approve(ctx.collReserveData.underlying, pair.spoke, senderAcc);
                await approve(ctx.debtReserveData.underlying, pair.spoke, senderAcc);

                await executeSpokeCalls(ctx.spoke, senderAcc, [
                    {
                        name: 'supply',
                        args: [pair.collReserveId, supplyAmount, senderAcc.address],
                    },
                    {
                        name: 'setUsingAsCollateral',
                        args: [pair.collReserveId, true, senderAcc.address],
                    },
                    {
                        name: 'borrow',
                        args: [pair.debtReserveId, borrowAmount, senderAcc.address],
                    },
                    {
                        name: 'repay',
                        args: [pair.debtReserveId, paybackAmount, senderAcc.address],
                    },
                ]);

                const actualCollState = await getActualRateState(
                    aaveV4ViewContract,
                    pair.spoke,
                    pair.collReserveId,
                );
                const actualDebtState = await getActualRateState(
                    aaveV4ViewContract,
                    pair.spoke,
                    pair.debtReserveId,
                );

                const precision = hre.ethers.BigNumber.from(10).pow(27 - 7);
                assertRateStateClose(estimatedCollState, actualCollState, precision);
                assertRateStateClose(estimatedDebtState, actualDebtState, precision);
            });

            it(`... should estimate rates when reducing ${pair.collSymbol}/${pair.debtSymbol}`, async function () {
                const ctx = await getPairContext(aaveV4ViewContract, pair);
                if (ctx.skipReason) {
                    console.log(`${ctx.skipReason}. Skipping test`);
                    this.skip();
                }

                const { supplyAmount, borrowAmount } = await getOperationAmounts(
                    ctx.collReserveData,
                    ctx.debtReserveData,
                    ctx.debtHubData,
                    '600000',
                    '180000',
                );
                if (supplyAmount.isZero() || borrowAmount.isZero()) {
                    console.log(
                        'Operation amount is zero after live liquidity/cap checks. Skipping test',
                    );
                    this.skip();
                }

                await seedAaveV4Position(ctx, senderAcc, supplyAmount, borrowAmount);

                const withdrawAmount = supplyAmount.div(5);
                const paybackAmount = borrowAmount.div(4);
                const estimatedRates =
                    await aaveV4ViewContract.callStatic.getApyAfterValuesEstimation(pair.spoke, [
                        {
                            reserveId: pair.collReserveId,
                            liquidityAdded: '0',
                            liquidityTaken: withdrawAmount,
                            isDebtAsset: false,
                        },
                        {
                            reserveId: pair.debtReserveId,
                            liquidityAdded: paybackAmount,
                            liquidityTaken: '0',
                            isDebtAsset: true,
                        },
                    ]);
                const estimatedCollState = stateFromEstimation(estimatedRates[0]);
                const estimatedDebtState = stateFromEstimation(estimatedRates[1]);

                await approve(ctx.debtReserveData.underlying, pair.spoke, senderAcc);
                await executeSpokeCalls(ctx.spoke, senderAcc, [
                    {
                        name: 'repay',
                        args: [pair.debtReserveId, paybackAmount, senderAcc.address],
                    },
                    {
                        name: 'withdraw',
                        args: [pair.collReserveId, withdrawAmount, senderAcc.address],
                    },
                ]);

                const actualCollState = await getActualRateState(
                    aaveV4ViewContract,
                    pair.spoke,
                    pair.collReserveId,
                );
                const actualDebtState = await getActualRateState(
                    aaveV4ViewContract,
                    pair.spoke,
                    pair.debtReserveId,
                );

                const precision = hre.ethers.BigNumber.from(10).pow(27 - 7);
                assertRateStateClose(estimatedCollState, actualCollState, precision);
                assertRateStateClose(estimatedDebtState, actualDebtState, precision);
            });
        }
    });
};

aaveV4ApyAfterValuesTest(isNetworkFork());

module.exports = {
    aaveV4ApyAfterValuesTest,
};
