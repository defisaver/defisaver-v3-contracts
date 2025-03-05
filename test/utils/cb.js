/* eslint-disable no-mixed-operators */
/* eslint-disable max-len */
const Dec = require('decimal.js');
const hre = require('hardhat');

const { assetAmountInEth } = require('@defisaver/tokens');

const calcRebondMs = (accrualParameter, marketPricePremium, chickenInAMMFee) => {
    const effectivePremium = new Dec(1).sub(chickenInAMMFee).mul(marketPricePremium);
    if (effectivePremium.lte(1)) return Infinity;
    const sqrt = effectivePremium.sqrt();
    const dividend = sqrt.add(1);
    const divisor = effectivePremium.sub(1);

    return new Dec(accrualParameter).mul(dividend.div(divisor)).round().toNumber();
};
const calcAccruedAmountForMs = (systemInfo, blusdcap, ms) => (ms * +blusdcap)
 / (ms + +systemInfo.accrualParameter)
 * +systemInfo.marketPrice;

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

const getRebondTime = async (chickenBondsView, rebondTrigger, lusdAmount) => {
    const systemInfo = await getSystemInfo(chickenBondsView);
    const lusdAmountWei = hre.ethers.utils.parseUnits(lusdAmount, 18);

    const marketPrice = (await rebondTrigger.getBLusdPriceFromCurve(lusdAmountWei)) / 1e18;
    systemInfo.marketPrice = marketPrice;

    const floorPrice = new Dec(systemInfo.totalReserveLUSD).div(systemInfo.bLUSDSupply).toString();
    const marketPricePremium = calcCBondsBLUSDMarketPremium(floorPrice, marketPrice);

    const rebondMs = calcRebondMs(
        systemInfo.accrualParameter,
        marketPricePremium,
        systemInfo.chickenInAMMFee,
    );

    return rebondMs;
};

module.exports = {
    calcRebondMs,
    calcAccruedAmountForMs,
    getSystemInfo,
    calcCBondsBLUSDMarketPremium,
    getRebondTime,
};
