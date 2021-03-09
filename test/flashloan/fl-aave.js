
require('dotenv').config();


const { getAssetInfo } = require('@defisaver/tokens');
const dfs = require('defisaver-sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    fetchStandardAmounts,
    nullAddress,
    REGISTRY_ADDR,
    MAX_UINT,
} = require('../utils');

const encodeAaveFLAction = (amount, tokenAddr, flParamGetterAddr, flParamGetterData) => {
    const abiCoder = new ethers.utils.AbiCoder();

    const amountEncoded = abiCoder.encode(['uint256'], [amount]);
    const tokenEncoded = abiCoder.encode(['address'], [tokenAddr]);
    const flParamGetterAddrEncoded = abiCoder.encode(['address'], [flParamGetterAddr]);
    const flParamGetterDataEncoded = abiCoder.encode(['bytes'], [flParamGetterData]);

    return [amountEncoded, tokenEncoded, flParamGetterAddrEncoded, flParamGetterDataEncoded, []];
};

describe("FL-Taker", function() {
    this.timeout(40000);

    let senderAcc, proxy, flAaveId, sendTokenId, aaveFl;

    before(async () => {

        aaveFl = await redeploy("FLAave");
        await redeploy("SendToken");
        await redeploy("TaskExecutor");

        const s = await fetchStandardAmounts();

        flAaveId = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('FLAave'));
        sendTokenId = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('SendToken'));

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    })

    it('... should get an Eth Aave flash loan', async () => {

        const taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

        const loanAmount = ethers.utils.parseEther("1");
        const flCallData = encodeAaveFLAction(loanAmount, getAssetInfo('ETH').address, nullAddress, []);
        const abiCoder = new ethers.utils.AbiCoder();

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
        await proxy['execute(address,bytes)'](taskExecutorAddr, functionData, {value: ethers.utils.parseEther("0.01"), gasLimit: 5000000});
    });
 
});