/* eslint-disable max-len */

const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const { Wallet, BigNumber } = require('ethers');

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
} = require('../utils');
const {
    signSafeTx,
    predictSafeAddress,
    SAFE_MASTER_COPY_VERSIONS,
    deploySafe,
} = require('../utils-safe');
const { topUp } = require('../../scripts/utils/fork');
const { addBotCallerForTxRelay, addInitialFeeTokens, determineAdditionalGasUsedInTxRelay } = require('../utils-tx-relay');

describe('Tx Relay - test using funds from EOA', function () {
    this.timeout(80000);
    let senderAcc;
    let proxy;
    let botAcc;
    let txRelayExecutor;
    let supportedFeeTokensRegistry;
    let recipeExecutorAddr;
    let aavePool;
    let isFork;
    let snapshotId;
    const network = 'mainnet';

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    // use real signer account so we can get accurate signature and nonce
    const setRealSignerAccount = async () => {
        const provider = hre.ethers.provider;
        const privKey = process.env.PRIV_KEY_MAINNET;
        const singerWallet = new Wallet(privKey);
        senderAcc = await singerWallet.connect(provider);
    };

    before(async () => {
        isFork = hre.network.name === 'fork';
        console.log('isFork', isFork);

        await setRealSignerAccount();

        [, botAcc] = await hre.ethers.getSigners();

        const setupData = [
            [senderAcc.address], // owner
            1, // threshold
            hre.ethers.constants.AddressZero, // to module address
            [], // data for module
            hre.ethers.constants.AddressZero, // fallback handler
            hre.ethers.constants.AddressZero, // payment token
            0, // payment
            hre.ethers.constants.AddressZero, // payment receiver
        ];
        const predictedSafeAddr = await predictSafeAddress(SAFE_MASTER_COPY_VERSIONS.V141, setupData, '0');
        console.log('Predicted Safe address', predictedSafeAddr);
        await deploySafe(SAFE_MASTER_COPY_VERSIONS.V141, setupData, '0');
        proxy = await hre.ethers.getContractAt('ISafe', predictedSafeAddr);

        // UNCOMMENT IF WE ARE WORKING WITH EXISTING SAFE
        // proxy = await hre.ethers.getContractAt('ISafe', '0x633386aC84d9337165f6e7BAdaC05DD93B31878F');

        console.log('Safe address', proxy.address);

        if (isFork) {
            await topUp(senderAcc.address);
            await topUp(botAcc.address);
            await topUp(getOwnerAddr());
        }

        const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
        const poolAddress = await aaveMarketContract.getPool();

        aavePool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

        await redeploy('BotAuthForTxRelay', addrs[network].REGISTRY_ADDR, false, isFork);
        await redeploy('RecipeExecutor', addrs[network].REGISTRY_ADDR, false, isFork);
        await redeploy('AaveV3Supply', addrs[network].REGISTRY_ADDR, false, isFork);
        await redeploy('AaveV3Borrow', addrs[network].REGISTRY_ADDR, false, isFork);
        recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor', addrs[network].REGISTRY_ADDR);
        console.log('RecipeExecutor', recipeExecutorAddr);
        supportedFeeTokensRegistry = await redeploy('SupportedFeeTokensRegistry', addrs[network].REGISTRY_ADDR, false, isFork);
        console.log('SupportedFeeTokensRegistry', supportedFeeTokensRegistry.address);

        txRelayExecutor = await redeploy('TxRelayExecutor', addrs[network].REGISTRY_ADDR, false, isFork, supportedFeeTokensRegistry.address);

        await addBotCallerForTxRelay(botAcc.address, isFork);
        await addInitialFeeTokens(isFork);
    });

    // example of function data we want to execute
    const openAavePositionExampleFunctionData = async (txRelayUserSignedData) => {
        const supplyToken = WBTC_ADDR;
        const supplyAmount = hre.ethers.utils.parseUnits('10', 8);
        const supplyAssetReserveData = await aavePool.getReserveData(supplyToken);
        const supplyAssetId = supplyAssetReserveData.id;

        const borrowToken = LUSD_ADDR;
        const borrowAmount = hre.ethers.utils.parseUnits('10000', 18);
        const borrowAssetReserveData = await aavePool.getReserveData(borrowToken);
        const borrowAssetReserveDataId = borrowAssetReserveData.id;

        await setBalance(supplyToken, senderAcc.address, supplyAmount);
        await approve(supplyToken, proxy.address, senderAcc);

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

        if (txRelayUserSignedData) {
            return recipe.encodeForTxRelayCall(txRelayUserSignedData)[1];
        }
        return recipe.encodeForDsProxyCall()[1];
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
            nonce: await proxy.nonce(),
        };

        // if we are using fork we are hardcoding signature for:
        // user: 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
        // recipe executor: 0x8D9cDA62DC7Bf75f687c6C8729ABB51ac82E20d5
        // safe wallet: 0x633386aC84d9337165f6e7BAdaC05DD93B31878F
        if (isFork) {
            const sig = '0xb3c478bd20ed438321b23d560e06ff6b4e91c4d1f0d0cef975a3b9cae5a85aaa2e03a82c7e2350e9622d62325cda92f25cacbb29043f4f163e0eb0d5f30741d81c';
            return hre.ethers.utils.arrayify(sig);
        }
        const signature = await signSafeTx(proxy, safeTxParamsForSign, senderAcc);
        return signature;
    };

    it('Test getting FEE from EOA', async () => {
        const feeTokenAsset = getAssetInfo('DAI');
        // eslint-disable-next-line camelcase
        const fee_token = feeTokenAsset.address;
        await setBalance(fee_token, senderAcc.address, hre.ethers.utils.parseUnits('10000', feeTokenAsset.decimals));
        await approve(fee_token, proxy.address, senderAcc);
        const txRelayUserSignedData = {
            maxGasPrice: 200 * 10e9, // in wei
            maxTxCostInFeeToken: hre.ethers.utils.parseUnits('50', feeTokenAsset.decimals),
            feeToken: fee_token,
        };
        console.log(txRelayUserSignedData);
        const functionData = await openAavePositionExampleFunctionData(txRelayUserSignedData);
        const signature = await signSafeTransaction(functionData);

        const txParams = {
            value: 0,
            safe: proxy.address,
            data: functionData,
            signatures: signature,
        };

        // ************************** BEFORE **********************************************
        const botBalanceBeforeInEth = await balanceOf(ETH_ADDR, botAcc.address);
        const eoaFeeTokenBalanceBefore = await balanceOf(fee_token, senderAcc.address);
        const feeRecipientFeeTokenBalanceBefore = await balanceOf(fee_token, addrs[network].FEE_RECEIVER);
        const txRelayFeeTokenBalanceBefore = await balanceOf(fee_token, txRelayExecutor.address);

        console.log('Bot balance before', botBalanceBeforeInEth.toString());
        console.log('Fee eoa token balance before', eoaFeeTokenBalanceBefore.toString());
        console.log('Fee recipient balance before', feeRecipientFeeTokenBalanceBefore.toString());
        console.log('TxRelay balance before', txRelayFeeTokenBalanceBefore.toString());

        // *************************** EXECUTION **************************************************************
        const txRelayExecutorByBot = txRelayExecutor.connect(botAcc);
        const additionalGasUsed = determineAdditionalGasUsedInTxRelay(fee_token, true);

        const callData = txRelayExecutorByBot.interface.encodeFunctionData('executeTxTakingFeeFromEoaOrWallet', [
            txParams,
            additionalGasUsed
        ]);

        const receipt = await txRelayExecutorByBot.executeTxTakingFeeFromEoaOrWallet(
            txParams,
            additionalGasUsed,
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

        const botBalanceAfterInEth = await balanceOf(ETH_ADDR, botAcc.address);
        const eoaFeeTokenBalanceAfter = await balanceOf(fee_token, senderAcc.address);
        const feeRecipientFeeTokenBalanceAfter = await balanceOf(fee_token, addrs[network].FEE_RECEIVER);
        const txRelayFeeTokenBalanceAfter = await balanceOf(fee_token, txRelayExecutor.address);

        console.log('Bot balance after', botBalanceAfterInEth.toString());
        console.log('Fee eoa token balance after', eoaFeeTokenBalanceAfter.toString());
        console.log('Fee recipient balance after', feeRecipientFeeTokenBalanceAfter.toString());
        console.log('TxRelay balance after', txRelayFeeTokenBalanceAfter.toString());

        const feeTaken = eoaFeeTokenBalanceBefore.sub(eoaFeeTokenBalanceAfter);
        console.log('Fee taken', feeTaken.toString());

        const botSpent = botBalanceBeforeInEth.sub(botBalanceAfterInEth);
        console.log('Bot spent', botSpent.toString());

        expect(feeTaken).to.be.gt(BigNumber.from('0'));
        expect(feeRecipientFeeTokenBalanceAfter.sub(feeRecipientFeeTokenBalanceBefore)).to.be.equal(feeTaken);
        expect(txRelayFeeTokenBalanceAfter).to.be.equal(BigNumber.from('0'));
    });

    it('Test executing tx without FEE', async () => {
        const functionData = await openAavePositionExampleFunctionData();
        const signature = await signSafeTransaction(functionData);
        const txParams = {
            value: 0,
            safe: proxy.address,
            data: functionData,
            signatures: signature,
        };
        const txRelayExecutorByBot = txRelayExecutor.connect(botAcc);
        const callData = txRelayExecutorByBot.interface.encodeFunctionData('executeTxWithoutFee', [
            txParams,
        ]);

        const receipt = await txRelayExecutorByBot.executeTxWithoutFee(txParams, {
            gasLimit: 8000000,
            gasPrice: 100,
        });

        const gasUsed = await getGasUsed(receipt);
        const dollarPrice = calcGasToUSD(gasUsed, 0, callData);
        console.log(
            `GasUsed txRelayExecutor: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice}`,
        );
    });
});
