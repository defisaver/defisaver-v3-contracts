const { deployContract } = require("./utils/deployer");
const { start } = require('./utils/starter');

async function main() {
     await deployContract("Test");
}

start(main);
