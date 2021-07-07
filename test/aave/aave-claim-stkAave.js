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
    let aTokenInfo;

    before(async () => {
        await redeploy('AaveSupply');
        await redeploy('AaveClaimStkAave');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        dataProvider = await getAaveDataProvider();
        aTokenInfo = await getAaveTokenInfo(dataProvider, assetInfo.address);
    });

    it(`... should supply ${supplyAmount} ${tokenSymbol} to Aave`, async () => {
        // eslint-disable-next-line max-len
        await supplyAave(proxy, AAVE_MARKET, hre.ethers.utils.parseUnits(supplyAmount, 18), WETH_ADDRESS, senderAcc.address);
    });

    it('... should claim accrued rewards', async () => {
        const secondsInMonth = 2592000;
        await timeTravel(secondsInMonth);

        const balanceBefore = await balanceOf(stkAaveAddr, proxyAddr);
        // eslint-disable-next-line max-len
        await claimStkAave(proxy, [aTokenInfo.aTokenAddress], hre.ethers.constants.MaxUint256, proxyAddr);
        expect(await balanceOf(stkAaveAddr, proxyAddr)).to.be.gt(balanceBefore);
    });
});
