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
    redeploy, takeSnapshot, revertToSnapshot,
} = require('../utils');

describe('CB-rebond-trigger', function () {
    this.timeout(80000);

    let cbRebondTrigger;
    let chickenBondsView;

    const amounts = ['100', '500', '1000', '10000', '100000', '200000', '300000', '400000', '500000', '1000000'];

    before(async () => {
        cbRebondTrigger = await redeploy('CBRebondTrigger');
        chickenBondsView = await redeploy('ChickenBondsView');
    });

    for (let i = 0; i < amounts.length; ++i) {
        it('... should get optimal rebond time when using BLUSDCap', async () => {
            const lusdAmount = amounts[i];
            const lusdAmountWei = hre.ethers.utils.parseUnits(lusdAmount, 18);
            const cbManagerAddress = await chickenBondsView.CBManager();
            const cbManager = await hre.ethers.getContractAt('IChickenBondManager', cbManagerAddress);
            const backingRatio = await cbManager.calcSystemBackingRatio();
            const chickenInFee = await cbManager.CHICKEN_IN_AMM_FEE();

            const chickenInFeeAmount = (lusdAmountWei.mul(chickenInFee.toString()).div(1e18.toString())).toString();
            let bondAmountMinusChickenInFee = (lusdAmountWei.sub(chickenInFeeAmount.toString())).toString();
            bondAmountMinusChickenInFee = hre.ethers.utils.parseUnits(bondAmountMinusChickenInFee, 0);

            const blusdCap = (bondAmountMinusChickenInFee.mul(1e18.toString()).div(backingRatio.toString())).toString();

            const systemInfo = await getSystemInfo(chickenBondsView);

            const floorPrice = new Dec(systemInfo.totalReserveLUSD).div(systemInfo.bLUSDSupply).toString();
            const marketPrice = (await cbRebondTrigger.getBLusdPriceFromCurve(blusdCap)) / 1e18;
            systemInfo.marketPrice = marketPrice;

            const marketPricePremium = calcCBondsBLUSDMarketPremium(floorPrice, marketPrice);

            const rebondMs = calcRebondMs(
                systemInfo.accrualParameter,
                marketPricePremium,
                systemInfo.chickenInAMMFee,
            );

            const rebondAmount = calcAccruedAmountForMs(systemInfo, blusdCap, rebondMs);
            console.log('rebondAmount calc from js using BLUSDCap: ', rebondAmount.toString());

            const optimalLusdAmount = await cbRebondTrigger.getOptimalLusdAmount(blusdCap, blusdCap);
            console.log('rebondAmount calc from sol using BLUSDCap: ', optimalLusdAmount[0] / 1e18);
        });
        it('... should get optimal rebond time while using accrued BLUSD', async () => {
            const lusdAmount = amounts[i];
            const lusdAmountWei = hre.ethers.utils.parseUnits(lusdAmount, 18);
            const cbManagerAddress = await chickenBondsView.CBManager();
            const cbManager = await hre.ethers.getContractAt('IChickenBondManager', cbManagerAddress);
            const backingRatio = await cbManager.calcSystemBackingRatio();
            const chickenInFee = await cbManager.CHICKEN_IN_AMM_FEE();

            const chickenInFeeAmount = (lusdAmountWei.mul(chickenInFee.toString()).div(1e18.toString())).toString();
            let bondAmountMinusChickenInFee = (lusdAmountWei.sub(chickenInFeeAmount.toString())).toString();
            bondAmountMinusChickenInFee = hre.ethers.utils.parseUnits(bondAmountMinusChickenInFee, 0);

            const blusdCap = (bondAmountMinusChickenInFee.mul(1e18.toString()).div(backingRatio.toString())).toString();

            const systemInfo = await getSystemInfo(chickenBondsView);

            const floorPrice = new Dec(systemInfo.totalReserveLUSD).div(systemInfo.bLUSDSupply).toString();

            const testMarketNoTPI = (hre.ethers.utils.parseUnits('1', 18)).toString();

            let marketPrice = (await cbRebondTrigger.getBLusdPriceFromCurve(testMarketNoTPI)) / 1e18;
            let breakEvenBLusdAmount = new Dec(lusdAmount).div(marketPrice).round().toString();

            breakEvenBLusdAmount = hre.ethers.utils.parseUnits(breakEvenBLusdAmount, 18);

            marketPrice = (await cbRebondTrigger.getBLusdPriceFromCurve(breakEvenBLusdAmount)) / 1e18;
            systemInfo.marketPrice = marketPrice;

            const marketPricePremium = calcCBondsBLUSDMarketPremium(floorPrice, marketPrice);

            const rebondMs = calcRebondMs(
                systemInfo.accrualParameter,
                marketPricePremium,
                systemInfo.chickenInAMMFee,
            );

            const rebondAmount = calcAccruedAmountForMs(systemInfo, blusdCap, rebondMs);
            console.log('rebondAmount calc from js at moment of breakeven: ', rebondAmount.toString());

            const optimalLusdAmount = await cbRebondTrigger.getOptimalLusdAmount(blusdCap, breakEvenBLusdAmount);
            console.log('rebondAmount calc from sol at moment of breakeven: ', optimalLusdAmount[0] / 1e18);
        });

        it('... should get optimal rebond time not counting TPI', async () => {
            const lusdAmount = amounts[i];
            const lusdAmountWei = hre.ethers.utils.parseUnits(lusdAmount, 18);
            const cbManagerAddress = await chickenBondsView.CBManager();
            const cbManager = await hre.ethers.getContractAt('IChickenBondManager', cbManagerAddress);
            const backingRatio = await cbManager.calcSystemBackingRatio();
            const chickenInFee = await cbManager.CHICKEN_IN_AMM_FEE();

            const chickenInFeeAmount = (lusdAmountWei.mul(chickenInFee.toString()).div(1e18.toString())).toString();
            let bondAmountMinusChickenInFee = (lusdAmountWei.sub(chickenInFeeAmount.toString())).toString();
            bondAmountMinusChickenInFee = hre.ethers.utils.parseUnits(bondAmountMinusChickenInFee, 0);

            const blusdCap = (bondAmountMinusChickenInFee.mul(1e18.toString()).div(backingRatio.toString())).toString();

            const systemInfo = await getSystemInfo(chickenBondsView);

            const floorPrice = new Dec(systemInfo.totalReserveLUSD).div(systemInfo.bLUSDSupply).toString();

            const testMarketNoTPI = (hre.ethers.utils.parseUnits('1', 18)).toString();

            const marketPrice = (await cbRebondTrigger.getBLusdPriceFromCurve(testMarketNoTPI)) / 1e18;
            systemInfo.marketPrice = marketPrice;

            const marketPricePremium = calcCBondsBLUSDMarketPremium(floorPrice, marketPrice);

            const rebondMs = calcRebondMs(
                systemInfo.accrualParameter,
                marketPricePremium,
                systemInfo.chickenInAMMFee,
            );

            const rebondAmount = calcAccruedAmountForMs(systemInfo, blusdCap, rebondMs);
            console.log('rebondAmount calc from js when not counting TPI: ', rebondAmount.toString());

            const optimalLusdAmount = await cbRebondTrigger.getOptimalLusdAmount(blusdCap, testMarketNoTPI);
            console.log('rebondAmount calc from sol when not counting TPI: ', optimalLusdAmount[0] / 1e18);
        });
    }
});
