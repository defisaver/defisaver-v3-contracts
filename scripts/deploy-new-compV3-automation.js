/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');

const { topUp } = require('./utils/fork');
const { redeploy, addrs, network } = require('../test/utils');
const { createNewCompV3AutomationBundles } = require('../test/utils-compV3');
const { openStrategyAndBundleStorage } = require('../test/utils');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    await openStrategyAndBundleStorage(true);

    const {
        repayBundleId,
        boostBundleId,
        repayBundleEOAId,
        boostBundleEOAId,
    } = await createNewCompV3AutomationBundles();

    console.log(repayBundleId, boostBundleId, repayBundleEOAId, boostBundleEOAId);

    await redeploy(
        'CompV3SubProxy', addrs[network].REGISTRY_ADDR, true, true, repayBundleId, boostBundleId, repayBundleEOAId, boostBundleEOAId,
    );

    process.exit(0);
}

main();
