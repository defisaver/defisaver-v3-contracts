
const {
    getAddrFromRegistry,
} = require('./utils');

class TaskBuilder {
    constructor(_name) {
        this.name = _name;
        this.actionIds = [];
        this.actionCallData = [];
        this.paramMapping= [];
        this.subData = [];
    }

    addAction(actionName, actionData, paramMapping) {
        this.actionIds.push(hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(actionName)));
        this.actionCallData.push(actionData);
        this.paramMapping.push(paramMapping);
        this.subData.push([]);
    }
    
    async execute(proxy) {
        const taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

        const TaskExecutor = await ethers.getContractFactory("TaskExecutor");
        const functionData = TaskExecutor.interface.encodeFunctionData(
            "executeTask",
            [[this.name, this.actionCallData, this.subData, this.actionIds, this.paramMapping]]
        );

        await proxy['execute(address,bytes)'](taskExecutorAddr, functionData, {value: 0, gasLimit: 2900000});
    }
}

module.exports = TaskBuilder;