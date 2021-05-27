const { getAssetInfo } = require('@defisaver/tokens');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    nullAddress,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
} = require('../utils');

describe('FL-DyDx', function () {
    this.timeout(60000);

    let senderAcc; let proxy; let taskExecutorAddr; let
        dydxFl;

    const FLASHLOAN_TOKENS = ['WETH', 'DAI', 'USDC'];

    before(async () => {
        taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

        dydxFl = await redeploy('FLDyDx');
        await redeploy('SendToken');
        await redeploy('TaskExecutor');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < FLASHLOAN_TOKENS.length; ++i) {
        const tokenSymbol = FLASHLOAN_TOKENS[i];

        it(`... should get an ${tokenSymbol} DyDx flash loan`, async () => {
            const assetInfo = getAssetInfo(tokenSymbol);

            if (assetInfo.symbol === 'ETH') {
                assetInfo.address = WETH_ADDRESS;
            }

            const amount = fetchAmountinUSDPrice(tokenSymbol, '1000');
            const loanAmount = hre.ethers.utils.parseUnits(
                amount,
                assetInfo.decimals,
            );

            const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                new dfs.actions.flashloan.DyDxFlashLoanAction(
                    loanAmount,
                    assetInfo.address,
                    nullAddress,
                    [],
                ),
                new dfs.actions.basic.SendTokenAction(
                    assetInfo.address,
                    dydxFl.address,
                    hre.ethers.constants.MaxUint256,
                ),
            ]);

            const functionData = basicFLRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], {
                gasLimit: 3000000,
            });
        });
    }
});
