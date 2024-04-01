/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network, setNewExchangeWrapper } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    await topUp(addrs[network].OWNER_ACC);

    await redeploy('CreateSub', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('McdRepayComposite', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('McdBoostComposite', addrs[network].REGISTRY_ADDR, true, true);


    // const recipeExecutor = await redeploy('RecipeExecutor', addrs[network].REGISTRY_ADDR, true, true);

    // const safeModuleAuth = await redeploy('SafeModuleAuth', addrs[network].REGISTRY_ADDR, true, true);

    // const flAction = await redeploy('FLAction', addrs[network].REGISTRY_ADDR, true, true);

    // const dfsSell = await redeploy('DFSSell', addrs[network].REGISTRY_ADDR, true, true);

    // const uniswapWrapper = await redeploy('UniswapWrapperV3', addrs[network].REGISTRY_ADDR, true, true);
    // await setNewExchangeWrapper('UniswapWrapperV3', uniswapWrapper.address, true);

    // const uniV3WrapperV3 = await redeploy('UniV3WrapperV3', addrs[network].REGISTRY_ADDR, true, true);
    // await setNewExchangeWrapper('UniV3WrapperV3', uniV3WrapperV3.address, true);

    // const curveWrapperV3 = await redeploy('CurveWrapperV3', addrs[network].REGISTRY_ADDR, true, true);
    // await setNewExchangeWrapper('CurveWrapperV3', curveWrapperV3.address, true);

    // console.log('CurveWrapperV3 deployed to:', curveWrapperV3.address);
    // console.log('UniswapWrapperV3 deployed to:', uniswapWrapper.address);
    // console.log('UniV3WrapperV3 deployed to:', uniV3WrapperV3.address);

    // console.log('RecipeExecutor deployed to:', recipeExecutor.address);
    // console.log('SafeModuleAuth deployed to:', safeModuleAuth.address);

    // console.log('FLAction deployed to:', flAction.address);
    // console.log('DFSSell deployed to:', dfsSell.address);

    process.exit(0);
}

main();
