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
} = require('../utils');
const {
    curveUsdCreate, curveUsdSupply, curveUsdWithdraw, curveUsdBorrow, curveUsdPayback,
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
    Object.entries(curveusdMarkets)
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

            it(`... should test create collateral=maxUint for ${assetSymbol} market`, async () => {
                await revertToSnapshot(snapshot);
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
                    collateralAmount: ethers.constants.MaxUint256,
                    debtAmount,
                    nBands,
                });
            });

            it(`... should test create collateral=maxUint debt=maxUint for ${assetSymbol} market`, async () => {
                await revertToSnapshot(snapshot);

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

const curveUsdFullTest = () => {
    curveUsdCreateTest();
    curveUsdSupplyTest();
    curveUsdWithdrawTest();
    curveUsdBorrowTest();
    curveUsdPaybackTest();
};

module.exports = {
    curveUsdCreateTest,
    curveUsdSupplyTest,
    curveUsdWithdrawTest,
    curveUsdBorrowTest,
    curveUsdPaybackTest,

    curveUsdFullTest,
};
