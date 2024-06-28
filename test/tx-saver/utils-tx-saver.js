/* eslint-disable max-len */
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { BigNumber } = require('ethers');
const { getAssetInfo } = require('@defisaver/tokens');

const {
    impersonateAccount,
    getAddrFromRegistry,
    stopImpersonatingAccount,
    getOwnerAddr,
    nullAddress,
    addrs,
    network,
    setBalance,
    approve,
    formatExchangeObj,
    fetchAmountinUSDPrice,
    chainIds,
    formatMockExchangeObj,
} = require('../utils');
const { supplyToMarket } = require('../llamalend/utils');
const { signSafeTx } = require('../utils-safe');

const addBotCallerForTxSaver = async (
    botAddr,
    isFork = false,
) => {
    if (!isFork) {
        await impersonateAccount(getOwnerAddr());
    }

    const signer = await hre.ethers.provider.getSigner(getOwnerAddr());
    const botAuthAddr = await getAddrFromRegistry('BotAuthForTxSaver');

    const botAuthInstance = await hre.ethers.getContractFactory('BotAuthForTxSaver', signer);
    let botAuth = await botAuthInstance.attach(botAuthAddr);

    botAuth = botAuth.connect(signer);

    await botAuth.addCaller(botAddr, { gasLimit: 800000 });

    if (!isFork) {
        await stopImpersonatingAccount(getOwnerAddr());
    }
};

const emptyInjectedOrder = {
    wrapper: nullAddress,
    wrapperData: hre.ethers.utils.arrayify('0x'), // Empty bytes
    offchainData: {
        wrapper: nullAddress,
        exchangeAddr: nullAddress,
        allowanceTarget: nullAddress,
        price: 0,
        protocolFee: 0,
        callData: hre.ethers.utils.arrayify('0x'), // Empty bytes
    },
};

const openAavePositionEncodedData = async (senderAcc, wallet, txSaverUserSignedData) => {
    const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
    const poolAddress = await aaveMarketContract.getPool();
    const aavePool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

    const supplyAsset = getAssetInfo('WETH', chainIds[network]);
    const supplyToken = supplyAsset.address;
    const supplyAmount = fetchAmountinUSDPrice(
        supplyAsset.symbol,
        '50000',
    );
    const supplyAmountInWei = hre.ethers.utils.parseUnits(supplyAmount, supplyAsset.decimals);
    const supplyAssetReserveData = await aavePool.getReserveData(supplyToken);
    const supplyAssetId = supplyAssetReserveData.id;

    const borrowAsset = getAssetInfo('USDC', chainIds[network]);
    const borrowToken = borrowAsset.address;
    const borrowAmount = fetchAmountinUSDPrice(
        borrowAsset.symbol,
        '20000',
    );
    const borrowAmountInWei = hre.ethers.utils.parseUnits(borrowAmount, borrowAsset.decimals);
    const borrowAssetReserveData = await aavePool.getReserveData(borrowToken);
    const borrowAssetReserveDataId = borrowAssetReserveData.id;

    await setBalance(supplyToken, senderAcc.address, supplyAmountInWei);
    await approve(supplyToken, wallet.address, senderAcc);

    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        true,
        addrs[network].AAVE_MARKET,
        supplyAmountInWei.toString(),
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
        borrowAmountInWei.toString(),
        senderAcc.address,
        2,
        borrowAssetReserveDataId,
        false,
        nullAddress,
    );

    const recipe = new dfs.Recipe('AaveV3OpenRecipe-TxSaverTest', [supplyAction, borrowAction]);

    return recipe.encodeForTxSaverCall(txSaverUserSignedData)[1];
};

const dfsSellEncodedData = async (
    wallet,
    senderAcc,
    txSaverSignedData,
    srcToken,
    destToken,
    sellAmount,
    fee = 3000,
) => {
    await setBalance(srcToken, senderAcc.address, BigNumber.from(sellAmount).mul(2));
    await approve(srcToken, wallet.address, senderAcc);

    const recipe = new dfs.Recipe('SellRecipe-TxSaverTest', [
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
                fee,
            ),
            wallet.address,
            senderAcc.address,
        ),
    ]);
    return recipe.encodeForTxSaverCall(txSaverSignedData)[1];
};

const llamaLendLevCreateEncodedData = async (
    senderAcc,
    wallet,
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
    await approve(collToken.address, wallet.address, senderAcc);

    const recipe = new dfs.Recipe('LlamaLendLevCreateRecipe-TxSaverTest', [
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

const signSafeTransaction = async (
    senderAcc,
    wallet,
    recipeExecutorAddr,
    functionData,
    refundReceiver,
) => {
    const safeTxParamsForSign = {
        to: recipeExecutorAddr,
        value: 0,
        data: functionData,
        operation: 1,
        safeTxGas: 0,
        baseGas: 0,
        gasPrice: 0,
        gasToken: hre.ethers.constants.AddressZero,
        refundReceiver,
        nonce: await wallet.nonce(),
    };
    const signature = await signSafeTx(wallet, safeTxParamsForSign, senderAcc, chainIds[network]);
    return signature;
};

const wdiv = (x, y) => {
    const WAD = BigNumber.from(10).pow(18);
    return x.mul(WAD).add(y.div(2)).div(y);
};

const calculateExpectedFeeTaken = async (
    gasUsed,
    tokenAsset,
    tokenPriceInEth,
    gasPrice,
) => {
    const gasUsedBn = BigNumber.from(gasUsed);
    const gasPriceBn = BigNumber.from(gasPrice);
    const tokenPriceInEthBn = BigNumber.from(tokenPriceInEth);
    const txCost = gasUsedBn.mul(gasPriceBn);

    if (tokenAsset.symbol === 'ETH' || tokenAsset.symbol === 'WETH') {
        return txCost;
    }
    const x = wdiv(txCost, tokenPriceInEthBn);
    const y = BigNumber.from(10).pow(18 - tokenAsset.decimals);
    return x.div(y);
};

module.exports = {
    addBotCallerForTxSaver,
    emptyInjectedOrder,
    openAavePositionEncodedData,
    dfsSellEncodedData,
    llamaLendLevCreateEncodedData,
    signSafeTransaction,
    calculateExpectedFeeTaken,
};
