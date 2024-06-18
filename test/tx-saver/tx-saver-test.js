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
    chainIds,
    fetchAmountinUSDPrice,
    formatMockExchangeObj,
    setNewExchangeWrapper,
} = require('../utils');
const {
    signSafeTx,
    predictSafeAddress,
    SAFE_MASTER_COPY_VERSIONS,
    deploySafe,
} = require('../utils-safe');
const { topUp } = require('../../scripts/utils/fork');
const {
    addBotCallerForTxSaver,
    emptyInjectedOffchainOrder,
} = require('./utils-tx-saver');
const { getControllers, supplyToMarket } = require('../llamalend/utils');

describe('TxSaver tests', function () {
    this.timeout(80000);
    let senderAcc;
    let safeWallet;
    let botAcc;
    let txSaverExecutor;
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
        await redeploy('BotAuthForTxSaver', addrs[network].REGISTRY_ADDR, false, isFork);
        await redeploy('RecipeExecutor', addrs[network].REGISTRY_ADDR, false, isFork);
        await redeploy('DFSSell', addrs[network].REGISTRY_ADDR, false, isFork);

        recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor', addrs[network].REGISTRY_ADDR);
        console.log('RecipeExecutor', recipeExecutorAddr);
        txSaverExecutor = await redeploy('TxSaverExecutor', addrs[network].REGISTRY_ADDR, false, isFork);
        console.log('txSaverExecutor', txSaverExecutor.address);

        const tokenPriceHelperFactory = await hre.ethers.getContractFactory('TokenPriceHelper');
        tokenPriceHelper = await tokenPriceHelperFactory.deploy();
        await tokenPriceHelper.deployed();

        // for testing LlamaLendSwapper with TxSaver
        await redeploy('LlamaLendLevCreate');
        await redeploy('LlamaLendSwapper');
        const mockWrapper = await redeploy('MockExchangeWrapper');
        await setNewExchangeWrapper(senderAcc, mockWrapper.address);
    };

    before(async () => {
        const isFork = hre.network.name === 'fork';
        console.log('[INFO] Testing on fork:', isFork);

        [senderAcc, botAcc] = await hre.ethers.getSigners();
        await setUpSafeWallet(senderAcc.address);

        if (isFork) {
            await topUp(senderAcc.address);
            await topUp(botAcc.address);
            await topUp(getOwnerAddr());
        }

        await redeployContracts(isFork);
        await addBotCallerForTxSaver(botAcc.address, isFork);
    });

    const openAavePositionFunctionData = async (txSaverUserSignedData) => {
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

        return recipe.encodeForTxSaverCall(txSaverUserSignedData)[1];
    };

    const dfsSellFunctionData = async (
        txSaverSignedData,
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

        return recipe.encodeForTxSaverCall(txSaverSignedData)[1];
    };

    const llamaLendLevCreateFunctionData = async (
        txSaverSignedData,
        controllerAddr,
        controllerId,
        collToken,
        debToken,
    ) => {
        await supplyToMarket(controllerAddr, chainIds[network]);
        const supplyAmount = fetchAmountinUSDPrice(
            collToken.symbol, '50000',
        );
        const borrowAmount = fetchAmountinUSDPrice(
            debToken.symbol, '60000',
        );
        if (supplyAmount === 'Infinity') return;
        if (borrowAmount === 'Infinity') return;
        const supplyAmountInWei = hre.ethers.utils.parseUnits(
            supplyAmount, collToken.decimals,
        );
        const borrowAmountWei = hre.ethers.utils.parseUnits(
            borrowAmount, debToken.decimals,
        );
        const exchangeData = await formatMockExchangeObj(
            debToken,
            collToken,
            borrowAmountWei,
        );
        await setBalance(collToken.address, senderAcc.address, supplyAmountInWei);
        await approve(collToken.address, safeWallet.address, senderAcc);

        const recipe = new dfs.Recipe('LlamaLendLevCreateRecipe', [
            new dfs.actions.llamalend.LlamaLendLevCreateAction(
                controllerAddr,
                controllerId,
                senderAcc.address,
                supplyAmountInWei,
                10, // bands
                exchangeData,
                0, // gas used
            ),
        ]);
        // eslint-disable-next-line consistent-return
        return recipe.encodeForTxSaverCall(txSaverSignedData)[1];
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

    const takeFeeFromUserPositionWithoutOrderInjection = async (estimatedGas) => {
        const srcToken = WETH_ADDRESS;
        const destToken = DAI_ADDR;
        const sellAmount = hre.ethers.utils.parseUnits('10', 18);

        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(srcToken);
        console.log('Fee token price in eth:', feeTokenPriceInEth.toString());

        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('1', srcToken.decimals),
            feeToken: srcToken,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: true,
        };

        const functionData = await dfsSellFunctionData(
            txSaverSignedData,
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

        const txSaverExecutorByBot = txSaverExecutor.connect(botAcc);

        const callData = txSaverExecutorByBot.interface.encodeFunctionData('executeTx', [
            txParams,
            estimatedGas,
            emptyInjectedOffchainOrder,
        ]);

        const receipt = await txSaverExecutorByBot.executeTx(
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
            `GasUsed TxSaverExecutor: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice}`,
        );
    };

    it('... should take fee from eoa', async () => {
        const feeTokenAsset = getAssetInfo('DAI');
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
        const functionData = await openAavePositionFunctionData(txSaverSignedData);
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
        const feeRecipientFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);
        const txSaverFeeTokenBalanceBefore = await balanceOf(feeTokenAddress, txSaverExecutor.address);

        console.log('[BOT] eth balance before:', botEthBalanceBefore.toString());
        console.log('[EOA] fee token balance before:', eoaFeeTokenBalanceBefore.toString());
        console.log('[FEE RECIPIENT] fee token balance before:', feeRecipientFeeTokenBalanceBefore.toString());
        console.log('[TX SAVER EXECUTOR] fee token balance before:', txSaverFeeTokenBalanceBefore.toString());

        // ************************* EXECUTION *********************************************************************
        const txSaverExecutorByBot = txSaverExecutor.connect(botAcc);
        const estimatedGas = 500000;

        const callData = txSaverExecutorByBot.interface.encodeFunctionData('executeTx', [
            txParams,
            estimatedGas,
            emptyInjectedOffchainOrder,
        ]);

        const receipt = await txSaverExecutorByBot.executeTx(
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
            `GasUsed txSaverExecutor: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice}`,
        );
        // ****************************** AFTER *******************************************************

        const botEthBalanceAfter = await balanceOf(ETH_ADDR, botAcc.address);
        const eoaFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, senderAcc.address);
        const feeRecipientFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, addrs[network].TX_SAVER_FEE_RECEIVER);
        const txSaverFeeTokenBalanceAfter = await balanceOf(feeTokenAddress, txSaverExecutor.address);

        console.log('[BOT] eth balance after:', botEthBalanceAfter.toString());
        console.log('[EOA] fee token balance after:', eoaFeeTokenBalanceAfter.toString());
        console.log('[FEE RECIPIENT] fee token balance after:', feeRecipientFeeTokenBalanceAfter.toString());
        console.log('[TX SAVER EXECUTOR] fee token balance after:', txSaverFeeTokenBalanceAfter.toString());

        const feeTaken = eoaFeeTokenBalanceBefore.sub(eoaFeeTokenBalanceAfter);
        console.log('Fee taken:', feeTaken.toString());

        const botSpent = botEthBalanceBefore.sub(botEthBalanceAfter);
        console.log('Bot spent in eth:', botSpent.toString());

        expect(feeTaken).to.be.gt(BigNumber.from('0'));
        expect(feeRecipientFeeTokenBalanceAfter.sub(feeRecipientFeeTokenBalanceBefore)).to.be.equal(feeTaken);
        expect(txSaverFeeTokenBalanceAfter).to.be.equal(BigNumber.from('0'));
    });

    it('... should take fee from user position without order injection', async () => {
        const estimatedGas = 500000;
        await takeFeeFromUserPositionWithoutOrderInjection(estimatedGas);
    });

    it('... should fail taking fee from position when deadline passed', async () => {
        const srcToken = WETH_ADDRESS;
        const destToken = DAI_ADDR;
        const sellAmount = hre.ethers.utils.parseUnits('10', 18);

        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(srcToken);
        console.log('Fee token price in eth:', feeTokenPriceInEth.toString());

        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('1', srcToken.decimals),
            feeToken: srcToken,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: Math.floor(Date.now() / 1000),
            shouldTakeFeeFromPosition: true,
        };

        const functionData = await dfsSellFunctionData(
            txSaverSignedData,
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

        const txSaverExecutorByBot = txSaverExecutor.connect(botAcc);
        const estimatedGas = 500000;

        await expect(txSaverExecutorByBot.executeTx(
            txParams,
            estimatedGas,
            emptyInjectedOffchainOrder,
            {
                gasLimit: 8000000,
            },
        )).to.be.reverted;
    });

    it('... should take fee from position when using LlamaLendSwapper', async () => {
        const chainId = chainIds[network];
        const controllerId = 0;
        const llamaControllerAddr = getControllers(chainId)[controllerId];
        const controller = await hre.ethers.getContractAt('ILlamaLendController', llamaControllerAddr);

        const collTokenAddr = await controller.collateral_token();
        const collToken = getAssetInfoByAddress(collTokenAddr, chainId);
        if (collToken.symbol === '?') return;

        const debtTokenAddr = await controller.borrowed_token();
        const debtToken = getAssetInfoByAddress(debtTokenAddr, chainId);
        if (debtToken.symbol === '?') return;

        const feeTokenPriceInEth = await tokenPriceHelper.getPriceInETH(collTokenAddr);
        console.log('Fee token price in eth:', feeTokenPriceInEth.toString());

        const txSaverSignedData = {
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('1', collTokenAddr.decimals),
            feeToken: collTokenAddr,
            tokenPriceInEth: feeTokenPriceInEth,
            deadline: 0,
            shouldTakeFeeFromPosition: true,
        };

        const functionData = await llamaLendLevCreateFunctionData(
            txSaverSignedData,
            llamaControllerAddr,
            controllerId,
            collToken,
            debtToken,
        );
        const signature = await signSafeTransaction(functionData);

        const txParams = {
            safe: safeWallet.address,
            refundReceiver: nullAddress,
            data: functionData,
            signatures: signature,
        };

        const txSaverExecutorByBot = txSaverExecutor.connect(botAcc);
        const estimatedGas = 500000;

        const callData = txSaverExecutorByBot.interface.encodeFunctionData('executeTx', [
            txParams,
            estimatedGas,
            emptyInjectedOffchainOrder,
        ]);

        const receipt = await txSaverExecutorByBot.executeTx(
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
            `GasUsed TxSaverExecutor: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice}`,
        );
    });

    it('... should send sponsored transaction without taking fee', async () => {
        const estimatedGas = 0;
        await takeFeeFromUserPositionWithoutOrderInjection(estimatedGas);
    });
});
