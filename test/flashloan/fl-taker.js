
require('dotenv').config();

const { expect } = require("chai");

const { getAssetInfo } = require('defisaver-tokens');
const { tenderlyRPC } = require('hardhat');
// const hre = require("hardhat");

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    nullAddress,
    REGISTRY_ADDR,
} = require('../utils');

const encodeFLAction = (amount, tokenAddr, flType) => {
    const abiCoder = new ethers.utils.AbiCoder();

    const amountEncoded = abiCoder.encode(['uint256'], [amount]);
    const tokenEncoded = abiCoder.encode(['address'], [tokenAddr]);
    const flTypeEncoded = abiCoder.encode(['uint8'], [flType]);

    return [amountEncoded, tokenEncoded, flTypeEncoded];
};

const AAVE_FL = 1;
const DYDX_FL = 2;

describe("FL-Taker", function() {

    let postDeployHead, provider, flTakerId;

    before(async () => {
        // provider = new hre.ethers.providers.Web3Provider(tenderlyRPC);
        // hre.ethers.provider = provider;

        // console.log(tenderlyRPC);

        await redeploy("FLTaker");
        await redeploy("ActionManager");

        this.timeout(40000);

        flTakerId = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('FLTaker'));
    
        // postDeployHead = tenderlyRPC.getHead();
        // tenderlyRPC.setHead(postDeployHead);
    })

    it('... should get an Eth Aave flash loan', async () => {

        const senderAcc = (await hre.ethers.getSigners())[0];

        const proxy = await getProxy(senderAcc.address);

        const actionManagerAddr = await getAddrFromRegistry('ActionManager');

        const loanAmount = ethers.utils.parseEther("1");
        const flCallData = encodeFLAction(loanAmount, getAssetInfo('ETH').address, AAVE_FL);

        const ActionManager = await ethers.getContractFactory("ActionManager");

        const functionData = ActionManager.interface.encodeFunctionData(
            "manageActions",
             ["Flashloan", [flCallData], [[]], [[0, 0, 0]], [flTakerId]]
        );

        // value needed because of aave fl fee
        await proxy['execute(address,bytes)'](actionManagerAddr, functionData, {value: ethers.utils.parseEther("0.01"), gasLimit: 1900000});
    });

    // // it('... should get an Dai Aave flash loan', async () => {
    // //     const senderAcc = (await hre.ethers.getSigners())[0];
    // //     const proxy = await getProxy(senderAcc.address);

    // //     const actionManagerAddr = await getAddrFromRegistry('ActionManager');
    // //     const actionExecutorAddr = await getAddrFromRegistry('ActionExecutor');

    // //     const loanAmount = ethers.utils.parseEther("100");
    // //     const flCallData = encodeFLAction(loanAmount, getAssetInfo('ETH').address, AAVE_FL);

    // //     const ActionManager = await ethers.getContractFactory("ActionManager");

    // //     const functionData = ActionManager.interface.encodeFunctionData(
    // //         "manageActions",
    // //          ["Flashloan", [0], [flCallData]]
    // //     );

    // //     // send dai for fee
    // //     await send(getAssetInfo('DAI').address, actionExecutorAddr, ethers.utils.parseEther("1"));

    // //     await proxy['execute(address,bytes)'](actionManagerAddr, functionData);
    // // });

    it('... should get an Eth DyDx flash loan', async () => {
        const senderAcc = (await hre.ethers.getSigners())[0];
        const proxy = await getProxy(senderAcc.address);

        const actionManagerAddr = await getAddrFromRegistry('ActionManager');

        const loanAmount = ethers.utils.parseEther("1");
        const flCallData = encodeFLAction(loanAmount, getAssetInfo('ETH').address, DYDX_FL);

        const ActionManager = await ethers.getContractFactory("ActionManager");

        const functionData = ActionManager.interface.encodeFunctionData(
            "manageActions",
            ["Flashloan", [flCallData], [[]], [[0, 0, 0]], [flTakerId]]
        );

        // value needed because of 2 wei dydx fee
        await proxy['execute(address,bytes)'](actionManagerAddr, functionData, {value: 100, gasLimit: 2900000});
    });
});