/* eslint-disable max-len */

const hre = require('hardhat');
const {
    addrs,
    redeploy,
    getOwnerAddr,
} = require('../utils');
const { createSafe } = require('../utils-safe');
const { topUp } = require('../../scripts/utils/fork');
const { addBotCallerForTxSaver } = require('./utils-tx-saver');

describe('Deploy tx saver contracts', function () {
    this.timeout(80000);
    let senderAcc;
    let safeWallet;
    const network = 'mainnet';

    const setUpSafeWallet = async () => {
        const safeAddr = await createSafe(senderAcc.address);
        safeWallet = await hre.ethers.getContractAt('ISafe', safeAddr);
    };

    const redeployContracts = async (isFork) => {
        const bothAuthForTxSaver = await redeploy('BotAuthForTxSaver', addrs[network].REGISTRY_ADDR, false, isFork);
        const recipeExecutor = await redeploy('RecipeExecutor', addrs[network].REGISTRY_ADDR, false, isFork);
        const dfsSell = await redeploy('DFSSell', addrs[network].REGISTRY_ADDR, false, isFork);
        const llamaLendSwapper = await redeploy('LlamaLendSwapper', addrs[network].REGISTRY_ADDR, false, isFork);
        const txSaverExecutor = await redeploy('TxSaverExecutor', addrs[network].REGISTRY_ADDR, false, isFork);

        console.log('Sender:', senderAcc.address);
        console.log('Safe wallet:', safeWallet.address);
        console.log('BotAuthForTxSaver:', bothAuthForTxSaver.address);
        console.log('RecipeExecutor:', recipeExecutor.address);
        console.log('DFSSell:', dfsSell.address);
        console.log('LlamaLendSwapper:', llamaLendSwapper.address);
        console.log('TxSaverExecutor:', txSaverExecutor.address);
    };

    before(async () => {
        const isFork = hre.network.name === 'fork';
        console.log('isFork', isFork);

        senderAcc = (await hre.ethers.getSigners())[0];

        const botAcc1 = '0x61fe1bdcd91E8612a916f86bA50a3EDF3E5654c4';
        const botAcc2 = '0xC561281982c3042376eB8242d6A78Ab18062674F';
        const botAcc3 = '0x660B3515F493200C47Ef3DF195abEAfc57Bd6496';
        const botAcc4 = '0xF14e7451A6836725481d8E9042C22117b2039539';

        if (isFork) {
            await topUp(senderAcc.address);
            await topUp(botAcc1);
            await topUp(botAcc2);
            await topUp(botAcc3);
            await topUp(botAcc4);
            await topUp(getOwnerAddr());
        }

        await setUpSafeWallet();
        await redeployContracts(isFork);
        await addBotCallerForTxSaver(botAcc1, isFork);
        await addBotCallerForTxSaver(botAcc2, isFork);
        await addBotCallerForTxSaver(botAcc3, isFork);
        await addBotCallerForTxSaver(botAcc4, isFork);
    });

    it('Deploy', async () => {
    });
});
