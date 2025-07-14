/* eslint-disable max-len */
/* eslint-disable no-nested-ternary */
/* eslint-disable import/no-extraneous-dependencies */
const hre = require('hardhat');
const { topUp } = require('./utils/fork');
const { getOwnerAddr, redeploy, openStrategyAndBundleStorage } = require('../test/utils/utils');
const {
    createCompV3BoostOnPriceStrategy,
    createCompV3FLBoostOnPriceStrategy,
    createCompV3EOABoostOnPriceStrategy,
    createCompV3EOAFLBoostOnPriceStrategy,
    createCompV3EOARepayOnPriceStrategy,
    createCompV3RepayOnPriceStrategy,
    createCompV3EOAFLRepayOnPriceStrategy,
    createCompV3FLRepayOnPriceStrategy,
    createCompV3EOAFLCloseToDebtStrategy,
    createCompV3FLCloseToDebtStrategy,
    createCompV3EOAFLCloseToCollStrategy,
    createCompV3FLCloseToCollStrategy,
} = require('../strategies-spec/mainnet');
const { createBundle } = require('../test/strategies/utils/utils-strategies');
const {
    createCompV3EOABoostOnPriceL2Strategy,
    createCompV3EOAFLBoostOnPriceL2Strategy,
    createCompV3FLBoostOnPriceL2Strategy,
    createCompV3BoostOnPriceL2Strategy,
    createCompV3EOARepayOnPriceL2Strategy,
    createCompV3RepayOnPriceL2Strategy,
    createCompV3EOAFLRepayOnPriceL2Strategy,
    createCompV3FLRepayOnPriceL2Strategy,
    createCompV3EOAFLCloseToDebtL2Strategy,
    createCompV3FLCloseToDebtL2Strategy,
    createCompV3EOAFLCloseToCollL2Strategy,
    createCompV3FLCloseToCollL2Strategy,
} = require('../strategies-spec/l2');

const deployCompV3BoostOnPriceBundle = async (isEOA, isL2) => {
    await openStrategyAndBundleStorage(true);
    const boostOnPriceStrategyId = isEOA
        ? (isL2 ? createCompV3EOABoostOnPriceL2Strategy() : createCompV3EOABoostOnPriceStrategy())
        : (isL2 ? createCompV3BoostOnPriceL2Strategy() : createCompV3BoostOnPriceStrategy());
    const flBoostOnPriceStrategyId = isEOA
        ? (isL2 ? createCompV3EOAFLBoostOnPriceL2Strategy() : createCompV3EOAFLBoostOnPriceStrategy())
        : (isL2 ? createCompV3FLBoostOnPriceL2Strategy() : createCompV3FLBoostOnPriceStrategy());
    const bundleId = await createBundle([boostOnPriceStrategyId, flBoostOnPriceStrategyId]);
    return bundleId;
};
const deployCompV3RepayOnPriceBundle = async (isEOA, isL2) => {
    await openStrategyAndBundleStorage(true);
    const repayOnPriceStrategyId = isEOA
        ? (isL2 ? createCompV3EOARepayOnPriceL2Strategy() : createCompV3EOARepayOnPriceStrategy())
        : (isL2 ? createCompV3RepayOnPriceL2Strategy() : createCompV3RepayOnPriceStrategy());
    const flRepayOnPriceStrategyId = isEOA
        ? (isL2 ? createCompV3EOAFLRepayOnPriceL2Strategy() : createCompV3EOAFLRepayOnPriceStrategy())
        : (isL2 ? createCompV3FLRepayOnPriceL2Strategy() : createCompV3FLRepayOnPriceStrategy());
    const bundleId = await createBundle([repayOnPriceStrategyId, flRepayOnPriceStrategyId]);
    return bundleId;
};
const deployCompV3CloseBundle = async (isEOA, isL2) => {
    await openStrategyAndBundleStorage(true);
    const closeStrategyId = isEOA
        ? (isL2 ? createCompV3EOAFLCloseToDebtL2Strategy() : createCompV3EOAFLCloseToDebtStrategy())
        : (isL2 ? createCompV3FLCloseToDebtL2Strategy() : createCompV3FLCloseToDebtStrategy());
    const flCloseStrategyId = isEOA
        ? (isL2 ? createCompV3EOAFLCloseToCollL2Strategy() : createCompV3EOAFLCloseToCollStrategy())
        : (isL2 ? createCompV3FLCloseToCollL2Strategy() : createCompV3FLCloseToCollStrategy());
    const bundleId = await createBundle([closeStrategyId, flCloseStrategyId]);
    return bundleId;
};
async function main() {
    /* //////////////////////////////////////////////////////////////
                                SETUP
    //////////////////////////////////////////////////////////// */
    const isL2 = false;

    const senderAcc = (await hre.ethers.getSigners())[0];

    await topUp(senderAcc.address);
    await topUp(getOwnerAddr());

    const compV3PriceTrigger = await redeploy('CompV3PriceTrigger', true);
    const compV3PriceRangeTrigger = await redeploy('CompV3PriceRangeTrigger', true);
    const compV3TargetRatioCheckAction = await redeploy('CompV3TargetRatioCheckAction', true);

    console.log('CompV3PriceTrigger:', compV3PriceTrigger.address);
    console.log('CompV3PriceRangeTrigger:', compV3PriceRangeTrigger.address);
    console.log('CompV3TargetRatioCheckAction:', compV3TargetRatioCheckAction.address);

    const boostOnPriceBundleId = await deployCompV3BoostOnPriceBundle(false, isL2);
    const repayOnPriceBundleId = await deployCompV3RepayOnPriceBundle(false, isL2);
    const closeBundleId = await deployCompV3CloseBundle(false, isL2);
    const eoaBoostOnPriceBundleId = await deployCompV3BoostOnPriceBundle(true, isL2);
    const eoaRepayOnPriceBundleId = await deployCompV3RepayOnPriceBundle(true, isL2);
    const eoaCloseBundleId = await deployCompV3CloseBundle(true, isL2);

    console.log('Boost on price bundle id:', boostOnPriceBundleId);
    console.log('Repay on price bundle id:', repayOnPriceBundleId);
    console.log('Close bundle id:', closeBundleId);
    console.log('EOA Boost on price bundle id:', eoaBoostOnPriceBundleId);
    console.log('EOA Repay on price bundle id:', eoaRepayOnPriceBundleId);
    console.log('EOA Close bundle id:', eoaCloseBundleId);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
