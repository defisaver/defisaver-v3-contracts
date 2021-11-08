/* eslint-disable no-mixed-operators */
const { getAssetInfo } = require('@defisaver/tokens');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    balanceOf,
    nullAddress,
    UNISWAP_WRAPPER,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
} = require('../utils');

const { sell } = require('../actions');

describe('FL-Maker', function () {
    this.timeout(60000);

    let senderAcc; let proxy; let recipeExecutorAddr;
    let flMaker;

    before(async () => {
        await redeploy('RecipeExecutor');
        recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');

        flMaker = await redeploy('FLMaker');
        await redeploy('SendToken');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    const tokenSymbol = 'DAI';

    it(`... should get a ${tokenSymbol} Maker flash loan`, async () => {
        const assetInfo = getAssetInfo(tokenSymbol);

        const amount = fetchAmountinUSDPrice(tokenSymbol, '1000');
        const loanAmount = hre.ethers.utils.parseUnits(
            amount,
            assetInfo.decimals,
        );
        const feeAmount = '0';

        const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
            new dfs.actions.flashloan.MakerFlashLoanAction(
                loanAmount,
                nullAddress,
                [],
            ),
            new dfs.actions.basic.SendTokenAction(
                assetInfo.address,
                flMaker.address,
                hre.ethers.constants.MaxUint256,
            ),
        ]);

        const functionData = basicFLRecipe.encodeForDsProxyCall();

        // buy token so we have it for fee
        const tokenBalance = await balanceOf(assetInfo.address, senderAcc.address);

        if (tokenBalance.lt(feeAmount)) {
            await sell(
                proxy,
                WETH_ADDRESS,
                assetInfo.address,
                hre.ethers.utils.parseUnits('1', 18),
                UNISWAP_WRAPPER,
                senderAcc.address,
                senderAcc.address,
            );
        }

        await send(assetInfo.address, proxy.address, feeAmount);

        await proxy['execute(address,bytes)'](recipeExecutorAddr, functionData[1], {
            gasLimit: 3000000,
        });
    });
});
