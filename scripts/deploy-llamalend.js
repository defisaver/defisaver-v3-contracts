/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const { start } = require('./utils/starter');

const {
    redeploy, addrs, network, fetchAmountinUSDPrice, approve, setBalance,
} = require('../test/utils');

const { topUp } = require('./utils/fork');
const { getControllers, supplyToMarket } = require('../test/llamalend/utils');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);
    const controllers = getControllers();

    for (let i = 2; i < controllers.length; i++) {
        /*
        // await supplyToMarket(controllers[i]);
        const controller = await hre.ethers.getContractAt('ILlamaLendController', controllers[i]);
        const collTokenAddress = await controller.collateral_token();

        const collToken = getAssetInfoByAddress(collTokenAddress);
        const supplyAmount = fetchAmountinUSDPrice(collToken.symbol, '500000');
        const supplyAmountInWei = hre.ethers.utils.parseUnits(supplyAmount, collToken.decimals);
        await setBalance(
            collToken.address,
            senderAcc.address,
            supplyAmountInWei,
        );

        const loanTokenAddress = await controller.borrowed_token();
        const loanToken = getAssetInfoByAddress(loanTokenAddress);
        const borrowAmount = fetchAmountinUSDPrice(loanToken.symbol, '20000');
        const borrowAmountWei = hre.ethers.utils.parseUnits(borrowAmount, loanToken.decimals);
        console.log(supplyAmountInWei);
        console.log(borrowAmountWei);
        await approve(collTokenAddress, controllers[i], senderAcc);
        await controller.create_loan(supplyAmountInWei, borrowAmountWei, 10);
        */
        const crvController = await hre.ethers.getContractAt('ILlamaLendController', controllers[i]);
        const llammaAddress = await crvController.amm();
        const llammaExchange = await hre.ethers.getContractAt('contracts/interfaces/llamalend/ILLAMA.sol:ILLAMMA', llammaAddress);
        const borrowedTokenAddr = await crvController.borrowed_token();
        const collTokenAddr = await crvController.collateral_token();
        const swapAmount = hre.ethers.utils.parseUnits('100000');
        await setBalance(borrowedTokenAddr, senderAcc.address, swapAmount);
        await approve(borrowedTokenAddr, llammaAddress);
        await llammaExchange.exchange(0, 1, swapAmount, 1, { gasLimit: 5000000 });
    }
    /*

    const create = await redeploy('LlamaLendCreate', addrs[network].REGISTRY_ADDR, true, true);
    const supply = await redeploy('LlamaLendSupply', addrs[network].REGISTRY_ADDR, true, true);
    const withdraw = await redeploy('LlamaLendWithdraw', addrs[network].REGISTRY_ADDR, true, true);
    const borrow = await redeploy('LlamaLendBorrow', addrs[network].REGISTRY_ADDR, true, true);
    const selfLiquidate = await redeploy('LlamaLendSelfLiquidate', addrs[network].REGISTRY_ADDR, true, true);
    const payback = await redeploy('LlamaLendPayback', addrs[network].REGISTRY_ADDR, true, true);

    console.log(`LlamaLendView: ${view.address}`);
    console.log(`LlamaLendCreate: ${create.address}`);
    console.log(`LlamaLendSupply: ${supply.address}`);
    console.log(`LlamaLendWithdraw: ${withdraw.address}`);
    console.log(`LlamaLendBorrow: ${borrow.address}`);
    console.log(`LlamaLendSelfLiquidate: ${selfLiquidate.address}`);
    console.log(`LlamaLendPayback: ${payback.address}`);
    */
    process.exit(0);
}

start(main);
