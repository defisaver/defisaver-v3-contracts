/* eslint-disable max-len */
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { BigNumber } = require('ethers');

const {
    impersonateAccount,
    getAddrFromRegistry,
    stopImpersonatingAccount,
    getOwnerAddr,
    nullAddress,
    addrs,
    network,
    WBTC_ADDR,
    LUSD_ADDR,
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

    const supplyToken = WBTC_ADDR;
    const supplyAmount = hre.ethers.utils.parseUnits('10', 8);
    const supplyAssetReserveData = await aavePool.getReserveData(supplyToken);
    const supplyAssetId = supplyAssetReserveData.id;

    const borrowToken = LUSD_ADDR;
    const borrowAmount = hre.ethers.utils.parseUnits('10000', 18);
    const borrowAssetReserveData = await aavePool.getReserveData(borrowToken);
    const borrowAssetReserveDataId = borrowAssetReserveData.id;

    await setBalance(supplyToken, senderAcc.address, supplyAmount);
    await approve(supplyToken, wallet.address, senderAcc);

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
                addrs[network].UNISWAP_WRAPPER,
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
    const signature = await signSafeTx(wallet, safeTxParamsForSign, senderAcc);
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
