const { deployContract } = require("../defisaverv2/deployers/utils/deployer");
const { start } = require('../defisaverv2/deployers/utils/starter');

async function main() {
     await deployContract("Test");
}

start(main);
