/* eslint-disable max-len */

const hre = require('hardhat');
const {
    addrs,
    redeploy,
    getOwnerAddr,
} = require('../utils');
const { createSafe } = require('../utils-safe');
const { topUp } = require('../../scripts/utils/fork');
const { addBotCallerForTxRelay } = require('./utils-tx-relay');

describe('Deploy tx relay contracts', function () {
    this.timeout(80000);
    let senderAcc;
    let safeWallet;
    const network = 'mainnet';

    const setUpSafeWallet = async () => {
        const safeAddr = await createSafe(senderAcc.address);
        safeWallet = await hre.ethers.getContractAt('ISafe', safeAddr);
    };

    const redeployContracts = async (isFork) => {
        const bothAuthForTxRelay = await redeploy('BotAuthForTxRelay', addrs[network].REGISTRY_ADDR, false, isFork);
        const recipeExecutor = await redeploy('RecipeExecutor', addrs[network].REGISTRY_ADDR, false, isFork);
        const dfsSell = await redeploy('DFSSell', addrs[network].REGISTRY_ADDR, false, isFork);
        const txRelayExecutor = await redeploy('TxRelayExecutor', addrs[network].REGISTRY_ADDR, false, isFork);

        console.log('Sender:', senderAcc.address);
        console.log('Safe wallet:', safeWallet.address);
        console.log('BotAuthForTxRelay:', bothAuthForTxRelay.address);
        console.log('RecipeExecutor:', recipeExecutor.address);
        console.log('DFSSell:', dfsSell.address);
        console.log('TxRelayExecutor:', txRelayExecutor.address);
    };

    before(async () => {
        const isFork = hre.network.name === 'fork';
        console.log('isFork', isFork);

        senderAcc = (await hre.ethers.getSigners())[0];
        const botAcc = '0x61fe1bdcd91E8612a916f86bA50a3EDF3E5654c4';

        if (isFork) {
            await topUp(senderAcc.address);
            await topUp(botAcc);
            await topUp(getOwnerAddr());
        }

        await setUpSafeWallet();
        await redeployContracts(isFork);
        await addBotCallerForTxRelay(botAcc, isFork);
    });

    it('Deploy', async () => {
    });
});
