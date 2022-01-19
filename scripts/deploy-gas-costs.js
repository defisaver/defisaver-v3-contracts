const { deployContractAndReturnGasUsed } = require('./utils/deployer');
const { start } = require('./utils/starter');

const gasPriceInGwei = 100;
const ethPrice = 3_300;

const calcGasToUSD = (gasUsed) => {
    const ethSpent = (gasUsed * gasPriceInGwei * 1000000000) / 1e18;

    console.log('Eth spent: ', ethSpent);

    console.log(`Dollar cost $${(ethSpent * ethPrice).toFixed(0)}`);
};

async function main() {
    let totalGasUsed = 0;

    totalGasUsed += await deployContractAndReturnGasUsed('ProxyAuth');

    totalGasUsed += await deployContractAndReturnGasUsed('DFSRegistry');

    totalGasUsed += await deployContractAndReturnGasUsed('RecipeExecutor');
    totalGasUsed += await deployContractAndReturnGasUsed('StrategyStorage');
    totalGasUsed += await deployContractAndReturnGasUsed('SubStorage');
    totalGasUsed += await deployContractAndReturnGasUsed('BotAuth');
    totalGasUsed += await deployContractAndReturnGasUsed('BundleStorage');
    totalGasUsed += await deployContractAndReturnGasUsed('SubProxy');
    totalGasUsed += await deployContractAndReturnGasUsed('StrategyProxy');
    totalGasUsed += await deployContractAndReturnGasUsed('StrategyExecutor');

    let lastSnapShot = totalGasUsed;
    console.log(`Core system gas cost: ${(totalGasUsed - lastSnapShot).toString()}`);
    calcGasToUSD(totalGasUsed);

    // mcd actions
    totalGasUsed += await deployContractAndReturnGasUsed('McdSupply');
    totalGasUsed += await deployContractAndReturnGasUsed('McdWithdraw');
    totalGasUsed += await deployContractAndReturnGasUsed('McdGenerate');
    totalGasUsed += await deployContractAndReturnGasUsed('McdPayback');
    totalGasUsed += await deployContractAndReturnGasUsed('McdRatio');
    totalGasUsed += await deployContractAndReturnGasUsed('McdOpen');
    totalGasUsed += await deployContractAndReturnGasUsed('McdGive');
    totalGasUsed += await deployContractAndReturnGasUsed('McdMerge');

    console.log(`Mcd gas cost: ${totalGasUsed.toString()}`);
    calcGasToUSD(totalGasUsed - lastSnapShot);
    lastSnapShot = totalGasUsed;

    // aave actions
    totalGasUsed += await deployContractAndReturnGasUsed('AaveSupply');
    totalGasUsed += await deployContractAndReturnGasUsed('AaveWithdraw');
    totalGasUsed += await deployContractAndReturnGasUsed('AaveBorrow');
    totalGasUsed += await deployContractAndReturnGasUsed('AavePayback');
    totalGasUsed += await deployContractAndReturnGasUsed('AaveCollateralSwitch');
    totalGasUsed += await deployContractAndReturnGasUsed('AaveClaimStkAave');

    console.log(`Aave gas cost: ${(totalGasUsed - lastSnapShot).toString()}`);
    calcGasToUSD(totalGasUsed - lastSnapShot);
    lastSnapShot = totalGasUsed;

    // comp actions
    totalGasUsed += await deployContractAndReturnGasUsed('CompSupply');
    totalGasUsed += await deployContractAndReturnGasUsed('CompWithdraw');
    totalGasUsed += await deployContractAndReturnGasUsed('CompBorrow');
    totalGasUsed += await deployContractAndReturnGasUsed('CompPayback');
    totalGasUsed += await deployContractAndReturnGasUsed('CompClaim');
    totalGasUsed += await deployContractAndReturnGasUsed('CompCollateralSwitch');
    totalGasUsed += await deployContractAndReturnGasUsed('CompGetDebt');

    console.log(`Comp gas cost: ${(totalGasUsed - lastSnapShot).toString()}`);
    calcGasToUSD(totalGasUsed - lastSnapShot);
    lastSnapShot = totalGasUsed;

    // checker
    totalGasUsed += await deployContractAndReturnGasUsed('McdRatioCheck');

    // sell actions
    totalGasUsed += await deployContractAndReturnGasUsed('DFSBuy');
    totalGasUsed += await deployContractAndReturnGasUsed('DFSSell');

    console.log(`Sell and checker gas cost: ${(totalGasUsed - lastSnapShot).toString()}`);
    calcGasToUSD(totalGasUsed - lastSnapShot);
    lastSnapShot = totalGasUsed;

    // fee actions
    totalGasUsed += await deployContractAndReturnGasUsed('GasFeeCalc');
    totalGasUsed += await deployContractAndReturnGasUsed('GasFeeTaker');

    console.log(`Gas fee gas cost: ${(totalGasUsed - lastSnapShot).toString()}`);
    calcGasToUSD(totalGasUsed - lastSnapShot);
    lastSnapShot = totalGasUsed;

    // fee actions
    totalGasUsed += await deployContractAndReturnGasUsed('FLDyDx');
    totalGasUsed += await deployContractAndReturnGasUsed('FLAaveV2');
    totalGasUsed += await deployContractAndReturnGasUsed('FLBalancer');

    console.log(`FL gas cost: ${(totalGasUsed - lastSnapShot).toString()}`);
    calcGasToUSD(totalGasUsed - lastSnapShot);
    lastSnapShot = totalGasUsed;

    // util actions
    totalGasUsed += await deployContractAndReturnGasUsed('ChangeProxyOwner');
    totalGasUsed += await deployContractAndReturnGasUsed('PullToken');
    totalGasUsed += await deployContractAndReturnGasUsed('SendToken');
    totalGasUsed += await deployContractAndReturnGasUsed('SumInputs');
    totalGasUsed += await deployContractAndReturnGasUsed('SubInputs');
    totalGasUsed += await deployContractAndReturnGasUsed('WrapEth');
    totalGasUsed += await deployContractAndReturnGasUsed('TokenBalance');
    totalGasUsed += await deployContractAndReturnGasUsed('UnwrapEth');

    console.log(`Utils cost: ${(totalGasUsed - lastSnapShot).toString()}`);
    calcGasToUSD(totalGasUsed - lastSnapShot);
    lastSnapShot = totalGasUsed;

    // uniswap
    totalGasUsed += await deployContractAndReturnGasUsed('UniSupplyV3');
    totalGasUsed += await deployContractAndReturnGasUsed('UniWithdrawV3');
    totalGasUsed += await deployContractAndReturnGasUsed('UniCollectV3');
    totalGasUsed += await deployContractAndReturnGasUsed('UniCreatePoolV3');
    totalGasUsed += await deployContractAndReturnGasUsed('UniMintV3');

    console.log(`Uni cost: ${(totalGasUsed - lastSnapShot).toString()}`);
    calcGasToUSD(totalGasUsed - lastSnapShot);
    lastSnapShot = totalGasUsed;

    // reflexer
    totalGasUsed += await deployContractAndReturnGasUsed('ReflexerGenerate');
    totalGasUsed += await deployContractAndReturnGasUsed('ReflexerOpen');
    totalGasUsed += await deployContractAndReturnGasUsed('ReflexerPayback');
    totalGasUsed += await deployContractAndReturnGasUsed('ReflexerSupply');
    totalGasUsed += await deployContractAndReturnGasUsed('ReflexerWithdraw');

    console.log(`Reflexer cost: ${(totalGasUsed - lastSnapShot).toString()}`);
    calcGasToUSD(totalGasUsed - lastSnapShot);
    lastSnapShot = totalGasUsed;

    // liquity
    totalGasUsed += await deployContractAndReturnGasUsed('LiquityEthGainToTrove');
    totalGasUsed += await deployContractAndReturnGasUsed('LiquitySPDeposit');
    totalGasUsed += await deployContractAndReturnGasUsed('LiquitySPWithdraw');
    totalGasUsed += await deployContractAndReturnGasUsed('LiquityStake');
    totalGasUsed += await deployContractAndReturnGasUsed('LiquityUnstake');
    totalGasUsed += await deployContractAndReturnGasUsed('LiquityBorrow');
    totalGasUsed += await deployContractAndReturnGasUsed('LiquityClaim');
    totalGasUsed += await deployContractAndReturnGasUsed('LiquityClose');
    totalGasUsed += await deployContractAndReturnGasUsed('LiquityOpen');
    totalGasUsed += await deployContractAndReturnGasUsed('LiquityPayback');
    totalGasUsed += await deployContractAndReturnGasUsed('LiquitySupply');
    totalGasUsed += await deployContractAndReturnGasUsed('LiquityWithdraw');
    totalGasUsed += await deployContractAndReturnGasUsed('LiquityRedeem');

    console.log(`Liquity cost: ${(totalGasUsed - lastSnapShot).toString()}`);
    calcGasToUSD(totalGasUsed - lastSnapShot);
    lastSnapShot = totalGasUsed;

    // lido
    totalGasUsed += await deployContractAndReturnGasUsed('LidoStake');

    console.log(`Lido cost: ${(totalGasUsed - lastSnapShot).toString()}`);
    calcGasToUSD(totalGasUsed - lastSnapShot);
    lastSnapShot = totalGasUsed;

    // insta
    totalGasUsed += await deployContractAndReturnGasUsed('InstPullTokens');

    console.log(`Insta cost: ${(totalGasUsed - lastSnapShot).toString()}`);
    calcGasToUSD(totalGasUsed - lastSnapShot);
    lastSnapShot = totalGasUsed;

    // yearn
    totalGasUsed += await deployContractAndReturnGasUsed('YearnSupply');
    totalGasUsed += await deployContractAndReturnGasUsed('YearnWithdraw');

    console.log(`Yearn cost: ${(totalGasUsed - lastSnapShot).toString()}`);
    calcGasToUSD(totalGasUsed - lastSnapShot);
    lastSnapShot = totalGasUsed;

    totalGasUsed += await deployContractAndReturnGasUsed('DyDxWithdraw');

    console.log(`Total cost: ${(totalGasUsed).toString()}`);
    calcGasToUSD(totalGasUsed);
}

start(main);
