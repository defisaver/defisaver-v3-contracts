const axios = require('axios');

const makerVersion = "1.1.3";

const { getAssetInfo } = require('defisaver-tokens');

const {
    redeploy,
    approve,
    getAddrFromRegistry,
    nullAddress,
    WETH_ADDRESS,
    UNISWAP_WRAPPER,
} = require("./utils"); 

const { getVaultsForUser } = require('./utils-mcd');

const { deployContract } = require("../scripts/utils/deployer");

const encodeMcdOpenAction = (joinAddr) => {
    const abiCoder = new ethers.utils.AbiCoder();

    const encodeActionParams = abiCoder.encode(
        ['address'],
        [joinAddr]
    );

    return encodeActionParams;
};

const encodeMcdSupplyAction = (cdpId, amount, joinAddr, from) => {
    const abiCoder = new ethers.utils.AbiCoder();

    const cdpIdEncoded = abiCoder.encode(['uint256'], [cdpId]);
    const amountEncoded = abiCoder.encode(['uint256'], [amount]);
    const joinAddrEncoded = abiCoder.encode(['address'], [joinAddr]);
    const fromEncoded = abiCoder.encode(['address'], [from]);

    return [cdpIdEncoded, amountEncoded, joinAddrEncoded, fromEncoded];
};

const encodeDfsSellAction = async  (dfsSell, fromToken, toToken, amount, wrapperAddress, from, to) => {
    const abiCoder = new ethers.utils.AbiCoder();

    let firstPath = fromToken;
    let secondPath = toToken;

    if (fromToken.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        firstPath = WETH_ADDRESS;
    }

    if (toToken.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        secondPath = WETH_ADDRESS;
    }

    const path = abiCoder.encode(['address[]'],[[firstPath, secondPath]]);

    const exchangeData = await dfsSell.packExchangeData([
        fromToken, toToken, amount.toString(), 0, 0, 0, nullAddress, wrapperAddress, path,
        [nullAddress, nullAddress, 0, 0, ethers.utils.toUtf8Bytes('')]
    ]);

    const fromEncoded = abiCoder.encode(['address'], [from]);
    const toEncoded = abiCoder.encode(['address'], [from]);

    return [exchangeData, fromEncoded, toEncoded];
};

const sell = async (proxy, sellToken, buyToken, sellAmount, from, to) => {
    const dfsSellAddr = await getAddrFromRegistry('DFSSell');

    if (dfsSellAddr === nullAddress) {
        await redeploy('DFSSell');
    }

    const dfsSell = await hre.ethers.getContractAt("DFSSell", dfsSellAddr);

    const sellAddr = getAssetInfo(sellToken).address;
    const buyAddr = getAssetInfo(buyToken).address;

    const amount = sellAmount * 10**getAssetInfo(sellToken).decimals;
    let value = '0';

    if (sellToken.toLowerCase() === 'eth') {
        value = amount.toString();
    } else {
        await approve(sellAddr, proxy.address);
    }

    if (sellAddr === nullAddress || buyAddr === nullAddress) {
        console.log("Can't find tokens address");
    }

    const callData = await encodeDfsSellAction(
        dfsSell, sellAddr, buyAddr, amount, UNISWAP_WRAPPER, from, to);

    const DfsSell = await ethers.getContractFactory("DFSSell");
    const functionData = DfsSell.interface.encodeFunctionData(
        "executeAction",
         [callData, [], [0, 0, 0, 0, 0], []]
    );

    await proxy['execute(address,bytes)'](dfsSellAddr, functionData, {value, gasLimit: 2000000});

};

const openMcd = async (proxy, makerAddresses, joinAddr) => {
    const mcdOpenAddr = await getAddrFromRegistry('McdOpen');

    if (mcdOpenAddr === nullAddress) {
        await redeploy('McdOpen');
    }

    const callData = encodeMcdOpenAction(joinAddr);

    const McdOpen = await ethers.getContractFactory("McdOpen");
    const functionData = McdOpen.interface.encodeFunctionData(
        "executeAction",
            [[callData], [], [0], []]
    );

    await proxy['execute(address,bytes)'](mcdOpenAddr, functionData, {gasLimit: 1000000});

    const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);

    return vaultsAfter.ids[vaultsAfter.ids.length - 1].toString();
};

const supplyMcd = async (proxy, symbol, tokenAddr, vaultId, amount, joinAddr, from) => {
    let mcdSupplyAddr = await getAddrFromRegistry('McdSupply');

    if (mcdSupplyAddr === nullAddress) {
        await redeploy('McdSupply');
    }

    mcdSupplyAddr = await getAddrFromRegistry('McdSupply');

    const callData = encodeMcdSupplyAction(vaultId, amount, joinAddr, from);

    let value = '0';

    if (symbol.toLowerCase() === 'eth') {
        value = amount.toString();
    } else {
        await approve(tokenAddr, proxy.address);
    }

    const McdSupply = await ethers.getContractFactory("McdSupply");
    const functionData = McdSupply.interface.encodeFunctionData(
        "executeAction",
            [callData, [], [0, 0, 0, 0], []]
    );

    await proxy['execute(address,bytes)'](mcdSupplyAddr, functionData, {value, gasLimit: 2000000});
};



module.exports = {
    sell,
    openMcd,
    supplyMcd,
    encodeDfsSellAction,
    encodeMcdSupplyAction,
    encodeMcdOpenAction,
};