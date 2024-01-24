const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, nullAddress, fetchAmountinUSDPrice, balanceOf,
} = require('../../utils');
const { getMarkets, collateralSupplyAmountInUsd } = require('../utils');
const { morphoBlueSupplyCollateral, morphoBlueWithdrawCollateral } = require('../../actions');

describe('Morpho-Blue-Withdraw-Collateral', function () {
    this.timeout(80000);

    const markets = getMarkets();
    const supplyAmountInUsd = collateralSupplyAmountInUsd;

    let senderAcc; let proxy; let snapshot; let view;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('MorphoBlueSupplyCollateral');
        await redeploy('MorphoBlueWithdrawCollateral');

        view = await (await hre.ethers.getContractFactory('MorphoBlueView')).deploy();
    });
    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });
    afterEach(async () => {
        await revertToSnapshot(snapshot);
    });
    for (let i = 0; i < markets.length; i++) {
        const marketParams = markets[i];
        const loanToken = getAssetInfoByAddress(marketParams[0]);
        const collToken = getAssetInfoByAddress(marketParams[1]);
        it(`should supply and withdraw ${supplyAmountInUsd}$ of ${collToken.symbol} as collateral to MorphoBlue ${collToken.symbol}/${loanToken.symbol} market`, async () => {
            const supplyAmount = fetchAmountinUSDPrice(collToken.symbol, supplyAmountInUsd);
            const supplyAmountInWei = hre.ethers.utils.parseUnits(
                supplyAmount, collToken.decimals,
            );

            await setBalance(collToken.address, senderAcc.address, supplyAmountInWei);
            await approve(collToken.address, proxy.address, senderAcc);
            await morphoBlueSupplyCollateral(
                proxy, marketParams, supplyAmountInWei, senderAcc.address, nullAddress,
            );
            const positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            expect(supplyAmountInWei).to.be.eq(positionInfo.collateral);

            await setBalance(marketParams[1], senderAcc.address, hre.ethers.utils.parseUnits('0'));
            await morphoBlueWithdrawCollateral(
                proxy, marketParams, supplyAmountInWei, nullAddress, senderAcc.address,
            );
            const positionInfoAfterWithdraw = await view.callStatic.getUserInfo(
                marketParams, proxy.address,
            );
            const eoaBalance = await balanceOf(marketParams[1], senderAcc.address);
            expect(supplyAmountInWei).to.be.eq(eoaBalance);
            expect(positionInfoAfterWithdraw.collateral).to.be.eq(0);
        });
    }
});
