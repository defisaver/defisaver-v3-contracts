/* eslint-disable max-len */

const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    addrs,
    network,
    redeploy,
    impersonateAccount,
    getOwnerAddr,
    stopImpersonatingAccount,
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
const { addBotCaller } = require('../utils-strategies');
const { signSafeTx } = require('../utils-safe');
const { topUp } = require('../../scripts/utils/fork');

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

    const addInitialFeeTokens = async () => {
        if (!isFork) {
            await impersonateAccount(getOwnerAddr());
        }

        const signer = await hre.ethers.provider.getSigner(getOwnerAddr());

        await supportedFeeTokensRegistry.connect(signer).add(addrs[network].DAI_ADDRESS);

        await supportedFeeTokensRegistry.connect(signer).add(addrs[network].USDC_ADDR);

        await supportedFeeTokensRegistry.connect(signer).add(addrs[network].WETH_ADDRESS);

        if (!isFork) {
            await stopImpersonatingAccount(getOwnerAddr());
        }
    };

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    before(async () => {
        isFork = hre.network.name === 'fork';
        console.log('isFork', isFork);
        [senderAcc, botAcc] = await hre.ethers.getSigners();
        proxy = await getProxy(senderAcc.address, true); // hardcode to safe
        const owners = await proxy.getOwners();
        console.log('Owners', owners);
        console.log(owners[0]);
        console.log(senderAcc.address);

        if (isFork) {
            await topUp(senderAcc.address);
            await topUp(botAcc.address);
            await topUp(getOwnerAddr());
        }

        const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
        const poolAddress = await aaveMarketContract.getPool();

        aavePool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

        await redeploy('BotAuth', addrs[network].REGISTRY_ADDR, false, isFork);
        await redeploy('RecipeExecutor', addrs[network].REGISTRY_ADDR, false, isFork);
        await redeploy('AaveV3Supply', addrs[network].REGISTRY_ADDR, false, isFork);
        await redeploy('AaveV3Borrow', addrs[network].REGISTRY_ADDR, false, isFork);
        recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor', addrs[network].REGISTRY_ADDR);
        supportedFeeTokensRegistry = await redeploy('SupportedFeeTokensRegistry', addrs[network].REGISTRY_ADDR, false, isFork);
        console.log('SupportedFeeTokensRegistry', supportedFeeTokensRegistry.address);

        txRelayExecutor = await redeploy('TxRelayExecutor', addrs[network].REGISTRY_ADDR, false, isFork, supportedFeeTokensRegistry.address);

        await addBotCaller(botAcc.address, addrs[network].REGISTRY_ADDR, isFork);

        await addInitialFeeTokens(isFork);
    });

    // include gas used for calculating and sending fee, hardcode it like this for now
    const determineAdditionalGasUsed = (feeToken, pullingFromEoa) => {
        if (pullingFromEoa) {
            if (feeToken === addrs[network].USDC_ADDR) {
                return 83300 - 21000;
            }
            if (feeToken === addrs[network].DAI_ADDRESS) {
                return 72774 - 21000;
            }
            if (feeToken === addrs[network].WETH_ADDRESS) {
                return 28603 - 21000;
            }
        } else {
            if (feeToken === addrs[network].USDC_ADDR) {
                return 82000 - 21000;
            }
            if (feeToken === addrs[network].DAI_ADDRESS) {
                return 72400 - 21000;
            }
            if (feeToken === addrs[network].WETH_ADDRESS) {
                return 28300 - 21000;
            }
        }
        return 0;
    };

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

        const recipe = new dfs.Recipe('AaveV3 test', [supplyAction, borrowAction]);

        return recipe.encodeForTxRelayCall(txRelayUserSignedData)[1];
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
        const signature = await signSafeTx(proxy, safeTxParamsForSign, senderAcc);
        console.log('signature', signature);
        return signature;
    };

    it('Basic test', async () => {
        const feeTokenAsset = getAssetInfo('DAI');
        // eslint-disable-next-line camelcase
        const fee_token = feeTokenAsset.address;
        await setBalance(fee_token, senderAcc.address, hre.ethers.utils.parseUnits('10000', feeTokenAsset.decimals));
        await approve(fee_token, proxy.address, senderAcc);
        const txRelayUserSignedData = {
            additionalGasUsed: determineAdditionalGasUsed(fee_token, true),
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
        const callData = txRelayExecutorByBot.interface.encodeFunctionData('executeTxUsingFeeTokens', [
            txParams,
        ]);

        const receipt = await txRelayExecutorByBot.executeTxUsingFeeTokens(txParams);

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

        expect(feeTaken).to.be.gt(0);
        expect(feeRecipientFeeTokenBalanceAfter.sub(feeRecipientFeeTokenBalanceBefore)).to.be.equal(feeTaken);
        expect(txRelayFeeTokenBalanceAfter).to.be.equal(0);
    });
});
