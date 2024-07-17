/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const { start } = require('./utils/starter');

const {
    redeploy, addrs, network, fetchAmountinUSDPrice, approve, setBalance,
    getOwnerAddr,
} = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);
    await topUp(getOwnerAddr());
    await redeploy('LlamaLendCreate', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('LlamaLendSupply', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('LlamaLendBorrow', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('LlamaLendSelfLiquidate', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('LlamaLendPayback', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('LlamaLendWithdraw', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('LlamaLendGetDebt', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('LlamaLendBoost', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('LlamaLendRepay', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('LlamaLendLevCreate', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('LlamaLendSelfLiquidateWithColl', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('LlamaLendSwapper', addrs[network].REGISTRY_ADDR, true, true);
}

start(main);
