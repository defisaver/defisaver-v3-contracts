/* eslint-disable import/no-extraneous-dependencies */
const hre = require('hardhat');
const { start } = require('./utils/starter');

const {
    redeploy,
    getOwnerAddr,
} = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);
    await topUp(getOwnerAddr());

    const compV2View = await redeploy('CompView', true);
    console.log('CompView deployed to:', compV2View.address);

    const compV3View = await redeploy('CompV3View', true);
    console.log('CompV3View deployed to:', compV3View.address);

    const aaveV2View = await redeploy('AaveView', true);
    console.log('AaveView deployed to:', aaveV2View.address);

    const aaveV3View = await redeploy('AaveV3View', true);
    console.log('AaveV3View deployed to:', aaveV3View.address);

    const sparkView = await redeploy('SparkView', true);
    console.log('SparkView deployed to:', sparkView.address);

    const morphoView = await redeploy('MorphoBlueView', true);
    console.log('MorphoBlueView deployed to:', morphoView.address);

    process.exit(0);
}

start(main);
