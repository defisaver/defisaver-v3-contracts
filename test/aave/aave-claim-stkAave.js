const { expect } = require('chai');

const { getAssetInfo } = require('@defisaver/tokens');
const hre = require('hardhat');

const {
    getAaveDataProvider,
    getAaveTokenInfo,
} = require('../utils-aave');

const {
    getProxy,
    redeploy,
    balanceOf,
    AAVE_MARKET,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
    timeTravel,
} = require('../utils');

const {
    supplyAave,
    claimStkAave,
} = require('../actions');

describe('Aave-Supply', function () {
    this.timeout(150000);

    const stkAaveAddr = '0x4da27a545c0c5B758a6BA100e3a049001de870f5';

    const tokenSymbol = 'WETH';
    const assetInfo = getAssetInfo(tokenSymbol);
    const supplyAmount = fetchAmountinUSDPrice(tokenSymbol, '10000');

    let senderAcc; let proxy; let proxyAddr; let dataProvider;
    let aTokenInfo; let AaveView;
    let accruedRewards;

    before(async () => {
        await redeploy('AaveSupply');
        await redeploy('AaveClaimStkAave');
        AaveView = await redeploy('AaveView');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        dataProvider = await getAaveDataProvider();
        aTokenInfo = await getAaveTokenInfo(dataProvider, assetInfo.address);
    });

    it(`... should supply ${supplyAmount} ${tokenSymbol} to Aave`, async () => {
        // eslint-disable-next-line max-len
        await supplyAave(proxy, AAVE_MARKET, hre.ethers.utils.parseUnits(supplyAmount, 18), WETH_ADDRESS, senderAcc.address);
        // eslint-disable-next-line max-len
        expect(await balanceOf(aTokenInfo.aTokenAddress, proxyAddr)).to.eq(hre.ethers.utils.parseUnits(supplyAmount, 18));
    });

    it('... should accrue rewards over time', async () => {
        const secondsInMonth = 2592000;
        await timeTravel(secondsInMonth);

        // eslint-disable-next-line max-len
        await supplyAave(proxy, AAVE_MARKET, hre.ethers.constants.One, WETH_ADDRESS, senderAcc.address);
        // this is done so the getter function below returns accurate balance

        accruedRewards = await AaveView['getUserUnclaimedRewards(address)'](proxyAddr);
        expect(accruedRewards).to.be.gt(hre.ethers.constants.Zero);
    });

    it('... should not revert when claiming 0 rewards', async () => {
        // eslint-disable-next-line max-len
        await expect(claimStkAave(proxy, [aTokenInfo.aTokenAddress], hre.ethers.constants.Zero, proxyAddr)).to.not.be.reverted;
    });

    it('... should claim half of all accrued rewards', async () => {
        // eslint-disable-next-line max-len
        await claimStkAave(proxy, [aTokenInfo.aTokenAddress], accruedRewards.div('2'), proxyAddr);
        expect(await balanceOf(stkAaveAddr, proxyAddr)).to.be.eq(accruedRewards.div('2'));
    });

    it('... should claim all accrued rewards when amount > unclaimed rewards', async () => {
        // eslint-disable-next-line max-len
        await claimStkAave(proxy, [aTokenInfo.aTokenAddress], accruedRewards.add('1'), proxyAddr);
        expect(await balanceOf(stkAaveAddr, proxyAddr)).to.be.eq(accruedRewards);
    });
});
