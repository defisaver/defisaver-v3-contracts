
require('dotenv').config();

const { expect } = require("chai");

const { getAssetInfo } = require('defisaver-tokens');
const { tenderlyRPC } = require('hardhat');
// const hre = require("hardhat");

const {
    getAddrFromRegistry,
    getProxyWithSigner,
    redeploy,
    send,
    nullAddress,
    REGISTRY_ADDR,
    MAX_UINT,
    sendEther,
    impersonateAccount,
    balanceOf,
} = require('../utils');

const {
    getAaveTokenInfo,
    getAaveDataProvider,
} = require('../utils-aave');

const encodeCustomFLAction = (viewerAddr, onBehalfOfAddr, userAddr, tokensAddr) => {
    const abiCoder = new ethers.utils.AbiCoder();

    const viewer = abiCoder.encode(['address'], [viewerAddr]);
    const onBehalf = abiCoder.encode(['address'], [onBehalfOfAddr]);
    const flLoanDataBytes = abiCoder.encode(['address','address[]'], [userAddr,tokensAddr]);
    const flashLoanData = abiCoder.encode(['bytes'], [flLoanDataBytes]);

    return [viewer, onBehalf, flashLoanData, []];
}

const encodePaybackV1 = (token, amount, from, onBehalf) => {
    const abiCoder = new ethers.utils.AbiCoder();

    const tokenE = abiCoder.encode(['address'], [token]);
    const amountE = abiCoder.encode(['uint256'], [amount]);
    const fromE = abiCoder.encode(['address'], [from]);
    const onBehalfE = abiCoder.encode(['address'], [onBehalf])

    return [tokenE, amountE, fromE, onBehalfE];
}

const encodeSendToken = (token, amount, to) => {
    const abiCoder = new ethers.utils.AbiCoder();

    const tokenE = abiCoder.encode(['address'], [token]);
    const amountE = abiCoder.encode(['uint256'], [amount]);
    const toE = abiCoder.encode(['address'], [to]);

    return [tokenE, toE, amountE]; 
}

const encodeAaveSupply = (market, token, amount, from) => {
    const abiCoder = new ethers.utils.AbiCoder();

    const marketE = abiCoder.encode(['address'], [market]);
    const tokenE = abiCoder.encode(['address'], [token]);
    const amountE = abiCoder.encode(['uint256'], [amount]);
    const fromE = abiCoder.encode(['address'], [from]);

    return [marketE, tokenE, amountE, fromE]; 
}

const encodeWithdrawV1 = (token, amount, to) => {
    const abiCoder = new ethers.utils.AbiCoder();

    const tokenE = abiCoder.encode(['address'], [token]);
    const amountE = abiCoder.encode(['uint256'], [amount]);
    const toE = abiCoder.encode(['address'], [to]);

    return [tokenE, amountE, toE];    
}

describe("FL-Taker", function() {

    let postDeployHead, provider, flAaveId, aaveV1View, aaveView, dataProvider;

    const lendingPoolAddrProvider = '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5';

    before(async () => {

        await redeploy("FLCustomAaveV2");
        aaveV1View = await redeploy("AaveV1FullPositionView");
        await redeploy("AavePaybackV1");
        await redeploy("AaveWithdrawV1");
        await redeploy("TaskExecutor");
        await redeploy("AaveSupply");
        aaveView = await redeploy("AaveView");
        dataProvider = await getAaveDataProvider();

        this.timeout(40000);

        flAaveId = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('FLCustomAaveV2'));
        aaveSupplyId = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('AaveSupply'));
        aavePaybackV1Id = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('AavePaybackV1'));
        aaveWithdrawV1Id = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('AaveWithdrawV1'));
    })

    it('... should get an Eth Aave flash loan', async () => {

        const TEST_ACC = '0x0a80C3C540eEF99811f4579fa7b1A0617294e06f';

        const supplierAcc = (await hre.ethers.getSigners())[0];

        await impersonateAccount(TEST_ACC);

        const senderAcc = await hre.ethers.provider.getSigner(TEST_ACC);
        const proxy = await getProxyWithSigner(senderAcc, TEST_ACC);

        proxy.connect(senderAcc);

        // send to proxy to supply it before paying back debt
        await sendEther(supplierAcc, proxy.address, "10")

        const taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');
        const tokens = [getAssetInfo('DAI').address, getAssetInfo('MANA').address, getAssetInfo('REN').address];

        const flCallData = encodeCustomFLAction(aaveV1View.address, proxy.address, proxy.address, tokens);
        const paybackDai = encodePaybackV1(getAssetInfo('DAI').address, MAX_UINT, proxy.address, proxy.address);
        const paybackMana = encodePaybackV1(getAssetInfo('MANA').address, MAX_UINT, proxy.address, proxy.address);
        const paybackRen = encodePaybackV1(getAssetInfo('REN').address, MAX_UINT, proxy.address, proxy.address);
        const withdrawEth = encodeWithdrawV1(getAssetInfo('ETH').address, MAX_UINT, proxy.address);
        const withdrawDai = encodeWithdrawV1(getAssetInfo('DAI').address, MAX_UINT, proxy.address);
        const supplyEth = encodeAaveSupply(lendingPoolAddrProvider, getAssetInfo('ETH').address, MAX_UINT, proxy.address);
        const supplyDai = encodeAaveSupply(lendingPoolAddrProvider, getAssetInfo('DAI').address, MAX_UINT, proxy.address);

        const callData = [flCallData, paybackDai, paybackMana, paybackRen, withdrawEth, withdrawDai, supplyEth, supplyDai];
        const actions = [flAaveId, aavePaybackV1Id, aavePaybackV1Id, aavePaybackV1Id, aaveWithdrawV1Id, aaveWithdrawV1Id, aaveSupplyId, aaveSupplyId];

        let subData = [];
        let paramMapping = [];

        for (let i=0; i<callData.length; i++) {
            subData.push([]);
            paramMapping.push([0,0,0,0,0]);
        }
        

        const TaskExecutor = await ethers.getContractFactory("TaskExecutor");

        const functionData = TaskExecutor.interface.encodeFunctionData(
            "executeTask",
            [
                ["Migration", callData, subData, actions, paramMapping]
            ]
        );

        // value needed because of aave fl fee
        await proxy['execute(address,bytes)'](taskExecutorAddr, functionData, {value: ethers.utils.parseEther("0.01"), gasLimit: 6900000});
    });
 
});