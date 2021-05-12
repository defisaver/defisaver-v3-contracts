const { getAssetInfo } = require('@defisaver/tokens');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    approve,
    balanceOf,
    depositToWeth,
    standardAmounts,
    nullAddress,
    UNISWAP_WRAPPER,
    AAVE_FL_FEE,
    WETH_ADDRESS,
} = require('../utils');

const { sell } = require('../actions');

const AAVE_NO_DEBT_MODE = 0;

describe('FL-AaveV2', function () {
    this.timeout(60000);

    let senderAcc; let proxy; let taskExecutorAddr; let
        aaveFl;

    const FLASHLOAN_TOKENS = ['WETH', 'DAI', 'USDC', 'WBTC', 'USDT', 'YFI', 'BAT', 'LINK', 'MKR'];

    before(async () => {
        taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

        aaveFl = await redeploy('FLAaveV2');
        await redeploy('SendToken');
        await redeploy('TaskExecutor');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < FLASHLOAN_TOKENS.length; ++i) {
        const tokenSymbol = FLASHLOAN_TOKENS[i];

        it(`... should get an ${tokenSymbol} AaveV2 flash loan`, async () => {
            const assetInfo = getAssetInfo(tokenSymbol);

            if (assetInfo.symbol === 'ETH') {
                assetInfo.address = WETH_ADDRESS;
            }

            const loanAmount = hre.ethers.utils.parseUnits(
                standardAmounts[tokenSymbol],
                assetInfo.decimals,
            );
            const feeAmount = (
                standardAmounts[tokenSymbol]
                * AAVE_FL_FEE
                * 10 ** assetInfo.decimals
            ).toFixed(0);

            await approve(assetInfo.address, proxy.address);

            const basicFLRecipe = new dfs.Recipe('BasicFLRecipe', [
                new dfs.actions.flashloan.AaveV2FlashLoanAction(
                    [loanAmount],
                    [assetInfo.address],
                    [AAVE_NO_DEBT_MODE],
                    nullAddress,
                    nullAddress,
                    [],
                ),
                new dfs.actions.basic.SendTokenAction(assetInfo.address, aaveFl.address, hre.ethers.constants.MaxUint256),
            ]);

            const functionData = basicFLRecipe.encodeForDsProxyCall();

            console.log(tokenSymbol);

            if (tokenSymbol === 'WETH') {
                await depositToWeth(feeAmount);
            } else {
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
            }

            await send(assetInfo.address, proxy.address, feeAmount);

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], {
                gasLimit: 3000000,
            });
        });
    }
});
