/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { 
    addToExchangeAggregatorRegistry,
    setNewExchangeWrapper,
    approveContractInRegistry,
} = require('../test/utils');

const { topUp } = require('./utils/fork');

const kyberAggregatorWrapper = '0x8B1a87076077EDe7932d44d8462518Ca6FEb5c98';
const oneInchWrapper = '0x63e988f4b30245F9f4Ee898531e0BE3FeE20B170';
const paraswapWrapper = '0xc351E45DB65d68585E180795537563d33b3716E7';
const zeroxWrapper = '0x11e048f19844B7bAa6D9eA4a20eD4fACF7b757b2';
const curveWrapperV3 = '0xB1FF460905BA6265C85c7Be723513C3123DF18a6';
const kyberWrapperV3 = '0x29b5fF8C67B94F478C6D9308015AB0D250BD21D8';
const uniswapWrapper = '0x438991da46971b662769386C3b9c067F6fD79f33';
const uniV3WrapperV3 = '0x54810f6a123B193bb0531C7192B62435Ac468d20';

const oneInchTargetAddr = '0x1111111254eeb25477b68fb85ed929f73a960582'; // ok
const zeroXTargetAddr = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF'; // ok
const kyberTargetAddr = '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5'; // ok
const paraswapTargetAddr = '0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57'; // ok

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    await approveContractInRegistry('CreateSub');
    // await approveContractInRegistry('StrategyExecutor');
    // await approveContractInRegistry('StrategyExecutorID');
    // await approveContractInRegistry('DFSSell');
    // await approveContractInRegistry('LimitSell');
    // await approveContractInRegistry('FLAction');

    // await approveContractInRegistry('FLMaker');
    // await approveContractInRegistry('FLBalancer');
    // await approveContractInRegistry('SendTokenAndUnwrap');
    // await approveContractInRegistry('SendTokens');
    // await approveContractInRegistry('SendToken');
    // await approveContractInRegistry('CurveUsdRepay');
    // await approveContractInRegistry('CurveUsdPayback');
    // await approveContractInRegistry('CompV3Withdraw');
    // await approveContractInRegistry('CompV3Payback');
    // await approveContractInRegistry('CompV3RatioCheck');
    // await approveContractInRegistry('CompV3Borrow');
    // await approveContractInRegistry('CompV3Supply');

    // Set exchange wrapper addresses
    // await setNewExchangeWrapper('KyberAggregatorWrapper', kyberAggregatorWrapper, true);
    // await setNewExchangeWrapper('OneInchWrapper', oneInchWrapper, true);
    // await setNewExchangeWrapper('ParaswapWrapper', paraswapWrapper, true);
    // await setNewExchangeWrapper('ZeroxWrapper', zeroxWrapper, true);
    // await setNewExchangeWrapper('CurveWrapperV3', curveWrapperV3, true);
    // await setNewExchangeWrapper('KyberWrapperV3', kyberWrapperV3, true);
    // await setNewExchangeWrapper('UniswapWrapperV3', uniswapWrapper, true);
    // await setNewExchangeWrapper('UniV3WrapperV3', uniV3WrapperV3, true);

    // // Set target contracts for exchanges
    // await addToExchangeAggregatorRegistry(senderAcc, oneInchTargetAddr, true);
    // await addToExchangeAggregatorRegistry(senderAcc, zeroXTargetAddr, true);
    // await addToExchangeAggregatorRegistry(senderAcc, kyberTargetAddr, true);
    // await addToExchangeAggregatorRegistry(senderAcc, paraswapTargetAddr, true);


    console.log('Change done!');
    process.exit(0);
}

main();
