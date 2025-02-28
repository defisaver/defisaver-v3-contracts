/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const {
    redeploy, openStrategyAndBundleStorage, getOwnerAddr,
} = require('../test/utils');

const { topUp } = require('./utils/fork');
const { createCurveUsdPaybackStrategy } = require('../test/strategies');
const { createStrategy, addBotCaller } = require('../test/utils-strategies');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);
    await topUp(getOwnerAddr());

    const recipeExecutor = await redeploy('RecipeExecutor', true);
    const safeModuleAuth = await redeploy('SafeModuleAuth', true);
    const strategyExecutor = await redeploy('StrategyExecutor', true);
    const subProxy = await redeploy('SubProxy', true);

    const curveUsdPayback = await redeploy('CurveUsdPayback', true);
    const curveUsdHealthRatioTrigger = await redeploy('CurveUsdHealthRatioTrigger', true);

    await openStrategyAndBundleStorage(true);

    const curveUsdPaybackStrategy = createCurveUsdPaybackStrategy();
    const strategyId = await createStrategy(...curveUsdPaybackStrategy, true);

    console.log('RecipeExecutor deployed to:', recipeExecutor.address);
    console.log('SafeModuleAuth deployed to:', safeModuleAuth.address);
    console.log('StrategyExecutor deployed to:', strategyExecutor.address);
    console.log('SubProxy deployed to:', subProxy.address);

    console.log('CurveUsdPayback deployed to:', curveUsdPayback.address);
    console.log('CurveUsdHealthRatioTrigger deployed to:', curveUsdHealthRatioTrigger.address);
    console.log('StrategyId:', strategyId);

    // Bot toUp and add to botCaller
    await topUp('0x61fe1bdcd91E8612a916f86bA50a3EDF3E5654c4');
    await topUp('0xC561281982c3042376eB8242d6A78Ab18062674F');
    await topUp('0x660B3515F493200C47Ef3DF195abEAfc57Bd6496');
    await addBotCaller('0x61fe1bdcd91E8612a916f86bA50a3EDF3E5654c4', true);
    await addBotCaller('0xC561281982c3042376eB8242d6A78Ab18062674F', true);
    await addBotCaller('0x660B3515F493200C47Ef3DF195abEAfc57Bd6496', true);

    process.exit(0);
}

start(main);
