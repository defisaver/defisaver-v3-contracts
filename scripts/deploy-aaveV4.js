const hre = require('hardhat');
const { topUp } = require('./utils/fork');
const { getOwnerAddr, redeploy, network } = require('../test/utils/utils');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);
    await topUp(getOwnerAddr(), network);

    const aaveV4View = await redeploy('AaveV4View', true);
    const aaveV4Supply = await redeploy('AaveV4Supply', true);
    const aaveV4Borrow = await redeploy('AaveV4Borrow', true);
    const aaveV4Payback = await redeploy('AaveV4Payback', true);
    const aaveV4Withdraw = await redeploy('AaveV4Withdraw', true);
    const aaveV4CollateralSwitch = await redeploy('AaveV4CollateralSwitch', true);
    const aaveV4StoreRatio = await redeploy('AaveV4StoreRatio', true);
    const aaveV4RatioCheck = await redeploy('AaveV4RatioCheck', true);
    const aaveV4RatioTrigger = await redeploy('AaveV4RatioTrigger', true);
    const aaveV4QuotePriceTrigger = await redeploy('AaveV4QuotePriceTrigger', true);
    const aaveV4QuotePriceRangeTrigger = await redeploy('AaveV4QuotePriceRangeTrigger', true);

    console.log('AaveV4View:', aaveV4View.address);
    console.log('AaveV4Supply:', aaveV4Supply.address);
    console.log('AaveV4Borrow:', aaveV4Borrow.address);
    console.log('AaveV4Payback:', aaveV4Payback.address);
    console.log('AaveV4Withdraw:', aaveV4Withdraw.address);
    console.log('AaveV4CollateralSwitch:', aaveV4CollateralSwitch.address);
    console.log('AaveV4StoreRatio:', aaveV4StoreRatio.address);
    console.log('AaveV4RatioCheck:', aaveV4RatioCheck.address);
    console.log('AaveV4RatioTrigger:', aaveV4RatioTrigger.address);
    console.log('AaveV4QuotePriceTrigger:', aaveV4QuotePriceTrigger.address);
    console.log('AaveV4QuotePriceRangeTrigger:', aaveV4QuotePriceRangeTrigger.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
