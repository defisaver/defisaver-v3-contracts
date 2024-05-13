/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();
const hre = require('hardhat');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { topUp } = require('../../scripts/utils/fork');
const { getOwnerAddr } = require('../utils');
const { Wallet } = require('ethers');
const { addBotCallerForTxRelay, determineAdditionalGasUsedInTxRelay, createEmptyOffchainOrder } = require('./utils-tx-relay');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const { default: axios } = require('axios');

const app = express();
const port = 7777;
const TX_RELAY_EXECUTOR_ADDR = '0x83c018517a6FAF3EAc8e33b02E8de392033883A6';
const DFS_SELL_ADDR = '0xF6388C2FA7124dd3B0Df57aa96D07EACD2ABd105';
const DFS_SELL_SELECTOR = '0x7f2a0f35';

//TODO:
const tenderlyEstimateGas = async (botAddr, callData) => {
    const payload = {
        jsonrpc: "2.0",
        id: 0,
        method: "eth_estimateGas",
        params: [
            {
                from: botAddr,
                to: TX_RELAY_EXECUTOR_ADDR,
                gas: "0x0",
                gasPrice: "0x0",
                value: "0x0",
                data: callData
            },
            "latest"
        ]
    };
        
    const res = await fetch(`https://mainnet.gateway.tenderly.co/...`, {
        method: 'POST',
        headers:  {
            'Content-Type': 'application/json',
            'X-Access-Key': process.env.TENDERLY_ACCESS_KEY,
        },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Failed to estimate gas for transaction: ${data?.error?.message}`);

    console.log("______________________________________");
    console.log(data.gasUsed);
}

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
        shouldTakeGasFeeFromPosition
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

    const txRelayExecutor = await hre.ethers.getContractAt('TxRelayExecutor', TX_RELAY_EXECUTOR_ADDR);
    const dfsSellAction = await hre.ethers.getContractAt('DFSSell', DFS_SELL_ADDR);
    const txRelayExecutorByBot = txRelayExecutor.connect(botAcc);

    const txParams = {
        value,
        safe,
        data: hre.ethers.utils.arrayify(data),
        signatures: hre.ethers.utils.arrayify(signatures),
    };

    let recipe;
    let txRelaySignedData;

    if (shouldTakeGasFeeFromPosition) {
        r = await txRelayExecutorByBot.parseTxRelaySignedDataForPositionFee(txParams.data);
        recipe = r.recipe;
        txRelaySignedData = r.txRelayData;
    } else {
        r = await txRelayExecutorByBot.parseTxRelaySignedDataForEoaFee(txParams.data);
        recipe = r.recipe;
        txRelaySignedData = r.txRelayData;
    }

    console.log(recipe);
    console.log(txRelaySignedData);

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

        if (txRelaySignedData.allowOrderInjection) {

            const actionIndex = recipe.actionIds.findIndex(id => id === '0x7f2a0f35');
            const dfsSellCalldata = actionIndex !== -1 ? recipe.callData[actionIndex] : undefined;
            
            const parsedDfsSellParams = await dfsSellAction.parseInputs(
                hre.ethers.utils.arrayify(dfsSellCalldata)
            );
            console.log('Parsed dfs sell params');
            console.log(parsedDfsSellParams);
            const exchangeData = parsedDfsSellParams.exchangeData;
            const amount = exchangeData.srcAmount;
            const sellAssetInfo = getAssetInfoByAddress(exchangeData.srcAddr);
            const buyAssetInfo = getAssetInfoByAddress(exchangeData.destAddr);
            const networkId = '1';
            const paraswapWrapper = '0xc351E45DB65d68585E180795537563d33b3716E7';
            const options = {
                method: 'GET',
                baseURL: 'https://apiv5.paraswap.io',
                url: `/prices?srcToken=${sellAssetInfo.address}&srcDecimals=${sellAssetInfo.decimals}&destToken=${buyAssetInfo.address}&destDecimals=${buyAssetInfo.decimals}&amount=${amount}&side=SELL&network=${networkId}`,
            };
            const priceObject = await axios(options).then((response) => response.data.priceRoute);

            console.log(`Price object ${priceObject}`);

            const secondOptions = {
                method: 'POST',
                baseURL: 'https://apiv5.paraswap.io/transactions/1?ignoreChecks=true',
                data: {
                    priceRoute: priceObject,
                    srcToken: priceObject.srcToken,
                    destToken: priceObject.destToken,
                    srcAmount: priceObject.srcAmount,
                    userAddress: paraswapWrapper,
                    partner: 'paraswap.io',
                    srcDecimals: priceObject.srcDecimals,
                    destDecimals: priceObject.destDecimals,
                    slippage: 1000,
                    txOrigin: eoa,
                },
            };
            const resultObject = await axios(secondOptions).then((response) => response.data);

            // THIS IS CHANGEABLE WITH API INFORMATION
            const allowanceTarget = priceObject.tokenTransferProxy;
            const price = 1; // just for testing, anything bigger than 0 triggers offchain if
            const protocolFee = 0;
            const callData = resultObject.data;

            let amountInHex = hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [priceObject.srcAmount]);
            amountInHex = amountInHex.slice(2);

            let offset = callData.toString().indexOf(amountInHex);
            offset = offset / 2 - 1;

            const paraswapSpecialCalldata = hre.ethers.utils.defaultAbiCoder.encode(['(bytes,uint256)'], [[callData, offset]]);

            const offchainOrder = [
                paraswapWrapper,
                priceObject.contractAddress,
                allowanceTarget,
                price,
                protocolFee,
                paraswapSpecialCalldata
            ];
            console.log(`Offchain order ${offchainOrder}`);
        
            receipt = await txRelayExecutorByBot.executeTxTakingFeeFromPosition(
                txParams,
                estimatedGas,
                offchainOrder,
                {
                    gasLimit: 8000000,
                }
            );

        } else {
            receipt = await txRelayExecutorByBot.executeTxTakingFeeFromPosition(
                txParams,
                estimatedGas,
                createEmptyOffchainOrder(),
                {
                    gasLimit: 8000000,
                }
            );
        }
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
            }
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
