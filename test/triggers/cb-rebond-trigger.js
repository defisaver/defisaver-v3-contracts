/* eslint-disable max-len */
/* eslint-disable no-mixed-operators */
const hre = require('hardhat');
const Dec = require('decimal.js');
const { expect } = require('chai');

const {
    getSystemInfo,
    calcCBondsBLUSDMarketPremium,
    calcRebondMs,
    calcAccruedAmountForMs,
} = require('../utils-cb');

const {
    redeploy,
} = require('../utils');

describe('CB-rebond-trigger', function () {
    this.timeout(80000);

    let cbRebondTrigger;
    let chickenBondsView;

    const amounts = ['1000', '50000', '200000'];

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

            expect(rebondAmount).to.be.closeTo(optimalBLusdAmount[0] / 1e18, 0.001);
        });
    }
});
