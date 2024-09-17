/* eslint-disable eqeqeq */
/* eslint-disable max-len */
/* eslint-disable camelcase */

const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const { getAssetInfo, getAssetInfoByAddress } = require('@defisaver/tokens');
const { BigNumber } = require('ethers');

const {
    addrs,
    redeploy,
    getOwnerAddr,
    setBalance,
    approve,
    nullAddress,
    getAddrFromRegistry,
    takeSnapshot,
    revertToSnapshot,
    balanceOf,
    setNewExchangeWrapper,
    formatExchangeObj,
    chainIds,
    network,
} = require('../utils');
const {
    predictSafeAddress,
    SAFE_MASTER_COPY_VERSIONS,
    deploySafe,
} = require('../utils-safe');
const { topUp } = require('../../scripts/utils/fork');
const {
    addBotCallerForTxSaver,
    emptyInjectedOrder,
    dfsSellEncodedData,
    signSafeTransaction,
    openAavePositionEncodedData,
    calculateExpectedFeeTaken,
    llamaLendLevCreateEncodedData,
} = require('./utils-tx-saver');
const { executeAction } = require('../actions');
const { getControllers } = require('../llamalend/utils');

describe('TxSaver tests', function () {
    this.timeout(80000);
    let isFork;
    let senderAcc;
    let safeWallet;
    let botAcc;
    let txSaverExecutor;
    let txSaverExecutorByBot;
    let recipeExecutorAddr;
    let snapshotId;
    let tokenPriceHelper;

    // for testing purposes if fee token price is not available
    const feeTokenPriceInEthPlaceholder = hre.ethers.utils.parseUnits('0.0003', 18); // 0.0003 ETH
    // will be sent as real address for tracking safe points
    const refundReceiver = nullAddress;
    // hardcode gas estimation, this will be injected by backend
    const estimatedGas = 500000;
    // hardcode gas params, so we can test tx cost calculation accurately
    const gasParams = {
        gasPrice: 20 * 1e9,
        gasLimit: 10000000,
    };

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
    };

    const setUpMultisigSafeWallet = async (owners, threshold) => {
        const setupData = [
            owners,
            threshold,
            hre.ethers.constants.AddressZero, // to module address
            [], // data for module
            hre.ethers.constants.AddressZero, // fallback handler
            hre.ethers.constants.AddressZero, // payment token
            0, // payment
            hre.ethers.constants.AddressZero, // payment receiver
        ];
        const predictedSafeAddr = await predictSafeAddress(SAFE_MASTER_COPY_VERSIONS.V141, setupData, '0');
        await deploySafe(SAFE_MASTER_COPY_VERSIONS.V141, setupData, '0');
        const multisigWallet = await hre.ethers.getContractAt('ISafe', predictedSafeAddr);
        return multisigWallet;
    };

    const redeployContracts = async () => {
        await redeploy('BotAuthForTxSaver', addrs[network].REGISTRY_ADDR, false, isFork);
        await redeploy('RecipeExecutor', addrs[network].REGISTRY_ADDR, false, isFork);
        await redeploy('DFSSell', addrs[network].REGISTRY_ADDR, false, isFork);

        recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor', addrs[network].REGISTRY_ADDR);
        txSaverExecutor = await redeploy('TxSaverExecutor', addrs[network].REGISTRY_ADDR, false, isFork);

        const tokenPriceHelperFactory = await hre.ethers.getContractFactory(
            chainIds[network] === 1 ? 'TokenPriceHelper' : 'TokenPriceHelperL2',
        );
        tokenPriceHelper = await tokenPriceHelperFactory.deploy();
        await tokenPriceHelper.deployed();
    };

    const redeployForLlamaLend = async () => {
        // for testing LlamaLendSwapper with TxSaver
        await redeploy('LlamaLendLevCreate', addrs[network].REGISTRY_ADDR, false, isFork);
        await redeploy('LlamaLendSwapper', addrs[network].REGISTRY_ADDR, false, isFork);
        const mockWrapper = await redeploy('MockExchangeWrapper', addrs[network].REGISTRY_ADDR, false, isFork);
        await setNewExchangeWrapper(senderAcc, mockWrapper.address, isFork);
    };

    const getTxParams = async (functionData) => {
        const signature = await signSafeTransaction(
            senderAcc,
            safeWallet,
            recipeExecutorAddr,
            functionData,
            refundReceiver,
        );
        return {
            safe: safeWallet.address,
            refundReceiver: nullAddress,
            data: functionData,
            signatures: signature,
        };
    };

    before(async () => {
        isFork = hre.network.name === 'fork';

        [senderAcc, botAcc] = await hre.ethers.getSigners();
        await setUpSafeWallet(senderAcc.address);

        if (isFork) {
            await topUp(senderAcc.address);
            await topUp(botAcc.address);
            await topUp(getOwnerAddr());
        }

        await redeployContracts(isFork);
        await addBotCallerForTxSaver(botAcc.address, isFork);

        txSaverExecutorByBot = txSaverExecutor.connect(botAcc);
    });

    it('... should fail to call executeTx without caller permission', async () => {
        await expect(txSaverExecutor.connect(senderAcc).executeTx(
            {
                safe: safeWallet.address,
                refundReceiver: nullAddress,
                data: '0x',
                signatures: '0x',
            },
            estimatedGas,
            0,
            emptyInjectedOrder,
            gasParams,
        )).to.be.revertedWith('BotNotApproved');
    });

    it('... should fail to execute TxSaver tx as deadline passed', async () => {
        const srcToken = addrs[network].WETH_ADDRESS;
        const destToken = addrs[network].DAI_ADDRESS;
        const sellAmount = hre.ethers.utils.parseUnits('10', 18);
        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(srcToken);

        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('1', srcToken.decimals),
            feeToken: srcToken,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: Math.floor(Date.now() / 1000),
            shouldTakeFeeFromPosition: true,
        };
        const functionData = await dfsSellEncodedData(
            safeWallet,
            senderAcc,
            txSaverSignedData,
            srcToken,
            destToken,
            sellAmount,
        );
        const txParamsForExecution = await getTxParams(functionData);
        await expect(txSaverExecutorByBot.executeTx(
            txParamsForExecution,
            estimatedGas,
            0,
            emptyInjectedOrder,
            gasParams,
        )).to.be.revertedWith('TxSaverSignatureExpired');
    });

    it('... should fail to call RecipeExecutor from TxSaverExecutor if caller is not TxSaverExecutor', async () => {
        const srcToken = addrs[network].WETH_ADDRESS;
        const destToken = addrs[network].DAI_ADDRESS;
        const sellAmount = hre.ethers.utils.parseUnits('10', 18);
        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(srcToken);

        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('1', srcToken.decimals),
            feeToken: srcToken,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: true,
        };
        const functionData = await dfsSellEncodedData(
            safeWallet,
            senderAcc,
            txSaverSignedData,
            srcToken,
            destToken,
            sellAmount,
        );
        const decodedData = await txSaverExecutor.parseTxSaverSignedData(functionData);
        const decodedRecipe = decodedData[0];
        const decodedTxSaverData = decodedData[1];

        const recipeExecutor = await hre.ethers.getContractAt('RecipeExecutor', recipeExecutorAddr);
        await expect(recipeExecutor.connect(senderAcc).executeRecipeFromTxSaver(
            decodedRecipe,
            decodedTxSaverData,
        )).to.be.revertedWith('TxSaverAuthorizationError');
    });

    it('... should not take fee for TxSaver on regular sell', async () => {
        const srcToken = addrs[network].WETH_ADDRESS;
        const feeTokenAddress = srcToken;
        const destToken = addrs[network].DAI_ADDRESS;
        const sellAmount = hre.ethers.utils.parseUnits('10', 18);

        await setBalance(srcToken, senderAcc.address, sellAmount);
        await approve(srcToken, safeWallet.address, senderAcc);
        const recipe = new dfs.Recipe('RegularSell', [
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
                    addrs[network].UNISWAP_V3_WRAPPER,
                    0,
                    3000,
                ),
                safeWallet.address,
                senderAcc.address,
            ),
        ]);
        const functionData = recipe.encodeForDsProxyCall()[1];

        const eoaFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, senderAcc.address);
        const feeRecipientFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);

        await executeAction('RecipeExecutor', functionData, safeWallet, addrs[network].REGISTRY_ADDR);

        const eoaFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, senderAcc.address);
        const feeRecipientFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);
        const txSaverFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, txSaverExecutor.address);

        expect(eoaFeeTokenBalanceBefore.sub(eoaFeeTokenBalanceAfter)).to.be.equal(sellAmount);
        expect(feeRecipientFeeTokenBalanceAfter.sub(feeRecipientFeeTokenBalanceBefore)).to.be.equal(0);
        expect(txSaverFeeTokenBalanceAfter).to.be.equal(BigNumber.from('0'));
    });

    it('... should take fee from position when using LlamaLendSwapper', async () => {
        const chainId = chainIds[network];
        // LlamaLend advanced actions are only available on mainnet and Arbitrum at the moment
        if (chainId !== 1 && chainId !== 42161) {
            return;
        }

        await redeployForLlamaLend();

        const controllerId = 0;
        const llamaControllerAddr = getControllers(chainId)[controllerId];
        const controller = await hre.ethers.getContractAt('ILlamaLendController', llamaControllerAddr);

        const collTokenAddr = await controller.collateral_token();
        const collToken = getAssetInfoByAddress(collTokenAddr, chainId);
        if (collToken.symbol === '?') return;

        const debtTokenAddr = await controller.borrowed_token();
        const debtToken = getAssetInfoByAddress(debtTokenAddr, chainId);
        if (debtToken.symbol === '?') return;

        // as this is leverage create, we are selling debt for collateral, debt token will be src token when taking fee
        const feeTokenAsset = debtToken;
        const feeTokenAddress = feeTokenAsset.address;
        let feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(feeTokenAddress);
        if (feeTokenPriceInEth == 0) {
            feeTokenPriceInEth = feeTokenPriceInEthPlaceholder;
        }

        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('50', feeTokenAsset.decimals),
            feeToken: feeTokenAddress,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: true,
        };
        const functionData = await llamaLendLevCreateEncodedData(
            senderAcc,
            safeWallet,
            txSaverSignedData,
            llamaControllerAddr,
            controllerId,
            collToken,
            debtToken,
        );
        const feeRecipientFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);

        const txParamsForExecution = await getTxParams(functionData);
        await txSaverExecutorByBot.executeTx(
            txParamsForExecution,
            estimatedGas,
            0,
            emptyInjectedOrder,
            gasParams,
        );

        const feeRecipientFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);

        const expectedFeeTaken = await calculateExpectedFeeTaken(
            estimatedGas,
            feeTokenAsset,
            feeTokenPriceInEth,
            gasParams.gasPrice,
        );
        const feeTaken = feeRecipientFeeTokenBalanceAfter.sub(feeRecipientFeeTokenBalanceBefore);
        expect(feeTaken).to.be.equal(expectedFeeTaken);
    });

    it('... should take fee from EOA when executing TxSaver tx', async () => {
        const feeTokenAsset = getAssetInfo('DAI', chainIds[network]);
        const feeTokenAddress = feeTokenAsset.address;
        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(feeTokenAddress);

        await setBalance(feeTokenAddress, senderAcc.address, hre.ethers.utils.parseUnits('10000', feeTokenAsset.decimals));
        await approve(feeTokenAddress, safeWallet.address, senderAcc);

        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('50', feeTokenAsset.decimals),
            feeToken: feeTokenAddress,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: false,
        };

        const functionData = await openAavePositionEncodedData(senderAcc, safeWallet, txSaverSignedData);

        const eoaFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, senderAcc.address);
        const feeRecipientFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);

        const txParamsForExecution = await getTxParams(functionData);
        await txSaverExecutorByBot.executeTx(
            txParamsForExecution,
            estimatedGas,
            0,
            emptyInjectedOrder,
            gasParams,
        );

        const eoaFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, senderAcc.address);
        const feeRecipientFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);
        const txSaverFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, txSaverExecutor.address);

        const expectedFeeTaken = await calculateExpectedFeeTaken(
            estimatedGas,
            feeTokenAsset,
            feeTokenPriceInEth,
            gasParams.gasPrice,
        );

        const feeTaken = eoaFeeTokenBalanceBefore.sub(eoaFeeTokenBalanceAfter);
        expect(feeTaken).to.be.equal(expectedFeeTaken);
        expect(feeRecipientFeeTokenBalanceAfter.sub(feeRecipientFeeTokenBalanceBefore)).to.be.equal(feeTaken);
        expect(txSaverFeeTokenBalanceAfter).to.be.equal(BigNumber.from('0'));
    });

    it('... should not take fee from EOA when executing TxSaver sponsored tx', async () => {
        const feeTokenAsset = getAssetInfo('DAI', chainIds[network]);
        const feeTokenAddress = feeTokenAsset.address;
        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(feeTokenAddress);

        const txSaverSignedData = {
            maxTxCostInFeeToken: 0,
            feeToken: feeTokenAddress,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: false,
        };

        const functionData = await openAavePositionEncodedData(senderAcc, safeWallet, txSaverSignedData);

        const eoaFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, senderAcc.address);
        const feeRecipientFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);

        const txParamsForExecution = await getTxParams(functionData);
        await txSaverExecutorByBot.executeTx(
            txParamsForExecution,
            0,
            0, // when sending sponsored transaction send estimatedGas as zero
            emptyInjectedOrder,
            gasParams,
        );

        const eoaFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, senderAcc.address);
        const feeRecipientFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);
        const txSaverFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, txSaverExecutor.address);
        const feeTaken = eoaFeeTokenBalanceBefore.sub(eoaFeeTokenBalanceAfter);

        expect(feeTaken).to.be.equal(0);
        expect(feeRecipientFeeTokenBalanceAfter).to.be.equal(feeRecipientFeeTokenBalanceBefore);
        expect(txSaverFeeTokenBalanceAfter).to.be.equal(BigNumber.from('0'));
    });

    it('... should take fee from EOA when executing TxSaver tx with order injection', async () => {
        const feeTokenAsset = getAssetInfo('DAI', chainIds[network]);
        const feeTokenAddress = feeTokenAsset.address;
        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(feeTokenAddress);
        const srcToken = feeTokenAddress;
        const destTokenAsset = getAssetInfo('USDC', chainIds[network]);
        const destToken = destTokenAsset.address;
        const sellAmount = hre.ethers.utils.parseUnits('1000', 18);

        const maxTxCostInFeeToken = hre.ethers.utils.parseUnits('100', feeTokenAsset.decimals);
        await setBalance(feeTokenAddress, senderAcc.address, hre.ethers.utils.parseUnits('10000', feeTokenAsset.decimals));
        await approve(feeTokenAddress, safeWallet.address, senderAcc);

        const txSaverSignedData = {
            maxTxCostInFeeToken,
            feeToken: srcToken,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: false,
        };

        // no DAI/USDC pool with fee 3000 present on Optimism
        const uniV3FeeForDaiUsdcPool = network === 'optimism' ? 100 : 3000;

        const functionData = await dfsSellEncodedData(
            safeWallet,
            senderAcc,
            txSaverSignedData,
            srcToken,
            destToken,
            sellAmount,
            uniV3FeeForDaiUsdcPool,
        );
        const wrapperAddr = addrs[network].UNISWAP_V3_WRAPPER;
        const exchangeObj = formatExchangeObj(
            srcToken,
            destToken,
            sellAmount,
            wrapperAddr,
            0,
            uniV3FeeForDaiUsdcPool,
        );
        const exchangeData = exchangeObj[exchangeObj.length - 2];
        const injectedOrder = emptyInjectedOrder;
        injectedOrder.wrapper = wrapperAddr;
        injectedOrder.wrapperData = hre.ethers.utils.arrayify(exchangeData);

        const eoaFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, senderAcc.address);
        const feeRecipientFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);

        const txParamsForExecution = await getTxParams(functionData);
        await txSaverExecutorByBot.executeTx(
            txParamsForExecution,
            estimatedGas,
            0,
            injectedOrder,
            gasParams,
        );

        const eoaFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, senderAcc.address);
        const feeRecipientFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);
        const txSaverFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, txSaverExecutor.address);

        const expectedFeeTaken = await calculateExpectedFeeTaken(
            estimatedGas,
            feeTokenAsset,
            feeTokenPriceInEth,
            gasParams.gasPrice,
        );

        const feeTaken = eoaFeeTokenBalanceBefore.sub(eoaFeeTokenBalanceAfter).sub(sellAmount);
        expect(feeTaken).to.be.equal(expectedFeeTaken);
        expect(feeRecipientFeeTokenBalanceAfter.sub(feeRecipientFeeTokenBalanceBefore)).to.be.equal(feeTaken);
        expect(txSaverFeeTokenBalanceAfter).to.be.equal(BigNumber.from('0'));
    });

    it('... should fail to take fee from EOA because of higher gas cost than max cost set by user', async () => {
        const feeTokenAsset = getAssetInfo('DAI', chainIds[network]);
        const feeTokenAddress = feeTokenAsset.address;
        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(feeTokenAddress);

        await setBalance(feeTokenAddress, senderAcc.address, hre.ethers.utils.parseUnits('10000', feeTokenAsset.decimals));
        await approve(feeTokenAddress, safeWallet.address, senderAcc);

        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('0.000001', feeTokenAsset.decimals),
            feeToken: feeTokenAddress,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: false,
        };
        const functionData = await openAavePositionEncodedData(senderAcc, safeWallet, txSaverSignedData);

        const txParamsForExecution = await getTxParams(functionData);
        await expect(txSaverExecutorByBot.executeTx(
            txParamsForExecution,
            estimatedGas,
            0,
            emptyInjectedOrder,
            gasParams,
        )).to.be.reverted;
    });

    it('... should fail to take fee from EOA because of missing fee tokens on user account', async () => {
        const feeTokenAsset = getAssetInfo('DAI', chainIds[network]);
        const feeTokenAddress = feeTokenAsset.address;
        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(feeTokenAddress);

        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('100', feeTokenAsset.decimals),
            feeToken: feeTokenAddress,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: false,
        };
        const functionData = await openAavePositionEncodedData(senderAcc, safeWallet, txSaverSignedData);

        const txParamsForExecution = await getTxParams(functionData);
        await expect(txSaverExecutorByBot.executeTx(
            txParamsForExecution,
            estimatedGas,
            0,
            emptyInjectedOrder,
            gasParams,
        )).to.be.reverted;
    });

    it('... should take fee from multisig wallet when executing TxSaver tx', async () => {
        const [owner1, owner2] = await hre.ethers.getSigners();
        const multisigWallet = await setUpMultisigSafeWallet([owner1.address, owner2.address], 2);

        const feeTokenAsset = getAssetInfo('DAI', chainIds[network]);
        const feeTokenAddress = feeTokenAsset.address;
        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(feeTokenAddress);
        await setBalance(feeTokenAddress, multisigWallet.address, hre.ethers.utils.parseUnits('10000', feeTokenAsset.decimals));

        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('50', feeTokenAsset.decimals),
            feeToken: feeTokenAddress,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: false,
        };
        const functionData = await openAavePositionEncodedData(senderAcc, multisigWallet, txSaverSignedData);

        const firstSignature = await signSafeTransaction(
            owner1,
            multisigWallet,
            recipeExecutorAddr,
            functionData,
            refundReceiver,
        );
        const secondSignature = await signSafeTransaction(
            owner2,
            multisigWallet,
            recipeExecutorAddr,
            functionData,
            refundReceiver,
        );
        const txParams = {
            safe: multisigWallet.address,
            refundReceiver: nullAddress,
            data: functionData,
            signatures: hre.ethers.utils.arrayify(secondSignature + firstSignature.slice(2)),
        };

        const walletFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, multisigWallet.address);
        const feeRecipientFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);

        await txSaverExecutorByBot.executeTx(
            txParams,
            estimatedGas,
            0,
            emptyInjectedOrder,
            gasParams,
        );

        const walletFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, multisigWallet.address);
        const feeRecipientFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);
        const txSaverFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, txSaverExecutor.address);

        const expectedFeeTaken = await calculateExpectedFeeTaken(
            estimatedGas,
            feeTokenAsset,
            feeTokenPriceInEth,
            gasParams.gasPrice,
        );
        const feeTaken = walletFeeTokenBalanceBefore.sub(walletFeeTokenBalanceAfter);

        expect(feeTaken).to.be.equal(expectedFeeTaken);
        expect(feeRecipientFeeTokenBalanceAfter.sub(feeRecipientFeeTokenBalanceBefore)).to.be.equal(feeTaken);
        expect(txSaverFeeTokenBalanceAfter).to.be.equal(BigNumber.from('0'));
    });

    it('... should take fee from user position without order injection', async () => {
        const feeTokenAsset = getAssetInfo('DAI', chainIds[network]);
        const feeTokenAddress = feeTokenAsset.address;
        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(feeTokenAddress);
        const srcToken = feeTokenAddress;
        const destTokenAsset = getAssetInfo('USDC', chainIds[network]);
        const destToken = destTokenAsset.address;
        const sellAmount = hre.ethers.utils.parseUnits('1000', 18);

        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('50', srcToken.decimals),
            feeToken: feeTokenAddress,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: true,
        };

        // no DAI/USDC pool with fee 3000 present on Optimism
        const uniV3FeeForDaiUsdcPool = network === 'optimism' ? 100 : 3000;

        const functionData = await dfsSellEncodedData(
            safeWallet,
            senderAcc,
            txSaverSignedData,
            srcToken,
            destToken,
            sellAmount,
            uniV3FeeForDaiUsdcPool,
        );

        const feeRecipientFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);

        const txParamsForExecution = await getTxParams(functionData);
        await txSaverExecutorByBot.executeTx(
            txParamsForExecution,
            estimatedGas,
            0,
            emptyInjectedOrder,
            gasParams,
        );

        const feeRecipientFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);

        const expectedFeeTaken = await calculateExpectedFeeTaken(
            estimatedGas,
            feeTokenAsset,
            feeTokenPriceInEth,
            gasParams.gasPrice,
        );
        const feeTaken = feeRecipientFeeTokenBalanceAfter.sub(feeRecipientFeeTokenBalanceBefore);
        expect(feeTaken).to.be.equal(expectedFeeTaken);
    });

    it('... should not take fee from user position when executing TxSaver sponsored tx', async () => {
        const feeTokenAsset = getAssetInfo('DAI', chainIds[network]);
        const feeTokenAddress = feeTokenAsset.address;
        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(feeTokenAddress);
        const srcToken = feeTokenAddress;
        const destTokenAsset = getAssetInfo('USDC', chainIds[network]);
        const destToken = destTokenAsset.address;
        const sellAmount = hre.ethers.utils.parseUnits('1000', 18);

        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('50', srcToken.decimals),
            feeToken: feeTokenAddress,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: true,
        };

        // no DAI/USDC pool with fee 3000 present on Optimism
        const uniV3FeeForDaiUsdcPool = network === 'optimism' ? 100 : 3000;

        const functionData = await dfsSellEncodedData(
            safeWallet,
            senderAcc,
            txSaverSignedData,
            srcToken,
            destToken,
            sellAmount,
            uniV3FeeForDaiUsdcPool,
        );
        const feeRecipientFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);

        const txParamsForExecution = await getTxParams(functionData);
        await txSaverExecutorByBot.executeTx(
            txParamsForExecution,
            0,
            0,
            emptyInjectedOrder,
            gasParams,
        );
        const feeRecipientFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);
        expect(feeRecipientFeeTokenBalanceBefore).to.be.equal(feeRecipientFeeTokenBalanceAfter);
    });

    it('... should take fee from user position with order injection', async () => {
        const feeTokenAsset = getAssetInfo('DAI', chainIds[network]);
        const feeTokenAddress = feeTokenAsset.address;
        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(feeTokenAddress);
        const srcToken = feeTokenAddress;
        const destTokenAsset = getAssetInfo('USDC', chainIds[network]);
        const destToken = destTokenAsset.address;

        const sellAmount = hre.ethers.utils.parseUnits('1000', 18);

        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('50', srcToken.decimals),
            feeToken: feeTokenAddress,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: true,
        };

        // no DAI/USDC pool with fee 3000 present on Optimism
        const uniV3FeeForDaiUsdcPool = network === 'optimism' ? 100 : 3000;

        const functionData = await dfsSellEncodedData(
            safeWallet,
            senderAcc,
            txSaverSignedData,
            srcToken,
            destToken,
            sellAmount,
            uniV3FeeForDaiUsdcPool,
        );
        const wrapperAddr = addrs[network].UNISWAP_V3_WRAPPER;
        const exchangeObj = formatExchangeObj(
            srcToken,
            destToken,
            sellAmount,
            wrapperAddr,
            0,
            uniV3FeeForDaiUsdcPool,
        );
        const exchangeData = exchangeObj[exchangeObj.length - 2];
        const injectedOrder = emptyInjectedOrder;
        injectedOrder.wrapper = wrapperAddr;
        injectedOrder.wrapperData = hre.ethers.utils.arrayify(exchangeData);

        const feeRecipientFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);

        const txParamsForExecution = await getTxParams(functionData);
        await txSaverExecutorByBot.executeTx(
            txParamsForExecution,
            estimatedGas,
            0,
            injectedOrder,
            gasParams,
        );

        const feeRecipientFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);

        const expectedFeeTaken = await calculateExpectedFeeTaken(
            estimatedGas,
            feeTokenAsset,
            feeTokenPriceInEth,
            gasParams.gasPrice,
        );
        const feeTaken = feeRecipientFeeTokenBalanceAfter.sub(feeRecipientFeeTokenBalanceBefore);
        expect(feeTaken).to.be.equal(expectedFeeTaken);
    });

    it('... should fail to take fee from user position because of higher gas cost than max cost set by user', async () => {
        const feeTokenAsset = getAssetInfo('DAI', chainIds[network]);
        const feeTokenAddress = feeTokenAsset.address;
        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(feeTokenAddress);
        const srcToken = feeTokenAddress;
        const destTokenAsset = getAssetInfo('USDC', chainIds[network]);
        const destToken = destTokenAsset.address;

        const sellAmount = hre.ethers.utils.parseUnits('1000', 18);

        // set low maxTxCostInFeeToken
        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('0.00001', srcToken.decimals),
            feeToken: feeTokenAddress,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: true,
        };

        // no DAI/USDC pool with fee 3000 present on Optimism
        const uniV3FeeForDaiUsdcPool = network === 'optimism' ? 100 : 3000;

        const functionData = await dfsSellEncodedData(
            safeWallet,
            senderAcc,
            txSaverSignedData,
            srcToken,
            destToken,
            sellAmount,
            uniV3FeeForDaiUsdcPool,
        );

        const txParamsForExecution = await getTxParams(functionData);
        await expect(txSaverExecutorByBot.executeTx(
            txParamsForExecution,
            estimatedGas,
            0,
            emptyInjectedOrder,
            gasParams,
        )).to.be.reverted;
    });
});
