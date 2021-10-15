/* eslint-disable no-mixed-operators */
const { getAssetInfo } = require('@defisaver/tokens');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    nullAddress,
    fetchAmountinUSDPrice,
} = require('../utils');

describe('FL-Balancer', function () {
    this.timeout(60000);

    let senderAcc; let proxy; let taskExecutorAddr;
    let flBalancer;

    before(async () => {
        taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

        flBalancer = await redeploy('FLBalancer');
        await redeploy('SendToken');
        await redeploy('TaskExecutor');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    const tokenSymbols = ['WETH', 'WBTC'].sort();

    it(`... should get a ${tokenSymbols} Balancer flash loan`, async () => {
        const assetInfo = tokenSymbols.map((e) => getAssetInfo(e));
        const tokenAddrs = assetInfo.map((e) => e.address);
        const amounts = tokenSymbols.map((e) => fetchAmountinUSDPrice(e, '1000'));
        const loanAmounts = tokenSymbols.map((e, i) => hre.ethers.utils.parseUnits(
            amounts[i],
            assetInfo[i].decimals,
        ));

        const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
            new dfs.actions.flashloan.BalancerFlashLoanAction(
                tokenAddrs,
                loanAmounts,
                nullAddress,
                [],
            ),
            new dfs.actions.basic.SendTokenAction(
                tokenAddrs[0],
                flBalancer.address,
                hre.ethers.constants.MaxUint256,
            ),
            new dfs.actions.basic.SendTokenAction(
                tokenAddrs[1],
                flBalancer.address,
                hre.ethers.constants.MaxUint256,
            ),
        ]);

        const functionData = basicFLRecipe.encodeForDsProxyCall();

        await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], {
            gasLimit: 3000000,
        });
    });
});
