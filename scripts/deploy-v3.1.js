/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');

const { redeploy, setNewExchangeWrapper } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    // core
    const recipeExecutor = await redeploy('RecipeExecutor', true);
    const safeModuleAuth = await redeploy('SafeModuleAuth', true);
    const strategyExecutor = await redeploy('StrategyExecutor', true);

    // new fl action
    const flAction = await redeploy('FLAction', true);

    // actions with sell that had .owner()
    const dfsSell = await redeploy('DFSSell', true);
    const limitSell = await redeploy('LimitSell', true);
    const lsvSell = await redeploy('LSVSell', true);

    // wrappers
    const kyberAggregatorWrapper = await redeploy('KyberAggregatorWrapper', true);
    await setNewExchangeWrapper('KyberAggregatorWrapper', kyberAggregatorWrapper.address, true);

    const oneInchWrapper = await redeploy('OneInchWrapper', true);
    await setNewExchangeWrapper('OneInchWrapper', oneInchWrapper.address, true);

    const paraswapWrapper = await redeploy('ParaswapWrapper', true);
    await setNewExchangeWrapper('ParaswapWrapper', paraswapWrapper.address, true);

    const zeroxWrapper = await redeploy('ZeroxWrapper', true);
    await setNewExchangeWrapper('ZeroxWrapper', zeroxWrapper.address, true);

    const curveWrapperV3 = await redeploy('CurveWrapperV3', true);
    await setNewExchangeWrapper('CurveWrapperV3', curveWrapperV3.address, true);

    const kyberWrapperV3 = await redeploy('KyberWrapperV3', true);
    await setNewExchangeWrapper('KyberWrapperV3', kyberWrapperV3.address, true);

    const uniswapWrapper = await redeploy('UniswapWrapperV3', true);
    await setNewExchangeWrapper('UniswapWrapperV3', uniswapWrapper.address, true);

    const uniV3WrapperV3 = await redeploy('UniV3WrapperV3', true);
    await setNewExchangeWrapper('UniV3WrapperV3', uniV3WrapperV3.address, true);

    // sub proxies
    const subProxy = await redeploy('SubProxy', true);
    const aaveSubProxy = await redeploy('AaveSubProxy', true, 22, 23);
    const aaveV3SubProxy = await redeploy('AaveV3SubProxy', true, 8, 9);
    const compSubProxy = await redeploy('CompSubProxy', true, 20, 21);
    const compV3SubProxy = await redeploy('CompV3SubProxy', true, 28, 29, 30, 31);
    const limitOrderSubProxy = await redeploy('LimitOrderSubProxy', true, 51);
    const liquitySubProxy = await redeploy('LiquitySubProxy', true, 16, 17);
    const cbRebondSubProxy = await redeploy('CBRebondSubProxy', true);
    const mcdSubProxy = await redeploy('McdSubProxy', true, 10, 11);
    const morphoAaveV2SubProxy = await redeploy('MorphoAaveV2SubProxy', true, 14, 15);
    const sparkSubProxy = await redeploy('SparkSubProxy', true, 18, 19);

    // actions that use &eoa
    const sendTokenAndUnwrap = await redeploy('SendTokenAndUnwrap', true);
    const sendTokens = await redeploy('SendTokens', true);
    const sendToken = await redeploy('SendToken', true);
    const curveUsdRepay = await redeploy('CurveUsdRepay', true);
    const curveUsdPayback = await redeploy('CurveUsdPayback', true);
    const compoundV3Withdraw = await redeploy('CompV3Withdraw', true);
    const compoundV3Payback = await redeploy('CompV3Payback', true);
    const compoundV3RatioCheck = await redeploy('CompV3RatioCheck', true);
    const compoundV3Borrow = await redeploy('CompV3Borrow', true);
    const compoundV3Supply = await redeploy('CompV3Supply', true);

    console.log('KyberAggregatorWrapper deployed to:', kyberAggregatorWrapper.address);
    console.log('OneInchWrapper deployed to:', oneInchWrapper.address);
    console.log('ParaswapWrapper deployed to:', paraswapWrapper.address);
    console.log('ZeroxWrapper deployed to:', zeroxWrapper.address);
    console.log('CurveWrapperV3 deployed to:', curveWrapperV3.address);
    console.log('KyberWrapperV3 deployed to:', kyberWrapperV3.address);
    console.log('UniswapWrapperV3 deployed to:', uniswapWrapper.address);
    console.log('UniV3WrapperV3 deployed to:', uniV3WrapperV3.address);

    console.log('SubProxy deployed to:', subProxy.address);
    console.log('AaveSubProxy deployed to:', aaveSubProxy.address);
    console.log('AaveV3SubProxy deployed to:', aaveV3SubProxy.address);
    console.log('CompSubProxy deployed to:', compSubProxy.address);
    console.log('CompV3SubProxy deployed to:', compV3SubProxy.address);
    console.log('LimitOrderSubProxy deployed to:', limitOrderSubProxy.address);
    console.log('LiquitySubProxy deployed to:', liquitySubProxy.address);
    console.log('CBRebondSubProxy deployed to:', cbRebondSubProxy.address);
    console.log('MCDSubProxy deployed to:', mcdSubProxy.address);
    console.log('MorphoAaveV2SubProxy deployed to:', morphoAaveV2SubProxy.address);
    console.log('SparkSubProxy deployed to:', sparkSubProxy.address);

    console.log('SendTokenAndUnwrap deployed to:', sendTokenAndUnwrap.address);
    console.log('SendTokens deployed to:', sendTokens.address);
    console.log('SendToken deployed to:', sendToken.address);
    console.log('CurveUsdRepay deployed to:', curveUsdRepay.address);
    console.log('CurveUsdPayback deployed to:', curveUsdPayback.address);
    console.log('CompoundV3Withdraw deployed to:', compoundV3Withdraw.address);
    console.log('CompoundV3Payback deployed to:', compoundV3Payback.address);
    console.log('CompoundV3RatioCheck deployed to:', compoundV3RatioCheck.address);
    console.log('CompoundV3Borrow deployed to:', compoundV3Borrow.address);
    console.log('CompoundV3Supply deployed to:', compoundV3Supply.address);

    console.log('RecipeExecutor deployed to:', recipeExecutor.address);
    console.log('SafeModuleAuth deployed to:', safeModuleAuth.address);
    console.log('StrategyExecutor deployed to:', strategyExecutor.address);

    console.log('FLAction deployed to:', flAction.address);
    console.log('DFSSell deployed to:', dfsSell.address);
    console.log('LimitSell deployed to:', limitSell.address);
    console.log('LSVSell deployed to:', lsvSell.address);

    process.exit(0);
}

main();
