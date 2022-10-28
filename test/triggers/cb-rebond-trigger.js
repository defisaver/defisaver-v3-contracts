/* eslint-disable max-len */
/* eslint-disable no-mixed-operators */
const Dec = require('decimal.js');
const hre = require('hardhat');
const { expect } = require('chai');

const { assetAmountInEth } = require('@defisaver/tokens');

const {
    redeploy,
} = require('../utils');

const calcRebondMs = (accrualParameter, marketPricePremium, chickenInAMMFee) => {
    const effectivePremium = new Dec(1).sub(chickenInAMMFee).mul(marketPricePremium);
    if (effectivePremium.lte(1)) return Infinity;
    const sqrt = effectivePremium.sqrt();
    const dividend = sqrt.add(1);
    const divisor = effectivePremium.sub(1);

    return new Dec(accrualParameter).mul(dividend.div(divisor)).round().toNumber();
};

const calcAccruedAmountForMs = (systemInfo, lusdAmount, ms) => (ms * +lusdAmount)
 / (ms + +systemInfo.accrualParameter)
 * (1 - +systemInfo.chickenInAMMFee) * +systemInfo.marketPrice;

const getSystemInfo = async (chickenBondsView) => {
    const systemInfo = await chickenBondsView.getSystemInfo();

    return {
        bLUSDSupply: assetAmountInEth(systemInfo.bLUSDSupply, 'bLUSD'),
        accrualParameter: new Dec(assetAmountInEth(systemInfo.accrualParameter)).mul(1000).toString(),
        chickenInAMMFee: assetAmountInEth(systemInfo.chickenInAMMFee),
        totalReserveLUSD: assetAmountInEth(systemInfo.totalReserveLUSD, 'LUSD'),
    };
};

const calcCBondsBLUSDMarketPremium = (floorPrice, marketPrice) => new Dec(marketPrice).div(floorPrice).toString();

describe('CB-rebond-trigger', function () {
    this.timeout(80000);

    let cbRebondTrigger;
    let chickenBondsView;

    const amounts = ['5000', '50000', '200000'];

    before(async () => {
        cbRebondTrigger = await redeploy('CBRebondTrigger');
        chickenBondsView = await redeploy('ChickenBondsView');
    });

    for (let i = 0; i < amounts.length; ++i) {
        it('... should get optimal rebond time', async () => {
            const lusdAmount = amounts[i];
            const lusdAmountWei = hre.ethers.utils.parseUnits(lusdAmount, 18);

            const systemInfo = await getSystemInfo(chickenBondsView);

            const floorPrice = new Dec(systemInfo.totalReserveLUSD).div(systemInfo.bLUSDSupply).toString();
            const marketPrice = (await cbRebondTrigger.getBLusdPriceFromCurve(lusdAmountWei)) / 1e18;

            systemInfo.marketPrice = marketPrice;

            const marketPricePremium = calcCBondsBLUSDMarketPremium(floorPrice, marketPrice);

            const rebondMs = calcRebondMs(
                systemInfo.accrualParameter,
                marketPricePremium,
                systemInfo.chickenInAMMFee,
            );

            const rebondAmount = calcAccruedAmountForMs(systemInfo, lusdAmount, rebondMs);
            console.log('rebondAmount calc from js: ', rebondAmount.toString());

            const optimalBLusdAmount = await cbRebondTrigger.getOptimalBLusdAmount(hre.ethers.utils.parseUnits(lusdAmount, 18));
            console.log('rebondAmount calc from sol: ', optimalBLusdAmount[0] / 1e18);

            expect(rebondAmount).to.be.closeTo(optimalBLusdAmount[0] / 1e18, 0.0001);
        });
    }
});
