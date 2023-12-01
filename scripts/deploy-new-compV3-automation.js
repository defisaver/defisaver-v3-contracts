/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network } = require('../test/utils');
const { createNewCompV3AutomationBundles } = require('../test/utils-compV3');

async function main() {
    const {
        repayBundleId,
        boostBundleId,
        repayBundleEOAId,
        boostBundleEOAId,
    } = await createNewCompV3AutomationBundles();

    console.log(repayBundleId, boostBundleId, repayBundleEOAId, boostBundleEOAId);

    // TODO: check for deployment process

    // await redeploy(
    //     'CompV3SubProxy', addrs[network].REGISTRY_ADDR, false, false, repayBundleId, boostBundleId, repayBundleEOAId, boostBundleEOAId,
    // );

    process.exit(0);
}

start(main);
