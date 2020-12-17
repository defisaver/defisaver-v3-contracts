const axios = require('axios');
const dfs = require('defisaver-sdk');

const makerVersion = "1.1.3";

const { getAssetInfo } = require('defisaver-tokens');

const {
    redeploy,
    approve,
    getAddrFromRegistry,
    nullAddress,
    WETH_ADDRESS,
    ETH_ADDR,
    UNISWAP_WRAPPER,
    balanceOf,
    formatExchangeObj,
    isEth,
} = require("./utils"); 

const { getVaultsForUser } = require('./utils-mcd');

const { deployContract } = require("../scripts/utils/deployer");


const encodeFLAction = (amount, tokenAddr, flType) => {
    const abiCoder = new ethers.utils.AbiCoder();

    const amountEncoded = abiCoder.encode(['uint256'], [amount]);
    const tokenEncoded = abiCoder.encode(['address'], [tokenAddr]);
    const flTypeEncoded = abiCoder.encode(['uint8'], [flType]);

    return [amountEncoded, tokenEncoded, flTypeEncoded, []];
};

const sell = async (proxy, sellAddr, buyAddr, sellAmount, wrapper, from, to) => {
    const dfsSellAddr = await getAddrFromRegistry('DFSSell');

    const exchangeObject = formatExchangeObj(
        sellAddr,
        buyAddr,
        sellAmount.toString(),
        wrapper
    );
    
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        from,
        to
    );

    const functionData = sellAction.encodeForDsProxyCall()[1];

    let value = '0';

    if (isEth(sellAddr)) {
        value = sellAmount.toString();
    } else {
        await approve(sellAddr, proxy.address);
    }

    await proxy['execute(address,bytes)'](dfsSellAddr, functionData, {value, gasLimit: 3000000});
};

const openMcd = async (proxy, makerAddresses, joinAddr) => {
    const mcdOpenAddr = await getAddrFromRegistry('McdOpen');

    const openMyVault = new dfs.actions.maker.MakerOpenVaultAction(joinAddr);
    const functionData = openMyVault.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdOpenAddr, functionData, {gasLimit: 3000000});

    const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);

    return vaultsAfter.ids[vaultsAfter.ids.length - 1].toString();
};

const supplyMcd = async (proxy, vaultId, amount, tokenAddr, joinAddr, from) => {
    const tokenBalance = await balanceOf(tokenAddr, from);

    if (tokenBalance.lt(amount)) {
        await sell(
            proxy,
            ETH_ADDR,
            tokenAddr,
            ethers.utils.parseUnits('5', 18),
            UNISWAP_WRAPPER,
            from,
            from
        );
    }

    let mcdSupplyAddr = await getAddrFromRegistry('McdSupply');

    let value = '0';
    if (isEth(tokenAddr)) {
        value = amount.toString();
    } else {
        await approve(tokenAddr, proxy.address);
    }

    const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(vaultId, amount, joinAddr, from);
    const functionData = mcdSupplyAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdSupplyAddr, functionData, {value, gasLimit: 3000000});

};

const paybackMcd = async (proxy, vaultId, amount, from, daiAddr) => {
    const mcdPaybackAddr = await getAddrFromRegistry('McdPayback');

    await approve(daiAddr, proxy.address);

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(vaultId, amount, from);
    const functionData = mcdPaybackAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdPaybackAddr, functionData, {gasLimit: 3000000});
};

const withdrawMcd = async (proxy, vaultId, amount, joinAddr, to) => {
    const mcdWithdrawAddr = await getAddrFromRegistry('McdWithdraw');

    const mcdWithdrawAction = new dfs.actions.maker.MakerWithdrawAction(vaultId, amount, joinAddr, to);
    const functionData = mcdWithdrawAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdWithdrawAddr, functionData, {gasLimit: 3000000});
};

const openVault = async (makerAddresses, proxy, joinAddr, tokenData, collAmount, daiAmount) => {
    const vaultId = await openMcd(proxy, makerAddresses, joinAddr);

    const from = proxy.signer.address;
    const to = proxy.signer.address;

    const amountDai = ethers.utils.parseUnits(daiAmount, 18);
    const amountColl = ethers.utils.parseUnits(collAmount, tokenData.decimals);

    await supplyMcd(proxy, vaultId, amountColl, tokenData.address, joinAddr, from);
    await generateMcd(proxy, vaultId, amountDai, to);

    return vaultId;
};

const supplyAave = async (proxy, market, amount, tokenAddr, from) => {    
    const tokenBalance = await balanceOf(tokenAddr, from);

    if (tokenBalance.lt(amount)) {
        await sell(
            proxy,
            ETH_ADDR,
            tokenAddr,
            ethers.utils.parseUnits('5', 18),
            UNISWAP_WRAPPER,
            from,
            from
        );
    }

    let aaveSupplyAddr = await getAddrFromRegistry('AaveSupply');

    let value = '0';
    if (isEth(tokenAddr)) {
        value = amount.toString();
    } else {
        await approve(tokenAddr, proxy.address);
    }

    const aaveSupplyAction = new dfs.actions.aave.AaveSupplyAction(
        market,
        tokenAddr,
        amount,
        from
    );

    const functionData = aaveSupplyAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](aaveSupplyAddr, functionData, {value, gasLimit: 3000000});
};

const withdrawAave = async (proxy, market, tokenAddr, amount, to) => {
    const aaveWithdrawAddr = await getAddrFromRegistry('AaveWithdraw');

    const aaveWithdrawAction = new dfs.actions.aave.AaveWithdrawAction(market, tokenAddr, amount, to);
    const functionData = aaveWithdrawAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](aaveWithdrawAddr, functionData, {gasLimit: 3000000});
};

const borrowAave = async (proxy, market, tokenAddr, amount, rateMode, to) => {
    const aaveBorroweAddr = await getAddrFromRegistry('AaveBorrow');

    const aaveBorrowAction = new dfs.actions.aave.AaveBorrowAction(market,tokenAddr, amount, rateMode, to);
    const functionData = aaveBorrowAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](aaveBorroweAddr, functionData, {gasLimit: 3000000});
};

const paybackAave = async (proxy, market, tokenAddr, amount, rateMode, from) => {
    const aavePaybackAddr = await getAddrFromRegistry('AavePayback');

    let value = '0';
    if (isEth(tokenAddr)) {
        value = amount;
    } else {
        await approve(tokenAddr, proxy.address);
    }

    const aavePaybackAction = new dfs.actions.aave.AavePaybackAction(market, tokenAddr, amount, rateMode, from);
    const functionData = aavePaybackAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](aavePaybackAddr, functionData, {value, gasLimit: 4000000});
};

const generateMcd = async (proxy, vaultId, amount, to) => {
    const mcdGenerateAddr = await getAddrFromRegistry('McdGenerate');

    const mcdGenerateAction = new dfs.actions.maker.MakerGenerateAction(vaultId, amount, to);
    const functionData = mcdGenerateAction.encodeForDsProxyCall()[1];

    await proxy['execute(address,bytes)'](mcdGenerateAddr, functionData, {gasLimit: 3000000});
};

const buyGasTokens = async (proxy, senderAcc) => {
    const dfsSellAddr = await getAddrFromRegistry('DFSSell');
    const dfsSell = await hre.ethers.getContractAt("DFSSell", dfsSellAddr);

    const sellAddr = getAssetInfo('ETH').address;
    const buyAddr = '0x0000000000b3F879cb30FE243b4Dfee438691c04';

    const amount = ethers.utils.parseUnits('1', 18);

    const callData = await encodeDfsSellAction(
        dfsSell, sellAddr, buyAddr, amount, UNISWAP_WRAPPER, proxy.address, senderAcc.address);

    const DfsSell = await ethers.getContractFactory("DFSSell");
    const functionData = DfsSell.interface.encodeFunctionData(
        "executeAction",
         [callData, [], [0, 0, 0, 0, 0], []]
    );

    await proxy['execute(address,bytes)'](dfsSellAddr, functionData, {value: amount, gasLimit: 2000000});
};

module.exports = {
    sell,
    openMcd,
    supplyMcd,
    generateMcd,
    paybackMcd,
    withdrawMcd,
    openVault,

    supplyAave,
    withdrawAave,
    borrowAave,
    paybackAave,

    encodeFLAction,
    buyGasTokens,
};