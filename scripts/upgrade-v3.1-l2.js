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

// Arbitrum
// const kyberAggregatorWrapper = '0x08a110FD330F62A92F23e1C504c9c4e9b43eeBB6';
// const oneInchWrapper = '0xC20D9974304B5fCB3cF9DE2F985829546b290660';
// const paraswapWrapper = '0x6a1Ebcb09D419Affe500B4feA13A89511aD23c1b';
// const zeroxWrapper = '0x94a58e456F1De766b13e45104D79201A218c1607';
// const curveWrapperV3 = '0x506bC549432Ae8357385C86a20163960E3C9b33b';
// const uniV3WrapperV3 = '0x6945432Cc46B2956Cd4583836c463284212d96A6';


// Optimism
const kyberAggregatorWrapper = '0xd94BeaAC0d40fDe0F85D2172DC568E9CfC4C389E';
const oneInchWrapper = '0xCcCacf99C7Fe354b88E428cCfba282431F7a8da2';
const paraswapWrapper = '0xf6E18D389dd4e1E76C5aAb4b34E3e64e70569F43';
const zeroxWrapper = '0x031D6d3C95dD2188D1A1A57e8DcD8051f3B938ca';
const curveWrapperV3 = '0x2d262e1c4210B7e6Bc5C7013A338e22aF01BD5A2';
const uniV3WrapperV3 = '0x836905C8dBE5887060c3E367578B4676901163A0';

const oneInchTargetAddr = '0x1111111254eeb25477b68fb85ed929f73a960582'; // ok
// const zeroXTargetAddr = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF'; // arbitrum
const zeroXTargetAddr = '0xDEF1ABE32c034e558Cdd535791643C58a13aCC10'; // optimism
const kyberTargetAddr = '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5'; // ok
const paraswapTargetAddr = '0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57'; // ok

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    await approveContractInRegistry('RecipeExecutor');
    await approveContractInRegistry('StrategyExecutor'); // on optimism
    await approveContractInRegistry('StrategyExecutorID');
    await approveContractInRegistry('DFSSell');
    await approveContractInRegistry('LimitSellL2');
    await approveContractInRegistry('FLAction');
    await approveContractInRegistry('FLActionL2');

    await approveContractInRegistry('SendTokenAndUnwrap');
    await approveContractInRegistry('SendTokens');
    await approveContractInRegistry('SendToken');

    // Set exchange wrapper addresses
    await setNewExchangeWrapper('KyberAggregatorWrapper', kyberAggregatorWrapper, true);
    await setNewExchangeWrapper('OneInchWrapper', oneInchWrapper, true);
    await setNewExchangeWrapper('ParaswapWrapper', paraswapWrapper, true);
    await setNewExchangeWrapper('ZeroxWrapper', zeroxWrapper, true);
    await setNewExchangeWrapper('CurveWrapperV3', curveWrapperV3, true);
    await setNewExchangeWrapper('UniV3WrapperV3', uniV3WrapperV3, true);

    // Set target contracts for exchanges
    await addToExchangeAggregatorRegistry(senderAcc, oneInchTargetAddr, true);
    await addToExchangeAggregatorRegistry(senderAcc, zeroXTargetAddr, true);
    await addToExchangeAggregatorRegistry(senderAcc, kyberTargetAddr, true);
    await addToExchangeAggregatorRegistry(senderAcc, paraswapTargetAddr, true);


    console.log('Change done!');
    process.exit(0);
}

main();
