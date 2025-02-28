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
    await redeploy('LlamaLendCreate', true);
    await redeploy('LlamaLendSupply', true);
    await redeploy('LlamaLendBorrow', true);
    await redeploy('LlamaLendSelfLiquidate', true);
    await redeploy('LlamaLendPayback', true);
    await redeploy('LlamaLendWithdraw', true);
    await redeploy('LlamaLendGetDebt', true);
    await redeploy('LlamaLendBoost', true);
    await redeploy('LlamaLendRepay', true);
    await redeploy('LlamaLendLevCreate', true);
    await redeploy('LlamaLendSelfLiquidateWithColl', true);
    await redeploy('LlamaLendSwapper', true);
}

start(main);
