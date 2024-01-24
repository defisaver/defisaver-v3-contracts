const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, nullAddress, fetchAmountinUSDPrice,
} = require('../../utils');
const { getMarkets, loanTokenSupplyAmountInUsd } = require('../utils');
const { morphoBlueSupply } = require('../../actions');

describe('Morpho-Blue-Supply', function () {
    this.timeout(80000);

    const markets = getMarkets();
    const supplyAmountInUsd = loanTokenSupplyAmountInUsd;

    let senderAcc; let proxy; let snapshot; let view;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('MorphoBlueSupply');
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
        it(`should supply ${supplyAmountInUsd}$ of ${loanToken.symbol} to MorphoBlue ${collToken.symbol}/${loanToken.symbol} market`, async () => {
            const supplyAmount = fetchAmountinUSDPrice(loanToken.symbol, supplyAmountInUsd);
            const supplyAmountInWei = hre.ethers.utils.parseUnits(
                supplyAmount, loanToken.decimals,
            );

            await setBalance(marketParams[0], senderAcc.address, supplyAmountInWei);
            await approve(marketParams[0], proxy.address, senderAcc);
            await morphoBlueSupply(
                proxy, marketParams, supplyAmountInWei, senderAcc.address, nullAddress,
            );
            const positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            expect(supplyAmountInWei).to.be.closeTo(positionInfo.suppliedInAssets, 1);
        });
    }
});
