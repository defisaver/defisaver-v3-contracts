/* eslint-disable max-len */
/* eslint-disable camelcase */

const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const { BigNumber } = require('ethers');

const {
    addrs,
    redeploy,
    getOwnerAddr,
    setBalance,
    approve,
    nullAddress,
    getGasUsed,
    calcGasToUSD,
    getAddrFromRegistry,
    takeSnapshot,
    revertToSnapshot,
    balanceOf,
    ETH_ADDR,
    WBTC_ADDR,
    LUSD_ADDR,
    formatExchangeObj,
    WETH_ADDRESS,
    DAI_ADDR,
    getChainLinkPrice,
} = require('../utils');
const {
    signSafeTx,
    predictSafeAddress,
    SAFE_MASTER_COPY_VERSIONS,
    deploySafe,
} = require('../utils-safe');
const { topUp } = require('../../scripts/utils/fork');
const {
    addBotCallerForTxRelay,
    determineAdditionalGasUsedInTxRelay,
    emptyInjectedOffchainOrder,
} = require('./utils-tx-relay');

describe('Tx Relay - test using funds from EOA', function () {
    this.timeout(80000);
    let senderAcc;
    let safeWallet;
    let botAcc;
    let txRelayExecutor;
    let recipeExecutorAddr;
    let snapshotId;
    let tokenPriceHelper;
    const network = 'mainnet';

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    const setUpSafeWallet = async (owner) => {
        const setupData = [
            [owner],
            1, // threshold
            hre.ethers.constants.AddressZero, // to module address
            [], // data for module
            hre.ethers.constants.AddressZero, // fallback handler
            hre.ethers.constants.AddressZero, // payment token
            0, // payment
            hre.ethers.constants.AddressZero, // payment receiver
        ];
        const predictedSafeAddr = await predictSafeAddress(SAFE_MASTER_COPY_VERSIONS.V141, setupData, '0');
        await deploySafe(SAFE_MASTER_COPY_VERSIONS.V141, setupData, '0');
        safeWallet = await hre.ethers.getContractAt('ISafe', predictedSafeAddr);
        console.log('Safe address', safeWallet.address);
    };

    const redeployContracts = async (isFork) => {
        await redeploy('BotAuthForTxRelay', addrs[network].REGISTRY_ADDR, false, isFork);
        await redeploy('RecipeExecutor', addrs[network].REGISTRY_ADDR, false, isFork);
        await redeploy('DFSSell', addrs[network].REGISTRY_ADDR, false, isFork);

        recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor', addrs[network].REGISTRY_ADDR);
        console.log('RecipeExecutor', recipeExecutorAddr);
        txRelayExecutor = await redeploy('TxRelayExecutor', addrs[network].REGISTRY_ADDR, false, isFork);
        console.log('TxRelayExecutor', txRelayExecutor.address);
    };

    before(async () => {
        const isFork = hre.network.name === 'fork';
        console.log('isFork', isFork);

        [senderAcc, botAcc] = await hre.ethers.getSigners();
        await setUpSafeWallet(senderAcc.address);

        if (isFork) {
            await topUp(senderAcc.address);
            await topUp(botAcc.address);
            await topUp(getOwnerAddr());
        }

        await redeployContracts(isFork);
        await addBotCallerForTxRelay(botAcc.address, isFork);

        const tokenPriceHelperFactory = await hre.ethers.getContractFactory('TokenPriceHelper');
        tokenPriceHelper = await tokenPriceHelperFactory.deploy();
        await tokenPriceHelper.deployed();
    });

    const openAavePositionFunctionData = async (txRelayUserSignedData) => {
        const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
        const poolAddress = await aaveMarketContract.getPool();
        const aavePool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

        const supplyToken = WBTC_ADDR;
        const supplyAmount = hre.ethers.utils.parseUnits('10', 8);
        const supplyAssetReserveData = await aavePool.getReserveData(supplyToken);
        const supplyAssetId = supplyAssetReserveData.id;

        const borrowToken = LUSD_ADDR;
        const borrowAmount = hre.ethers.utils.parseUnits('10000', 18);
        const borrowAssetReserveData = await aavePool.getReserveData(borrowToken);
        const borrowAssetReserveDataId = borrowAssetReserveData.id;

        await setBalance(supplyToken, senderAcc.address, supplyAmount);
        await approve(supplyToken, safeWallet.address, senderAcc);

        const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
            true,
            addrs[network].AAVE_MARKET,
            supplyAmount.toString(),
            senderAcc.address,
            supplyToken,
            supplyAssetId,
            true,
            false,
            nullAddress,
        );

        const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
            true,
            addrs[network].AAVE_MARKET,
            borrowAmount.toString(),
            senderAcc.address,
            2,
            borrowAssetReserveDataId,
            false,
            nullAddress,
        );

        const recipe = new dfs.Recipe('AaveV3OpenRecipe-Test', [supplyAction, borrowAction]);

        return recipe.encodeForTxRelayCall(txRelayUserSignedData, false)[1];
    };

    const dfsSellFunctionData = async (
        txRelaySignedData,
        srcToken,
        destToken,
        sellAmount,
    ) => {
        await setBalance(srcToken, senderAcc.address, sellAmount);
        await approve(srcToken, safeWallet.address, senderAcc);

        const recipe = new dfs.Recipe('SellRecipe', [
            new dfs.actions.basic.PullTokenAction(
                srcToken,
                senderAcc.address,
                sellAmount,
            ),
            new dfs.actions.basic.SellAction(
                formatExchangeObj(
                    srcToken,
                    destToken,
                    sellAmount,
                    addrs[network].UNISWAP_WRAPPER,
                ),
                safeWallet.address,
                senderAcc.address,
            ),
        ]);

        return recipe.encodeForTxRelayCall(txRelaySignedData, true)[1];
    };

    const signSafeTransaction = async (functionData) => {
        const safeTxParamsForSign = {
            to: recipeExecutorAddr,
            value: 0,
            data: functionData,
            operation: 1,
            safeTxGas: 0,
            baseGas: 0,
            gasPrice: 0,
            gasToken: hre.ethers.constants.AddressZero,
            refundReceiver: hre.ethers.constants.AddressZero,
            nonce: await safeWallet.nonce(),
        };
        const signature = await signSafeTx(safeWallet, safeTxParamsForSign, senderAcc);
        return signature;
    };

    it('Should take fee from eoa', async () => {
        // TODO[TX-RELAY]: Should we use only permit tokens? If yes, should we also support DAI or only full EIP-2612 standard?

        const feeTokenAsset = getAssetInfo('DAI');
        const feeTokenAddress = feeTokenAsset.address;
        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(feeTokenAddress);
        await setBalance(feeTokenAddress, senderAcc.address, hre.ethers.utils.parseUnits('10000', feeTokenAsset.decimals));
        await approve(feeTokenAddress, safeWallet.address, senderAcc);
        const txRelaySignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('50', feeTokenAsset.decimals),
            feeToken: feeTokenAddress,
            tokenPriceInEth: feeTokenPriceInEth,
        };
        const functionData = await openAavePositionFunctionData(txRelaySignedData);
        const signature = await signSafeTransaction(functionData);

        const txParams = {
            safe: safeWallet.address,
            refundReceiver: nullAddress,
            data: functionData,
            signatures: signature,
        };

        console.log('Fee token price in eth:', feeTokenPriceInEth.toString());
        // ************************** BEFORE ************************************************************************
        const botEthBalanceBefore = await balanceOf(ETH_ADDR, botAcc.address);
        const eoaFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, senderAcc.address);
        const feeRecipientFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, addrs[network].FEE_RECEIVER);
        const txRelayFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, txRelayExecutor.address);

        console.log('[BOT] eth balance before:', botEthBalanceBefore.toString());
        console.log('[EOA] fee token balance before:', eoaFeeTokenBalanceBefore.toString());
        console.log('[FEE RECIPIENT] fee token balance before:', feeRecipientFeeTokenBalanceBefore.toString());
        console.log('[RELAY EXECUTOR] fee token balance before:', txRelayFeeTokenBalanceBefore.toString());

        // ************************* EXECUTION *********************************************************************
        const txRelayExecutorByBot = txRelayExecutor.connect(botAcc);
        const additionalGasUsed = determineAdditionalGasUsedInTxRelay(feeTokenAddress);
        const percentageOfLoweringTxCost = 0;

        const callData = txRelayExecutorByBot.interface.encodeFunctionData('executeTxTakingFeeFromEoaOrWallet', [
            txParams,
            additionalGasUsed,
            percentageOfLoweringTxCost,
        ]);

        const receipt = await txRelayExecutorByBot.executeTxTakingFeeFromEoaOrWallet(
            txParams,
            additionalGasUsed,
            percentageOfLoweringTxCost,
            {
                gasLimit: 8000000,
            },
        );

        const gasUsed = await getGasUsed(receipt);
        const dollarPrice = calcGasToUSD(gasUsed, 0, callData);
        console.log(
            `GasUsed txRelayExecutor: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice}`,
        );
        // ****************************** AFTER *******************************************************

        const botEthBalanceAfter = await balanceOf(ETH_ADDR, botAcc.address);
        const eoaFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, senderAcc.address);
        const feeRecipientFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, addrs[network].FEE_RECEIVER);
        const txRelayFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, txRelayExecutor.address);

        console.log('[BOT] eth balance after:', botEthBalanceAfter.toString());
        console.log('[EOA] fee token balance after:', eoaFeeTokenBalanceAfter.toString());
        console.log('[FEE RECIPIENT] fee token balance after:', feeRecipientFeeTokenBalanceAfter.toString());
        console.log('[RELAY EXECUTOR] fee token balance after:', txRelayFeeTokenBalanceAfter.toString());

        const feeTaken = eoaFeeTokenBalanceBefore.sub(eoaFeeTokenBalanceAfter);
        console.log('Fee taken:', feeTaken.toString());

        const botSpent = botEthBalanceBefore.sub(botEthBalanceAfter);
        console.log('Bot spent in eth:', botSpent.toString());

        expect(feeTaken).to.be.gt(BigNumber.from('0'));
        expect(feeRecipientFeeTokenBalanceAfter.sub(feeRecipientFeeTokenBalanceBefore)).to.be.equal(feeTaken);
        expect(txRelayFeeTokenBalanceAfter).to.be.equal(BigNumber.from('0'));
    });

    it('Test getting fee from user position without order injection', async () => {
        const srcToken = WETH_ADDRESS;
        const destToken = DAI_ADDR;
        const sellAmount = hre.ethers.utils.parseUnits('10', 18);

        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(srcToken);
        console.log('Fee token price in eth:', feeTokenPriceInEth.toString());

        const txRelaySignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('1', srcToken.decimals),
            feeToken: srcToken,
            tokenPriceInEth: feeTokenPriceInEth,
        };

        const functionData = await dfsSellFunctionData(
            txRelaySignedData,
            srcToken,
            destToken,
            sellAmount,
        );
        const signature = await signSafeTransaction(functionData);

        const txParams = {
            safe: safeWallet.address,
            refundReceiver: nullAddress,
            data: functionData,
            signatures: signature,
        };

        const txRelayExecutorByBot = txRelayExecutor.connect(botAcc);
        const estimatedGas = 500000;

        const callData = txRelayExecutorByBot.interface.encodeFunctionData('executeTxTakingFeeFromPosition', [
            txParams,
            estimatedGas,
            emptyInjectedOffchainOrder,
        ]);

        const receipt = await txRelayExecutorByBot.executeTxTakingFeeFromPosition(
            txParams,
            estimatedGas,
            emptyInjectedOffchainOrder,
            {
                gasLimit: 8000000,
            },
        );

        const gasUsed = await getGasUsed(receipt);
        const dollarPrice = calcGasToUSD(gasUsed, 0, callData);
        console.log(
            `GasUsed txRelayExecutor: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice}`,
        );
    });
});
