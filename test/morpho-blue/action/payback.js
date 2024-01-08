const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, nullAddress, fetchAmountinUSDPrice, balanceOf,
} = require('../../utils');
const {
    getMarkets, collateralSupplyAmountInUsd, supplyToMarket, borrowAmountInUsd,
} = require('../utils');
const { morphoBlueSupplyCollateral, morphoBlueBorrow, morphoBluePayback } = require('../../actions');

describe('Morpho-Blue-Payback', function () {
    this.timeout(80000);

    const markets = getMarkets();
    const supplyAmountInUsd = collateralSupplyAmountInUsd;

    let senderAcc; let proxy; let snapshot; let view;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('MorphoBlueSupplyCollateral');
        await redeploy('MorphoBlueBorrow');
        await redeploy('MorphoBluePayback');
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
        it(`should payback partially and fully ${borrowAmountInUsd}$ of ${loanToken.symbol} from MorphoBlue ${collToken.symbol}/${loanToken.symbol} market`, async () => {
            await supplyToMarket(marketParams);
            const supplyAmount = fetchAmountinUSDPrice(collToken.symbol, supplyAmountInUsd);
            const supplyAmountInWei = hre.ethers.utils.parseUnits(
                supplyAmount, collToken.decimals,
            );
            await setBalance(collToken.address, senderAcc.address, supplyAmountInWei);
            await approve(collToken.address, proxy.address, senderAcc);
            await morphoBlueSupplyCollateral(
                proxy, marketParams, supplyAmountInWei, senderAcc.address, nullAddress,
            );
            let positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            expect(supplyAmountInWei).to.be.eq(positionInfo.collateral);
            // at this point collateral is supplied
            const borrowAmount = fetchAmountinUSDPrice(loanToken.symbol, borrowAmountInUsd);
            const borrowAmountInWei = hre.ethers.utils.parseUnits(
                borrowAmount, loanToken.decimals,
            );
            await setBalance(loanToken.address, senderAcc.address, hre.ethers.utils.parseUnits('0'));
            await morphoBlueBorrow(
                proxy, marketParams, borrowAmountInWei, nullAddress, senderAcc.address,
            );
            const eoaBalance = await balanceOf(loanToken.address, senderAcc.address);
            expect(eoaBalance).to.be.eq(borrowAmountInWei);
            // at this moment funds have been borrowed, so we try to repay half of the debt
            await setBalance(loanToken.address, senderAcc.address, hre.ethers.utils.parseUnits('0'));
            const partialPaybackAmount = borrowAmountInWei.div(2);
            await setBalance(loanToken.address, senderAcc.address, partialPaybackAmount);
            await approve(loanToken.address, proxy.address, senderAcc);
            await morphoBluePayback(
                proxy, marketParams, partialPaybackAmount, senderAcc.address, nullAddress,
            );
            positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            expect(positionInfo.borrowedInAssets).to.be.closeTo(
                borrowAmountInWei.sub(partialPaybackAmount), hre.ethers.utils.parseUnits('0.01', loanToken.decimals),
            );
            // now we try to repay rest of the debt
            await setBalance(loanToken.address, senderAcc.address, borrowAmountInWei);
            await morphoBluePayback(
                proxy,
                marketParams,
                hre.ethers.constants.MaxUint256,
                senderAcc.address,
                nullAddress,
            );
            positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            expect(positionInfo.borrowShares).to.be.eq(0);
        });
    }
});
