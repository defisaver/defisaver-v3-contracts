const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, nullAddress, fetchAmountinUSDPrice, balanceOf,
} = require('../../utils');
const { getMarkets, loanTokenSupplyAmountInUsd } = require('../utils');
const { morphoBlueSupply, morphoBlueWithdraw } = require('../../actions');

describe('Morpho-Blue-Withdraw', function () {
    this.timeout(80000);

    const markets = getMarkets();
    const supplyAmountInUsd = loanTokenSupplyAmountInUsd;

    let senderAcc; let proxy; let snapshot; let view;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('MorphoBlueSupply');
        await redeploy('MorphoBlueWithdraw');
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
        it(`should partially and fully withdraw ${supplyAmountInUsd}$ of ${loanToken.symbol} to MorphoBlue ${collToken.symbol}/${loanToken.symbol} market`, async () => {
            const supplyAmount = fetchAmountinUSDPrice(loanToken.symbol, supplyAmountInUsd);
            const supplyAmountInWei = hre.ethers.utils.parseUnits(
                supplyAmount, loanToken.decimals,
            );

            await setBalance(marketParams[0], senderAcc.address, supplyAmountInWei);
            await approve(marketParams[0], proxy.address, senderAcc);
            await morphoBlueSupply(
                proxy, marketParams, supplyAmountInWei, senderAcc.address, nullAddress,
            );
            let positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            console.log(positionInfo.suppliedInAssets);
            expect(supplyAmountInWei).to.be.closeTo(positionInfo.suppliedInAssets, 1);
            // loanToken supplied
            const withdrawAmount = (supplyAmount / 3).toFixed(loanToken.decimals);
            const withdrawAmountInWei = hre.ethers.utils.parseUnits(
                withdrawAmount.toString(), loanToken.decimals,
            );
            await setBalance(marketParams[0], senderAcc.address, hre.ethers.utils.parseUnits('0'));
            await morphoBlueWithdraw(
                proxy, marketParams, withdrawAmountInWei, nullAddress, senderAcc.address,
            );
            positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            let userBalance = await balanceOf(marketParams[0], senderAcc.address);
            expect(userBalance).to.be.eq(withdrawAmountInWei);
            expect(supplyAmountInWei.sub(withdrawAmountInWei)).to.be.lte(
                positionInfo.suppliedInAssets.add(1),
            );
            // withdrawn third of supplied assets
            await morphoBlueWithdraw(
                proxy,
                marketParams,
                hre.ethers.constants.MaxUint256,
                nullAddress,
                senderAcc.address,
            );
            positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            userBalance = await balanceOf(marketParams[0], senderAcc.address);
            expect(userBalance).to.be.gte(supplyAmountInWei.sub(1));
            expect(positionInfo.suppliedInAssets).to.be.eq(0);
            // withdrawn all of the supplied assets
        });
    }
});
