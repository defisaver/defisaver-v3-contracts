
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

const { encodeFLAction } = require('../actions');

const AAVE_FL = 1;

describe("FL-Taker", function() {

    let postDeployHead, provider, flAaveId;

    before(async () => {

        await redeploy("FLAave");
        await redeploy("TaskExecutor");

        this.timeout(40000);

        flAaveId = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('FLAave'));

    })

    it('... should get an Eth Aave flash loan', async () => {

        const senderAcc = (await hre.ethers.getSigners())[0];

        const proxy = await getProxy(senderAcc.address);

        const taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

        const loanAmount = ethers.utils.parseEther("1");
        const flCallData = encodeFLAction(loanAmount, getAssetInfo('ETH').address, AAVE_FL);

        const TaskExecutor = await ethers.getContractFactory("TaskExecutor");
        console.log(TaskExecutor.interface.functions);

        const functionData = TaskExecutor.interface.encodeFunctionData(
            "executeTask",
            [
                ["Flashloan", [flCallData], [[]], [flAaveId], [[0, 0, 0]]]
            ]
        );

        // value needed because of aave fl fee
        await proxy['execute(address,bytes)'](taskExecutorAddr, functionData, {value: ethers.utils.parseEther("0.01"), gasLimit: 1900000});
    });
 
});