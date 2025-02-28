/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { configure } = require('@defisaver/sdk');
const { start } = require('./utils/starter');
const {
    addrs,
    getOwnerAddr,
    openStrategyAndBundleStorage,
    network,
    getNetwork,
    redeploy,
} = require('../test/utils');
const { topUp } = require('./utils/fork');
const { addBotCaller, createStrategy, createBundle } = require('../test/utils-strategies');
const {
    createMorphoBlueBoostOnTargetPriceL2Strategy,
    createMorphoBlueFLBoostOnTargetPriceL2Strategy,
} = require('../test/l2-strategies');
const { createMorphoBlueBoostOnTargetPriceStrategy, createMorphoBlueFLBoostOnTargetPriceStrategy } = require('../test/strategies');

const deployBoostOnPriceBundle = async (isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const boostOnPriceStrategy = getNetwork() === 'mainnet'
        ? createMorphoBlueBoostOnTargetPriceStrategy()
        : createMorphoBlueBoostOnTargetPriceL2Strategy();
    const flBoostOnPriceStrategy = getNetwork() === 'mainnet'
        ? createMorphoBlueFLBoostOnTargetPriceStrategy()
        : createMorphoBlueFLBoostOnTargetPriceL2Strategy();
    const boostOnPriceStrategyId = await createStrategy(...boostOnPriceStrategy, false);
    const flBoostOnPriceStrategyId = await createStrategy(
        undefined, ...flBoostOnPriceStrategy, false,
    );
    const boostOnPriceBundleId = await createBundle(
        undefined, [boostOnPriceStrategyId, flBoostOnPriceStrategyId],
    );
    return boostOnPriceBundleId;
};

async function main() {
    if (getNetwork() !== 'mainnet') {
        configure({
            chainId: 8453,
            testMode: true,
        });
    }
    const isFork = true;
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);
    await topUp(getOwnerAddr());

    const l2BotAccounts = [
        '0x61fe1bdcd91E8612a916f86bA50a3EDF3E5654c4',
        '0xC561281982c3042376eB8242d6A78Ab18062674F',
    ];
    const l1BotAccounts = [
        '0x1b6c1a0e20af6f8b7f7b9e3e2f3b3d3d5f1b0e5a',
        '0x660B3515F493200C47Ef3DF195abEAfc57Bd6496',
        '0x61fe1bdcd91E8612a916f86bA50a3EDF3E5654c4',
        '0xC561281982c3042376eB8242d6A78Ab18062674F',
    ];
    const bots = getNetwork() === 'mainnet' ? l1BotAccounts : l2BotAccounts;
    for (let i = 0; i < bots.length; ++i) {
        await topUp(bots[i]);
        await addBotCaller(bots[i], isFork);
    }

    const morphoBluePriceTrigger = await redeploy('MorphoBluePriceTrigger', isFork);
    const morphoBlueTargetRatioCheck = await redeploy('MorphoBlueTargetRatioCheck', isFork);
    console.log('MorphoBluePriceTrigger:', morphoBluePriceTrigger.address);
    console.log('MorphoBlueTargetRatioCheck:', morphoBlueTargetRatioCheck.address);

    const boostOnPriceBundleId = await deployBoostOnPriceBundle(isFork);
    console.log('BoostOnPriceBundle:', boostOnPriceBundleId);

    process.exit(0);
}

start(main);
