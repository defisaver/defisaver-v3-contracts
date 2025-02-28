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
} = require('../test/utils');
const { topUp } = require('./utils/fork');
const { addBotCaller, createStrategy, createBundle } = require('../test/utils-strategies');
const {
    createMorphoBlueRepayL2Strategy,
    createMorphoBlueFLCollRepayL2Strategy,
    createMorphoBlueFLDebtRepayL2Strategy,
    createMorphoBlueBoostL2Strategy,
    createMorphoBlueFLDebtBoostL2Strategy,
    createMorphoBlueFLCollBoostL2Strategy,
} = require('../test/l2-strategies');

const createRepayBundle = async (isFork) => {
    const repayStrategy = createMorphoBlueRepayL2Strategy();
    const flCollRepayStrategy = createMorphoBlueFLCollRepayL2Strategy();
    const flDebtRepayStrategy = createMorphoBlueFLDebtRepayL2Strategy();
    await openStrategyAndBundleStorage(isFork);
    const strategyIdFirst = await createStrategy(...repayStrategy, true);
    const strategyIdSecond = await createStrategy(...flCollRepayStrategy, true);
    const strategyIdThird = await createStrategy(...flDebtRepayStrategy, true);
    return createBundle(
        undefined,
        [strategyIdFirst, strategyIdSecond, strategyIdThird],
    );
};
const createBoostBundle = async (isFork) => {
    const boostStrategy = createMorphoBlueBoostL2Strategy();
    const flDebtBoostStrategy = createMorphoBlueFLDebtBoostL2Strategy();
    const fLCollBoostStrategy = createMorphoBlueFLCollBoostL2Strategy();
    await openStrategyAndBundleStorage(isFork);
    const strategyIdFirst = await createStrategy(...boostStrategy, true);
    const strategyIdSecond = await createStrategy(...flDebtBoostStrategy, true);
    const strategyIdThird = await createStrategy(...fLCollBoostStrategy, true);
    return createBundle(
        undefined,
        [strategyIdFirst, strategyIdSecond, strategyIdThird],
    );
};

async function main() {
    configure({
        chainId: 8453,
        testMode: true,
    });

    const isFork = true;
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);
    await topUp(getOwnerAddr());

    const l2BotAccounts = [
        '0x61fe1bdcd91E8612a916f86bA50a3EDF3E5654c4',
        '0xC561281982c3042376eB8242d6A78Ab18062674F',
    ];
    for (let i = 0; i < l2BotAccounts.length; ++i) {
        await topUp(l2BotAccounts[i]);
        await addBotCaller(l2BotAccounts[i], isFork);
    }
    const repayBundle = await createRepayBundle(isFork);
    const boostBundle = await createBoostBundle(isFork);

    console.log('RepayBundle:', repayBundle);
    console.log('BoostBundle:', boostBundle);

    process.exit(0);
}

start(main);
