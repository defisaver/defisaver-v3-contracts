/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();
const hre = require('hardhat');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { topUp } = require('../../scripts/utils/fork');
const { getOwnerAddr, addrs } = require('../utils');
const { addBotCaller } = require('../utils-strategies');
const { Wallet } = require('ethers');

const app = express();
const port = 7777;

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
    } = req.body;

    console.log('Received data:');
    console.log('Value:', value);
    console.log('Safe:', safe);
    console.log('Data:', data);
    console.log('EOA:', eoa);
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
    await addBotCaller(botAcc.address, addrs.mainnet.REGISTRY_ADDR, true);

    const txRelayExecutor = await hre.ethers.getContractAt('TxRelayExecutor', '0xb3d3dFf3d68539F6a1bb51e56B7dC8d515aE8978');
    const txRelayExecutorByBot = txRelayExecutor.connect(botAcc);

    const txParams = {
        value,
        safe,
        data: hre.ethers.utils.arrayify(data),
        signatures: hre.ethers.utils.arrayify(signatures),
    };

    // @dev only personal_sign is supported on frontend for now
    // so adapt signature for safe validation
    const sigSplitted = hre.ethers.utils.splitSignature(txParams.signatures);
    console.log(sigSplitted);
    if (sigSplitted.v < 31) {
        const v = sigSplitted.v + 4;
        const r = sigSplitted.r.slice(2);
        const s = sigSplitted.s.slice(2);
        const vHex = v.toString(16).padStart(2, '0');
        const adaptedSig = `0x${r}${s}${vHex}`;
        txParams.signatures = hre.ethers.utils.arrayify(adaptedSig);
    }
    console.log(txParams.signatures);

    const receipt = await txRelayExecutorByBot.executeTxUsingFeeTokens(txParams, {
        gasLimit: 8000000,
    });

    const result = await hre.ethers.provider.getTransactionReceipt(receipt.hash);

    console.log('Transaction hash:', receipt.hash);
    console.log(result);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
