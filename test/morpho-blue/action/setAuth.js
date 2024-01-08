const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, nullAddress, fetchAmountinUSDPrice, balanceOf,
} = require('../../utils');
const {
    getMarkets, collateralSupplyAmountInUsd, supplyToMarket, borrowAmountInUsd, MORPHO_BLUE_ADDRESS,
} = require('../utils');
const { morphoBlueSupplyCollateral, morphoBlueSetAuth } = require('../../actions');

describe('Morpho-Blue-Borrow', function () {
    this.timeout(80000);

    const markets = getMarkets();
    const supplyAmountInUsd = collateralSupplyAmountInUsd;

    let senderAcc; let proxy; let snapshot; let view;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('MorphoBlueSupplyCollateral');
        await redeploy('MorphoBlueSetAuth');
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
        it('should give auth for proxy position to someone', async () => {
            const morphoBlue = await hre.ethers.getContractAt('IMorphoBlue', MORPHO_BLUE_ADDRESS);
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
            const borrowAmount = fetchAmountinUSDPrice(loanToken.symbol, borrowAmountInUsd);
            const borrowAmountInWei = hre.ethers.utils.parseUnits(
                borrowAmount, loanToken.decimals,
            );
            await setBalance(loanToken.address, senderAcc.address, hre.ethers.utils.parseUnits('0'));

            expect(await morphoBlue.isAuthorized(proxy.address, senderAcc.address)).to.be.eq(false);
            await morphoBlueSetAuth(proxy, senderAcc.address, true);
            expect(await morphoBlue.isAuthorized(proxy.address, senderAcc.address)).to.be.eq(true);

            await morphoBlue.borrow(marketParams, borrowAmountInWei, '0', proxy.address, senderAcc.address);
            const eoaBalance = await balanceOf(loanToken.address, senderAcc.address);
            positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            expect(positionInfo.borrowedInAssets).to.be.gte(borrowAmountInWei);
            expect(eoaBalance).to.be.eq(borrowAmountInWei);
        });
    }
});
