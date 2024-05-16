/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();
const { Wallet } = require('ethers');
const hre = require('hardhat');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { topUp } = require('../../scripts/utils/fork');
const { getOwnerAddr, getContractFromRegistry, addrs } = require('../utils');
const {
    addBotCallerForTxRelay,
    determineAdditionalGasUsedInTxRelay,
    emptyOffchainOrder,
} = require('./utils-tx-relay');

const app = express();
const port = 7777;
const DFS_SELL_SELECTOR = '0x7f2a0f35';

const adaptSignatureForSafeCall = (signature) => {
    // @dev only personal_sign is supported on frontend for now
    // so adapt signature for safe validation
    const sigSplitted = hre.ethers.utils.splitSignature(signature);
    console.log(sigSplitted);
    if (sigSplitted.v < 31) {
        const v = sigSplitted.v + 4;
        const r = sigSplitted.r.slice(2);
        const s = sigSplitted.s.slice(2);
        const vHex = v.toString(16).padStart(2, '0');
        const adaptedSig = `0x${r}${s}${vHex}`;
        return hre.ethers.utils.arrayify(adaptedSig);
    }
    return signature;
};

app.use(bodyParser.json());
app.use(cors());
app.post('/tx-relay', async (req, res) => {
    const {
        value,
        safe,
        data,
        eoa,
        messageHash,
        signatures,
        shouldTakeGasFeeFromPosition,
    } = req.body;

    console.log('Received data:');
    console.log('Value:', value);
    console.log('Safe:', safe);
    console.log('Data:', data);
    console.log('EOA:', eoa);
    console.log('Message Hash:', messageHash);
    console.log('Signatures:', signatures);
    console.log('Should take gas fee from position:', shouldTakeGasFeeFromPosition);

    res.status(200).send({
        status: 'Success',
    });

    const provider = new hre.ethers.providers.JsonRpcProvider(`https://rpc.tenderly.co/fork/${process.env.FORK_ID}`);
    hre.ethers.provider = provider;

    const botWallet = new Wallet(process.env.PRIV_KEY_MAINNET);
    const botAcc = botWallet.connect(provider);

    await topUp(botAcc.address);
    await topUp(getOwnerAddr());
    await addBotCallerForTxRelay(botAcc.address, true);

    const txRelayExecutor = await getContractFromRegistry('TxRelayExecutor', addrs.mainnet.REGISTRY_ADDR, false, true);
    const txRelayExecutorByBot = txRelayExecutor.connect(botAcc);

    const txParams = {
        value,
        safe,
        data: hre.ethers.utils.arrayify(data),
        signatures: hre.ethers.utils.arrayify(signatures),
    };

    const parsedTxRelayData = await txRelayExecutorByBot.parseTxRelaySignedData(txParams.data);
    const recipe = parsedTxRelayData.recipe;
    const txRelaySignedData = parsedTxRelayData.txRelayData;

    console.log(recipe);
    console.log(txRelaySignedData);

    txParams.signatures = adaptSignatureForSafeCall(txParams.signatures);

    const recipeHasDFSSellAction = recipe.actionIds.some((id) => id === DFS_SELL_SELECTOR);

    let receipt;

    if (shouldTakeGasFeeFromPosition) {
        if (!recipeHasDFSSellAction) {
            console.error('Recipe does not have DFSSell action');
            res.status(400).send({
                status: 'Error',
            });
        }
        const estimatedGas = 500000; // TODO: do actual gas estimate
        receipt = await txRelayExecutorByBot.executeTxTakingFeeFromPosition(
            txParams,
            estimatedGas,
            emptyOffchainOrder,
            {
                gasLimit: 8000000,
            },
        );
    } else {
        const additionalGasUsed = determineAdditionalGasUsedInTxRelay(txRelaySignedData.feeToken);
        let percentageOfLoweringTxCost = 0;
        if (recipeHasDFSSellAction) {
            percentageOfLoweringTxCost = 12;
        }
        receipt = await txRelayExecutorByBot.executeTxTakingFeeFromEoaOrWallet(
            txParams,
            additionalGasUsed,
            percentageOfLoweringTxCost,
            {
                gasLimit: 8000000,
            },
        );
    }

    const result = await hre.ethers.provider.getTransactionReceipt(receipt.hash);

    console.log('Transaction hash:', receipt.hash);
    console.log(result);
    console.log('====================================================');
    if (result.status === 0) {
        console.error('TX FAILED');
    } else {
        console.log('TX SUCCEEDED');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
