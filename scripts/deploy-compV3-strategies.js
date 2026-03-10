const hre = require('hardhat');
const { topUp } = require('./utils/fork');
const { getOwnerAddr, redeploy, network } = require('../test/utils/utils');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);
    await topUp(getOwnerAddr(), network);

    const compV3RatioCheck = await redeploy('CompV3RatioCheck', true);
    const compV3RatioTrigger = await redeploy('CompV3RatioTrigger', true);

    console.log('CompV3RatioCheck:', compV3RatioCheck.address);
    console.log('CompV3RatioTrigger:', compV3RatioTrigger.address);

    const compV3Borrow = await redeploy('CompV3Borrow', true);
    const compV3Payback = await redeploy('CompV3Payback', true);
    const compV3Supply = await redeploy('CompV3Supply', true);
    const compV3Withdraw = await redeploy('CompV3Withdraw', true);

    console.log('CompV3Borrow:', compV3Borrow.address);
    console.log('CompV3Payback:', compV3Payback.address);
    console.log('CompV3Supply:', compV3Supply.address);
    console.log('CompV3Withdraw:', compV3Withdraw.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
