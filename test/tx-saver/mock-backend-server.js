/* eslint-disable max-len */
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
    addBotCallerForTxSaver,
    emptyInjectedOrder,
} = require('./utils-tx-saver');

const app = express();
const port = 7777;
const DFS_SELL_SELECTOR = '0x7f2a0f35';
const LLAMA_LEND_BOOST_SELECTOR = '0xe339d237';
const LLAMA_LEND_LEV_CREATE_SELECTOR = '0xa7dbc75a';
const LLAMA_LEND_REPAY_SELECTOR = '0x731a2ce5';
const LLAMA_LEND_SELF_LIQUIDATE_WITH_COLL_SELECTOR = '0x74ba5125';

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
app.post('/tx-saver', async (req, res) => {
    const {
        safe,
        data,
        eoa,
        refundReceiver,
        messageHash,
        signatures,
    } = req.body;

    console.log('Received data:');
    console.log('Safe:', safe);
    console.log('Data:', data);
    console.log('EOA:', eoa);
    console.log('Refund Receiver:', refundReceiver);
    console.log('Message Hash:', messageHash);
    console.log('Signatures:', signatures);

    res.status(200).send({
        status: 'Success',
    });

    const provider = new hre.ethers.providers.JsonRpcProvider(`https://rpc.tenderly.co/fork/${process.env.FORK_ID}`);
    hre.ethers.provider = provider;

    const botWallet = new Wallet(process.env.PRIV_KEY_MAINNET);
    const botAcc = botWallet.connect(provider);

    await topUp(botAcc.address);
    await topUp(getOwnerAddr());
    await addBotCallerForTxSaver(botAcc.address, true);

    const txSaverExecutor = await getContractFromRegistry('TxSaverExecutor', addrs.mainnet.REGISTRY_ADDR, false, true);
    const txSaverExecutorByBot = txSaverExecutor.connect(botAcc);

    const txParams = {
        safe,
        refundReceiver,
        data: hre.ethers.utils.arrayify(data),
        signatures: hre.ethers.utils.arrayify(signatures),
    };

    const parsedTxSaverData = await txSaverExecutorByBot.parseTxSaverSignedData(txParams.data);
    const recipe = parsedTxSaverData.recipe;
    const txSaverSignedData = parsedTxSaverData.txSaverData;

    console.log(recipe);
    console.log(txSaverSignedData);

    txParams.signatures = adaptSignatureForSafeCall(txParams.signatures);

    const allowedDFSSellSelectors = [
        DFS_SELL_SELECTOR,
        LLAMA_LEND_BOOST_SELECTOR,
        LLAMA_LEND_LEV_CREATE_SELECTOR,
        LLAMA_LEND_REPAY_SELECTOR,
        LLAMA_LEND_SELF_LIQUIDATE_WITH_COLL_SELECTOR,
    ];

    const recipeHasSellAction = recipe.actionIds.some((id) => allowedDFSSellSelectors.includes(id));

    const estimatedGas = 500000; // TODO: do actual gas estimate

    if (txSaverSignedData.shouldTakeFeeFromPosition) {
        if (!recipeHasSellAction) {
            console.error('Recipe does not have sell action');
            res.status(400).send({
                status: 'Error',
            });
        }
    }
    const l1GasCostInEth = 0;
    console.log(txSaverExecutorByBot.address);
    console.log(emptyInjectedOrder);
    const receipt = await txSaverExecutorByBot.executeTx(
        txParams,
        estimatedGas,
        l1GasCostInEth,
        emptyInjectedOrder,
        {
            gasLimit: 8000000,
        },
    );

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
