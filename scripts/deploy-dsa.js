const hre = require('hardhat');
const { topUp } = require('./utils/fork');
const { getOwnerAddr, redeploy, network } = require('../test/utils/utils');
const { addDefiSaverConnector } = require('../test/utils/insta');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);
    await topUp(getOwnerAddr(), network);

    const dfsConnector = await redeploy('ConnectV2DefiSaver', true);
    await addDefiSaverConnector(dfsConnector.address, true);
    await addDefiSaverConnector(dfsConnector.address, true);

    const recipeExecutor = await redeploy('RecipeExecutor', true);
    const flAction = await redeploy('FLAction', true);

    console.log('Defi saver connector deployed at:', dfsConnector.address);
    console.log('Recipe executor deployed at:', recipeExecutor.address);
    console.log('FLAction deployed at:', flAction.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
