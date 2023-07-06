/* eslint-disable array-callback-return */
/* eslint-disable max-len */
const { ethers } = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');

const { utils: { curveusdUtils: { curveusdMarkets, controllerFactoryAddress } } } = require('@defisaver/sdk');
const {
    getContractFromRegistry,
    getProxy,
    approve,
    setBalance,
    balanceOf,
    nullAddress,
    resetForkToBlock,
    takeSnapshot,
    revertToSnapshot,
    addrs,
    formatExchangeObjCurve,
    redeploy,
    fetchAmountinUSDPrice,
    STETH_ADDRESS,
} = require('../utils');

const {
    curveUsdCreate,
    curveUsdSupply,
    curveUsdWithdraw,
    curveUsdBorrow,
    curveUsdPayback,
    curveUsdRepay,
    curveUsdSelfLiquidate,
    curveUsdSelfLiquidateWithColl,
    curveUsdLevCreate,
} = require('../actions');

const crvusdAddress = getAssetInfo('crvUSD').address;

const debtCeilCheck = async (controllerAddress) => {
    const ceiling = await ethers.getContractAt('ICrvUsdControllerFactory', controllerFactoryAddress).then((c) => c.debt_ceiling(controllerAddress));
    const debt = await ethers.getContractAt('ICrvUsdController', controllerAddress).then((c) => c.total_debt());

    expect(ceiling).to.be.gt(debt.add(ethers.utils.parseUnits('100000')), 'debt ceiling exceeded');
};

const getUserInfo = async (controllerAddress, user) => {
    const llammaAddress = await ethers.getContractAt('ICrvUsdController', controllerAddress).then((c) => c.amm());
    const [, collateral] = await ethers.getContractAt('ILLAMMA', llammaAddress).then((c) => c.get_sum_xy(user));
    const debt = await ethers.getContractAt('ICrvUsdController', controllerAddress).then((c) => c.debt(user));

    return { collateral, debt };
};

const getActiveBand = async (controllerAddress) => {
    const llammaAddress = await ethers.getContractAt('ICrvUsdController', controllerAddress).then((c) => c.amm());
    const activeBand = await ethers.getContractAt('ILLAMMA', llammaAddress).then((c) => c.active_band_with_skip());

    return activeBand;
};

const testCreate = async ({
    proxy,
    collateralAsset,
    controllerAddress,
    from,
    to,
    collateralAmount,
    debtAmount,
    nBands,
}) => {
    const crvusdBefore = await balanceOf(crvusdAddress, to);

    const expectedCollateral = collateralAmount === ethers.constants.MaxUint256 ? await balanceOf(collateralAsset, from) : collateralAmount;
    const expectedDebt = debtAmount === ethers.constants.MaxUint256
        ? await ethers.getContractAt('ICrvUsdController', controllerAddress).then((c) => c.max_borrowable(expectedCollateral, nBands))
        : debtAmount;

    await approve(collateralAsset, proxy.address);
    const { approveObj: { owner, asset } } = await curveUsdCreate(
        proxy,
        controllerAddress,
        from,
        to,
        collateralAmount,
        debtAmount,
        nBands,
    );

    expect(owner).to.be.eq(from);
    expect(asset).to.be.eq(collateralAsset);

    const crvUsdAfter = await balanceOf(crvusdAddress, to);
    expect(crvusdBefore.add(expectedDebt))
        .to.be.closeTo(crvUsdAfter, crvUsdAfter.div(1e6));

    const { collateral, debt } = await getUserInfo(controllerAddress, proxy.address);
    expect(collateral).to.be.closeTo(expectedCollateral, expectedCollateral.div(1e6));
    expect(debt).to.be.closeTo(expectedDebt, expectedDebt.div(1e6));

    return { collateral, debt };
};

const curveUsdCreateTest = () => describe('CurveUsd-Create', () => {
    Object.entries(curveusdMarkets).slice(0, 1)
        .map(([assetSymbol, { controllerAddress, debtAvailableBlock }]) => {
            let snapshot;
            let senderAcc;
            let proxy;
            const collateralAsset = getAssetInfo(assetSymbol).address;
            it(`... should test create for ${assetSymbol} market`, async () => {
                await resetForkToBlock(debtAvailableBlock);
                await debtCeilCheck(controllerAddress);
                await getContractFromRegistry('CurveUsdCreate');

                [senderAcc] = await ethers.getSigners();
                proxy = await getProxy(senderAcc.address);

                snapshot = await takeSnapshot();

                const collateralAmount = ethers.utils.parseUnits('10');
                const debtAmount = ethers.utils.parseUnits('2000');
                const nBands = 5;

                await setBalance(collateralAsset, senderAcc.address, collateralAmount);
                await testCreate({
                    proxy,
                    collateralAsset: getAssetInfo(assetSymbol).address,
                    controllerAddress,
                    from: senderAcc.address,
                    to: senderAcc.address,
                    collateralAmount,
                    debtAmount,
                    nBands,
                });
            });

            it(`... should test create collateral=maxUint debt=maxUint for ${assetSymbol} market`, async () => {
                await revertToSnapshot(snapshot);

                snapshot = await takeSnapshot();

                const collateralAmount = ethers.utils.parseUnits('10');
                const nBands = 5;

                await setBalance(collateralAsset, senderAcc.address, collateralAmount);
                await testCreate({
                    proxy,
                    collateralAsset: getAssetInfo(assetSymbol).address,
                    controllerAddress,
                    from: senderAcc.address,
                    to: senderAcc.address,
                    collateralAmount: ethers.constants.MaxUint256,
                    debtAmount: ethers.constants.MaxUint256,
                    nBands,
                });
            });

            it(`... should test leverage create for ${assetSymbol} market`, async () => {
                await revertToSnapshot(snapshot);

                await redeploy('CurveUsdSwapper');
                await redeploy('CurveUsdLevCreate');
                await redeploy('CurveUsdPayback');

                const collateralAmount = ethers.utils.parseUnits('3');
                const debtAmount = '1000';
                const debtAmountWei = ethers.utils.parseUnits(debtAmount);

                const nBands = 5;

                await setBalance(collateralAsset, senderAcc.address, collateralAmount);
                await approve(collateralAsset, proxy.address);

                const exchangeObj = await formatExchangeObjCurve(crvusdAddress, getAssetInfo(assetSymbol).address, collateralAmount, addrs.mainnet.CURVE_USD_WRAPPER);

                await curveUsdLevCreate(
                    proxy,
                    controllerAddress,
                    collateralAmount,
                    debtAmountWei,
                    1, // minAmount
                    nBands,
                    senderAcc.address,
                    exchangeObj[8], // additional data
                    0, // gasUsed
                    400, // dfsFeeDivider
                    false, // do we want to unwrap wsteth
                );

                const { collateral, debt } = await getUserInfo(controllerAddress, proxy.address);

                expect(debt).to.be.eq(debtAmountWei);
                expect(collateral).to.be.gt(collateralAmount);

                if (assetSymbol === 'wstETH') {
                    await resetForkToBlock(debtAvailableBlock);

                    await setBalance(collateralAsset, senderAcc.address, collateralAmount);
                    await approve(collateralAsset, proxy.address);

                    console.log('Test steth wrapping while create');

                    const exchangeObjSteth = await formatExchangeObjCurve(
                        crvusdAddress,
                        STETH_ADDRESS,
                        collateralAmount,
                        addrs.mainnet.CURVE_USD_WRAPPER,
                    );

                    await curveUsdLevCreate(
                        proxy,
                        controllerAddress,
                        collateralAmount,
                        debtAmountWei,
                        1, // minAmount
                        nBands,
                        senderAcc.address,
                        exchangeObjSteth[8], // additional data
                        0, // gasUsed
                        400, // dfsFeeDivider
                        true, // do we want to unwrap wsteth
                    );

                    const userPos = await getUserInfo(controllerAddress, proxy.address);

                    console.log('userPos', userPos);

                    expect(userPos.debt).to.be.eq(debtAmountWei);
                    expect(userPos.collateral).to.be.gt(collateralAmount);
                }
            });
        });
});

const curveUsdSupplyTest = () => describe('CurveUsd-Supply', () => {
    Object.entries(curveusdMarkets)
        .map(([assetSymbol, { controllerAddress, debtAvailableBlock }]) => {
            let snapshot;
            let senderAcc;
            let proxy;
            let collateralBefore;

            const collateralAmount = ethers.utils.parseUnits('10');
            const debtAmount = ethers.utils.parseUnits('2000');
            const nBands = 5;
            const collateralAsset = getAssetInfo(assetSymbol).address;

            it(`... should test supply for ${assetSymbol} market`, async () => {
                await resetForkToBlock(debtAvailableBlock);
                await debtCeilCheck(controllerAddress);
                await getContractFromRegistry('CurveUsdCreate');
                await getContractFromRegistry('CurveUsdSupply');

                [senderAcc] = await ethers.getSigners();
                proxy = await getProxy(senderAcc.address);

                await setBalance(collateralAsset, senderAcc.address, collateralAmount);
                ({ collateral: collateralBefore } = await testCreate({
                    proxy,
                    collateralAsset: getAssetInfo(assetSymbol).address,
                    controllerAddress,
                    from: senderAcc.address,
                    to: senderAcc.address,
                    collateralAmount,
                    debtAmount,
                    nBands,
                }));

                snapshot = await takeSnapshot();

                const from = senderAcc.address;
                const onBehalfOf = nullAddress;

                await setBalance(collateralAsset, senderAcc.address, collateralAmount);
                await approve(collateralAsset, proxy.address);

                const { approveObj: { owner, asset } } = await curveUsdSupply(
                    proxy,
                    controllerAddress,
                    from,
                    onBehalfOf,
                    collateralAmount,
                );
                expect(owner).to.be.eq(from);
                expect(asset).to.be.eq(collateralAsset);

                const { collateral } = await getUserInfo(controllerAddress, proxy.address);
                expect(collateralBefore.add(collateralAmount)).to.be.eq(collateral);
            });

            it(`... should test supply maxUint for ${assetSymbol} market`, async () => {
                await revertToSnapshot(snapshot);

                const from = senderAcc.address;
                const onBehalfOf = nullAddress;

                await setBalance(collateralAsset, senderAcc.address, collateralAmount);
                await approve(collateralAsset, proxy.address);

                await curveUsdSupply(
                    proxy,
                    controllerAddress,
                    from,
                    onBehalfOf,
                    ethers.constants.MaxUint256,
                );

                const { collateral } = await getUserInfo(controllerAddress, proxy.address);
                expect(collateralBefore.add(collateralAmount)).to.be.eq(collateral);
            });
        });
});

const curveUsdWithdrawTest = () => describe('CurveUsd-Withdraw', () => {
    Object.entries(curveusdMarkets)
        .map(([assetSymbol, { controllerAddress, debtAvailableBlock }]) => {
            let snapshot;
            let senderAcc;
            let proxy;
            let balanceBefore;

            const collateralAsset = getAssetInfo(assetSymbol).address;

            it(`... should test withdraw for ${assetSymbol} market`, async () => {
                await resetForkToBlock(debtAvailableBlock);
                await debtCeilCheck(controllerAddress);
                await getContractFromRegistry('CurveUsdCreate');
                await getContractFromRegistry('CurveUsdPayback');
                await getContractFromRegistry('CurveUsdWithdraw');

                [senderAcc] = await ethers.getSigners();
                proxy = await getProxy(senderAcc.address);

                {
                    const collateralAmount = ethers.utils.parseUnits('10');
                    const debtAmount = ethers.utils.parseUnits('2000');
                    const nBands = 5;

                    await setBalance(collateralAsset, senderAcc.address, collateralAmount);
                    await testCreate({
                        proxy,
                        collateralAsset: getAssetInfo(assetSymbol).address,
                        controllerAddress,
                        from: senderAcc.address,
                        to: senderAcc.address,
                        collateralAmount,
                        debtAmount,
                        nBands,
                    });

                    balanceBefore = await balanceOf(collateralAsset, senderAcc.address);
                    snapshot = await takeSnapshot();
                }

                {
                    const to = senderAcc.address;
                    const collateralAmount = ethers.utils.parseUnits('2');

                    await curveUsdWithdraw(
                        proxy,
                        controllerAddress,
                        to,
                        collateralAmount,
                    );

                    expect(balanceBefore.add(collateralAmount))
                        .to.be.eq(await balanceOf(collateralAsset, senderAcc.address));
                }
            });

            it(`... should test withdraw maxUint for ${assetSymbol} market`, async () => {
                await revertToSnapshot(snapshot);

                {
                    const to = senderAcc.address;
                    let expectedCollateral;

                    {
                        const controller = await ethers.getContractAt('ICrvUsdController', controllerAddress);
                        const llamma = await ethers.getContractAt('ILLAMMA', controller.amm());

                        const [, collateral] = await llamma.get_sum_xy(proxy.address);
                        const debt = await controller.debt(proxy.address);
                        const ticks = await llamma.read_user_tick_numbers(proxy.address);
                        const nBands = ticks[1] - ticks[0] + 1;

                        expectedCollateral = await controller.min_collateral(debt, nBands).then((minColl) => collateral.sub(minColl));
                    }

                    await curveUsdWithdraw(
                        proxy,
                        controllerAddress,
                        to,
                        ethers.constants.MaxUint256,
                    );

                    expect(balanceBefore.add(expectedCollateral))
                        .to.be.eq(await balanceOf(collateralAsset, senderAcc.address));
                }
            });
        });
});

const curveUsdBorrowTest = () => describe('CurveUsd-Borrow', () => {
    Object.entries(curveusdMarkets)
        .map(([assetSymbol, { controllerAddress, debtAvailableBlock }]) => {
            let snapshot;
            let senderAcc;
            let proxy;
            let stablecoinBalanceBefore;

            const collateralAsset = getAssetInfo(assetSymbol).address;

            it(`... should test borrow for ${assetSymbol} market`, async () => {
                await resetForkToBlock(debtAvailableBlock);
                await debtCeilCheck(controllerAddress);
                await getContractFromRegistry('CurveUsdCreate');
                await getContractFromRegistry('CurveUsdBorrow');

                [senderAcc] = await ethers.getSigners();
                proxy = await getProxy(senderAcc.address);

                {
                    const crvusdBefore = await balanceOf(crvusdAddress, senderAcc.address);

                    const from = senderAcc.address;
                    const to = senderAcc.address;
                    const collateralAmount = ethers.utils.parseUnits('10');
                    const debtAmount = ethers.utils.parseUnits('2000');
                    const nBands = 5;

                    await setBalance(collateralAsset, senderAcc.address, collateralAmount);
                    await approve(collateralAsset, proxy.address);
                    await curveUsdCreate(
                        proxy,
                        controllerAddress,
                        from,
                        to,
                        collateralAmount,
                        debtAmount,
                        nBands,
                    );

                    expect(await balanceOf(crvusdAddress, senderAcc.address))
                        .to.be.eq(crvusdBefore.add(debtAmount));

                    const { collateral, debt } = await getUserInfo(controllerAddress, proxy.address);
                    expect(collateral).to.be.eq(collateralAmount);
                    expect(debt).to.be.eq(debtAmount);

                    stablecoinBalanceBefore = await balanceOf(crvusdAddress, senderAcc.address);
                    snapshot = await takeSnapshot();
                }

                {
                    const to = senderAcc.address;
                    const debtAmount = ethers.utils.parseUnits('1000');

                    await curveUsdBorrow(
                        proxy,
                        controllerAddress,
                        to,
                        debtAmount,
                    );

                    expect(stablecoinBalanceBefore.add(debtAmount))
                        .to.be.eq(await balanceOf(crvusdAddress, senderAcc.address));
                }
            });

            it(`... should test borrow maxUint for ${assetSymbol} market`, async () => {
                await revertToSnapshot(snapshot);

                let expectedDebt;
                {
                    const to = senderAcc.address;

                    {
                        const controller = await ethers.getContractAt('ICrvUsdController', controllerAddress);
                        const llamma = await ethers.getContractAt('ILLAMMA', controller.amm());

                        const [, collateral] = await llamma.get_sum_xy(proxy.address);
                        const debt = await controller.debt(proxy.address);
                        const ticks = await llamma.read_user_tick_numbers(proxy.address);
                        const nBands = ticks[1] - ticks[0] + 1;

                        expectedDebt = await controller.max_borrowable(collateral, nBands).then((maxDebt) => maxDebt.sub(debt));
                    }

                    await curveUsdBorrow(
                        proxy,
                        controllerAddress,
                        to,
                        ethers.constants.MaxUint256,
                    );

                    const crvUsdAfter = await balanceOf(crvusdAddress, senderAcc.address);
                    expect(stablecoinBalanceBefore.add(expectedDebt))
                        .to.be.closeTo(crvUsdAfter, crvUsdAfter.div(1e6));
                }
            });
        });
});

const curveUsdPaybackTest = () => describe('CurveUsd-Payback', () => {
    Object.entries(curveusdMarkets)
        .map(([assetSymbol, { controllerAddress, debtAvailableBlock }]) => {
            let snapshot;
            let senderAcc;
            let proxy;
            let debtBefore;
            it(`... should test payback for ${assetSymbol} market`, async () => {
                await resetForkToBlock(debtAvailableBlock);
                await debtCeilCheck(controllerAddress);
                await getContractFromRegistry('CurveUsdCreate');
                await getContractFromRegistry('CurveUsdPayback');

                [senderAcc] = await ethers.getSigners();
                proxy = await getProxy(senderAcc.address);

                const collateralAsset = getAssetInfo(assetSymbol).address;
                {
                    const crvusdBefore = await balanceOf(crvusdAddress, senderAcc.address);

                    const from = senderAcc.address;
                    const to = senderAcc.address;
                    const collateralAmount = ethers.utils.parseUnits('10');
                    const debtAmount = ethers.utils.parseUnits('2000');
                    const nBands = 5;

                    await setBalance(collateralAsset, senderAcc.address, collateralAmount);
                    await approve(collateralAsset, proxy.address);
                    await curveUsdCreate(
                        proxy,
                        controllerAddress,
                        from,
                        to,
                        collateralAmount,
                        debtAmount,
                        nBands,
                    );

                    expect(await balanceOf(crvusdAddress, senderAcc.address))
                        .to.be.eq(crvusdBefore.add(debtAmount));

                    const { collateral, debt } = await getUserInfo(controllerAddress, proxy.address);
                    expect(collateral).to.be.eq(collateralAmount);
                    expect(debt).to.be.eq(debtAmount);

                    debtBefore = debt;
                    snapshot = await takeSnapshot();
                }

                {
                    const from = senderAcc.address;
                    const onBehalfOf = nullAddress;
                    const to = senderAcc.address;
                    const debtAmount = ethers.utils.parseUnits('1000');
                    const maxActiveBand = await getActiveBand(controllerAddress);

                    await approve(crvusdAddress, proxy.address);
                    const { approveObj: { owner, asset } } = await curveUsdPayback(
                        proxy,
                        controllerAddress,
                        from,
                        onBehalfOf,
                        to,
                        debtAmount,
                        maxActiveBand,
                    );
                    expect(owner).to.be.eq(from);
                    expect(asset).to.be.eq(crvusdAddress);

                    const { debt } = await getUserInfo(controllerAddress, proxy.address);
                    expect(debt.add(debtAmount))
                        .to.be.closeTo(debtBefore, debtBefore.mul(999_999).div(1_000_000));
                }
            });

            it(`... should test payback uintMax for ${assetSymbol} market`, async () => {
                await revertToSnapshot(snapshot);

                {
                    await setBalance(crvusdAddress, senderAcc.address, debtBefore.mul(101).div(100));
                    const from = senderAcc.address;
                    const onBehalfOf = nullAddress;
                    const to = senderAcc.address;
                    const debtAmount = ethers.constants.MaxUint256;
                    const maxActiveBand = await getActiveBand(controllerAddress);

                    await approve(crvusdAddress, proxy.address);
                    await curveUsdPayback(
                        proxy,
                        controllerAddress,
                        from,
                        onBehalfOf,
                        to,
                        debtAmount,
                        maxActiveBand,
                    );

                    const { debt } = await getUserInfo(controllerAddress, proxy.address);
                    expect(debt).to.be.eq(0);
                }
            });
        });
});

const curveUsdRepayTest = () => describe('CurveUsd-Repay', () => {
    Object.entries(curveusdMarkets)
        .map(([assetSymbol, { controllerAddress, debtAvailableBlock }]) => {
            let snapshot;
            let senderAcc;
            let proxy;
            let collateralAmount;
            const collateralAsset = getAssetInfo(assetSymbol);

            it('Create new curve position to be repaid', async () => {
                await resetForkToBlock(debtAvailableBlock);
                await debtCeilCheck(controllerAddress);

                await redeploy('CurveUsdCreate');
                await redeploy('CurveUsdWithdraw');
                await redeploy('CurveUsdPayback');
                await redeploy('CurveUsdRepay');
                await redeploy('CurveUsdSwapper');

                [senderAcc] = await ethers.getSigners();
                proxy = await getProxy(senderAcc.address);

                collateralAmount = ethers.utils.parseUnits(fetchAmountinUSDPrice(assetSymbol, '50000'), collateralAsset.decimals);
                const debtAmount = ethers.utils.parseUnits('10000');
                const nBands = 4;

                await setBalance(collateralAsset.address, senderAcc.address, collateralAmount);
                await testCreate({
                    proxy,
                    collateralAsset: collateralAsset.address,
                    controllerAddress,
                    from: senderAcc.address,
                    to: senderAcc.address,
                    collateralAmount,
                    debtAmount,
                    nBands,
                });

                snapshot = await takeSnapshot();
            });

            it(`... should test partial repay for ${assetSymbol} position`, async () => {
                const collAmountRepay = fetchAmountinUSDPrice(assetSymbol, '5000');

                const collAmountRepayWei = ethers.utils.parseUnits(collAmountRepay, collateralAsset.decimals);

                const exchangeObj = await formatExchangeObjCurve(
                    collateralAsset.address,
                    crvusdAddress,
                    collAmountRepay,
                    addrs.mainnet.CURVE_USD_WRAPPER,
                );

                const userInfoBefore = await getUserInfo(controllerAddress, proxy.address);

                await curveUsdRepay(
                    proxy,
                    controllerAddress,
                    collAmountRepayWei,
                    senderAcc.address,
                    1, // minAmount
                    exchangeObj[8],
                    0, // gasUsed
                    400, // dfsFeeDivider
                    false, // do we want to unwrap wsteth
                );

                const userInfoAfter = await getUserInfo(controllerAddress, proxy.address);

                expect(userInfoAfter.collateral).to.be.lt(userInfoBefore.collateral);
                expect(userInfoAfter.debt).to.be.lt(userInfoBefore.debt);

                await revertToSnapshot(snapshot);

                if (assetSymbol === 'wstETH') {
                    console.log('Test wsteth unwrap in repay as well');

                    const exchangeObjSteth = await formatExchangeObjCurve(
                        STETH_ADDRESS,
                        crvusdAddress,
                        collAmountRepay,
                        addrs.mainnet.CURVE_USD_WRAPPER,
                    );

                    const userInfoBeforeSteth = await getUserInfo(controllerAddress, proxy.address);

                    await curveUsdRepay(
                        proxy,
                        controllerAddress,
                        collAmountRepayWei,
                        senderAcc.address,
                        1, // minAmount
                        exchangeObjSteth[8],
                        0, // gasUsed
                        400, // dfsFeeDivider
                        true, // do we want to unwrap wsteth
                    );

                    const userInfoAfterSteth = await getUserInfo(controllerAddress, proxy.address);

                    expect(userInfoAfterSteth.collateral).to.be.lt(userInfoBeforeSteth.collateral);
                    expect(userInfoAfterSteth.debt).to.be.lt(userInfoBeforeSteth.debt);

                    await revertToSnapshot(snapshot);
                }
            });

            it(`... should test full repay for ${assetSymbol} position`, async () => {
                const collAmountRepay = fetchAmountinUSDPrice(assetSymbol, '20000');

                const collAmountRepayWei = ethers.utils.parseUnits(collAmountRepay, collateralAsset.decimals);

                console.log('collAmountRepayWei', collAmountRepayWei.toString());

                const exchangeObj = await formatExchangeObjCurve(
                    collateralAsset.address,
                    crvusdAddress,
                    collAmountRepay,
                    addrs.mainnet.CURVE_USD_WRAPPER,
                );

                const userBalanceBefore = await balanceOf(collateralAsset.address, senderAcc.address);
                const userCrvUsdBalanceBefore = await balanceOf(crvusdAddress, senderAcc.address);

                await curveUsdRepay(
                    proxy,
                    controllerAddress,
                    collAmountRepayWei,
                    senderAcc.address,
                    1, // minAmount
                    exchangeObj[8],
                    0, // gasUsed
                    400, // dfsFeeDivider
                    false, // do we want to unwrap wsteth
                );

                const userBalanceAfter = await balanceOf(collateralAsset.address, senderAcc.address);
                const userCrvUsdBalanceAfter = await balanceOf(crvusdAddress, senderAcc.address);

                const userInfoAfter = await getUserInfo(controllerAddress, proxy.address);
                expect(userInfoAfter.debt).to.be.eq(0);

                expect(userBalanceAfter).to.be.gt(userBalanceBefore);
                expect(userCrvUsdBalanceAfter).to.be.gt(userCrvUsdBalanceBefore);

                if (assetSymbol === 'wstETH') {
                    console.log('Test wsteth unwrap in repay as well');

                    const debtAmount = ethers.utils.parseUnits('10000');
                    const nBands = 4;

                    await setBalance(collateralAsset.address, senderAcc.address, collateralAmount);
                    await testCreate({
                        proxy,
                        collateralAsset: collateralAsset.address,
                        controllerAddress,
                        from: senderAcc.address,
                        to: senderAcc.address,
                        collateralAmount,
                        debtAmount,
                        nBands,
                    });

                    const exchangeObjSteth = await formatExchangeObjCurve(
                        STETH_ADDRESS,
                        crvusdAddress,
                        collAmountRepay,
                        addrs.mainnet.CURVE_USD_WRAPPER,
                    );

                    const userInfoBeforeSteth = await getUserInfo(controllerAddress, proxy.address);

                    await curveUsdRepay(
                        proxy,
                        controllerAddress,
                        collAmountRepayWei,
                        senderAcc.address,
                        1, // minAmount
                        exchangeObjSteth[8],
                        0, // gasUsed
                        400, // dfsFeeDivider
                        true, // do we want to unwrap wsteth
                    );

                    const userInfoAfterSteth = await getUserInfo(controllerAddress, proxy.address);

                    expect(userInfoAfterSteth.collateral).to.be.lt(userInfoBeforeSteth.collateral);
                    expect(userInfoAfterSteth.debt).to.be.lt(userInfoBeforeSteth.debt);

                    await revertToSnapshot(snapshot);
                }
            });
        });
});

const curveUsdSelfLiquidateTest = () => describe('CurveUsd-Self-Liquidate', () => {
    Object.entries(curveusdMarkets).slice(1, 2)
        .map(([assetSymbol, { controllerAddress, debtAvailableBlock }]) => {
            let snapshot;
            let senderAcc;
            let proxy;
            let llammaExchange;
            let debtAmount;
            let llammaAddress;
            let collateralAmount;
            const collateralAsset = getAssetInfo(assetSymbol);

            it(`... should test create for ${assetSymbol} market`, async () => {
                await resetForkToBlock(debtAvailableBlock);
                await debtCeilCheck(controllerAddress);
                await getContractFromRegistry('CurveUsdCreate');
                await redeploy('CurveUsdSelfLiquidate');
                await redeploy('CurveUsdSelfLiquidateWithColl');
                await redeploy('CurveUsdSwapper');

                const crvController = await ethers.getContractAt('ICrvUsdController', controllerAddress);
                llammaAddress = await crvController.amm();
                llammaExchange = await ethers.getContractAt('ILLAMMA', llammaAddress);

                [senderAcc] = await ethers.getSigners();
                proxy = await getProxy(senderAcc.address);

                collateralAmount = ethers.utils.parseUnits('3', collateralAsset.decimals);
                const nBands = 4;

                debtAmount = await crvController.max_borrowable(collateralAmount, nBands);

                await setBalance(collateralAsset.address, senderAcc.address, collateralAmount);
                await testCreate({
                    proxy,
                    collateralAsset: collateralAsset.address,
                    controllerAddress,
                    from: senderAcc.address,
                    to: senderAcc.address,
                    collateralAmount,
                    debtAmount,
                    nBands,
                });

                snapshot = await takeSnapshot();

                // move the user in soft liquidation

                const currPrice = await llammaExchange.get_p();
                const currActiveBand = await llammaExchange.active_band_with_skip();

                console.log(currPrice / 1e18);
                console.log(currActiveBand);

                const minAmount = 1;
                const swapAmount = ethers.utils.parseUnits('5000000', 18);

                await setBalance(crvusdAddress, senderAcc.address, swapAmount);
                await approve(crvusdAddress, llammaAddress);

                await llammaExchange.exchange(0, 1, swapAmount, minAmount, { gasLimit: 5000000 });

                const afterPrice = await llammaExchange.get_p();
                const afterActiveBand = await llammaExchange.active_band_with_skip();

                console.log(afterPrice / 1e18);
                console.log(afterActiveBand);

                const [crvUsdColl, collateral] = await llammaExchange.get_sum_xy(proxy.address);

                console.log(crvUsdColl / 1e18);
                console.log(collateral / 1e18);
            });

            // it('... should test liquidate action where additional crvUsd is needed from the user', async () => {
            //     // can give only the (wholeDebt - crvUsdColl) balance but we give wholeDebt here because it's easier
            //     await setBalance(crvusdAddress, senderAcc.address, debtAmount);
            //     await approve(crvusdAddress, proxy.address);

            //     await curveUsdSelfLiquidate(
            //         proxy,
            //         controllerAddress,
            //         0, // min expected collateral in crvUsd
            //         senderAcc.address,
            //         senderAcc.address,
            //     );

            //     revertToSnapshot(snapshot);
            // });

            // it('... should test liquidate action where we have enough in crvUsd', async () => {
            //     const swapAmount = ethers.utils.parseUnits('8000000', 18);

            //     await setBalance(crvusdAddress, senderAcc.address, swapAmount);
            //     await approve(crvusdAddress, llammaAddress);
            //     const minAmount = 1;

            //     await llammaExchange.exchange(0, 1, swapAmount, minAmount, { gasLimit: 5000000 });

            //     await curveUsdSelfLiquidate(
            //         proxy,
            //         controllerAddress,
            //         0, // min expected collateral in crvUsd
            //         senderAcc.address,
            //         senderAcc.address,
            //     );

            //     revertToSnapshot(snapshot);
            // });

            it(`... should test liquidate with collateral for ${assetSymbol}`, async () => {
                const exchangeObj = await formatExchangeObjCurve(
                    getAssetInfo(assetSymbol).address,
                    crvusdAddress,
                    collateralAmount,
                    addrs.mainnet.CURVE_USD_WRAPPER,
                );

                await curveUsdSelfLiquidateWithColl(
                    proxy,
                    controllerAddress,
                    ethers.utils.parseUnits('1', 18),
                    0, // min expected collateral in crvUsd
                    collateralAmount,
                    1, // min amount
                    senderAcc.address,
                    exchangeObj[8],
                    0,
                    400,
                    false,
                );

                revertToSnapshot(snapshot);
            });
        });
});

const curveUsdFullTest = () => {
    curveUsdCreateTest();
    curveUsdSupplyTest();
    curveUsdWithdrawTest();
    curveUsdBorrowTest();
    curveUsdPaybackTest();
    curveUsdRepayTest();
    curveUsdSelfLiquidateTest();
};

module.exports = {
    curveUsdCreateTest,
    curveUsdSupplyTest,
    curveUsdWithdrawTest,
    curveUsdBorrowTest,
    curveUsdPaybackTest,
    curveUsdRepayTest,
    curveUsdFullTest,
    curveUsdSelfLiquidateTest,
};
