
require('dotenv').config();

const { expect } = require("chai");

const { getAssetInfo } = require('defisaver-tokens');
const { tenderlyRPC } = require('hardhat');
const dfs = require('defisaver-sdk');

// const hre = require("hardhat");

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    nullAddress,
    REGISTRY_ADDR,
    MAX_UINT,
} = require('../utils');

const { encodeFLAction } = require('../actions');

const AAVE_FL = 1;

describe("FL-Taker", function() {

    let postDeployHead, provider, flAaveId, sendTokenId, aaveFl;

    before(async () => {

        aaveFl = await redeploy("FLAave");
        await redeploy("SendToken");
        await redeploy("TaskExecutor");

        this.timeout(40000);

        flAaveId = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('FLAave'));
        sendTokenId = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('SendToken'));
    })

    it('... should get an Eth Aave flash loan', async () => {

        const senderAcc = (await hre.ethers.getSigners())[0];

        const proxy = await getProxy(senderAcc.address);

        const taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

        const loanAmount = ethers.utils.parseEther("1");
        const flCallData = encodeFLAction(loanAmount, getAssetInfo('ETH').address, AAVE_FL);
        const abiCoder = new ethers.utils.AbiCoder();
        const sendEth = [abiCoder.encode(['address'], [getAssetInfo('ETH').address]), abiCoder.encode(['address'], [senderAcc.address]), abiCoder.encode(['uint256'], ["1000"])];
        const repayFL = [abiCoder.encode(['address'], [getAssetInfo('ETH').address]), abiCoder.encode(['address'], [aaveFl.address]), abiCoder.encode(['uint256'], [MAX_UINT])];

        const TaskExecutor = await ethers.getContractFactory("TaskExecutor");

        const functionData = TaskExecutor.interface.encodeFunctionData(
            "executeTask",
            [
                ["Flashloan", [flCallData, repayFL], [[], []], [flAaveId, sendTokenId], [[0, 0, 0], [0, 0, 0]]]
            ]
        );

        console.log('sending tx');
        // value needed because of aave fl fee
        await proxy['execute(address,bytes)'](taskExecutorAddr, functionData, {value: ethers.utils.parseEther("0.01"), gasLimit: 2900000});

        console.log('tx sent');
    });
 
});