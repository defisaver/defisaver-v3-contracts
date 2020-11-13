
const {
    getAddrFromRegistry,
} = require('./utils');

class TaskBuilder {
    constructor(_name) {
        this.name = _name;
        this.actionIds = [];
        this.actionCallData = [];
        this.paramMapping= [];
    }

    addAction(actionName, actionData, paramMapping) {
        this.actionIds.push(hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(actionName)));
        this.actionCallData.push(actionData);
        this.paramMapping.push(paramMapping);
    }
    
    async execute(proxy) {
        const taskManagerAddr = await getAddrFromRegistry('TaskManager');

        const TaskManager = await ethers.getContractFactory("TaskManager");
        const functionData = TaskManager.interface.encodeFunctionData(
            "executeTask",
            [[this.name, this.actionCallData, [[], [], []], this.actionIds, this.paramMapping]]
        );

        await proxy['execute(address,bytes)'](taskManagerAddr, functionData, {value: 0, gasLimit: 2900000});
    }
}

module.exports = TaskBuilder;