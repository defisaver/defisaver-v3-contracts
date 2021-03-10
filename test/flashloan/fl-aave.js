const { getAssetInfo } = require("@defisaver/tokens");
const dfs =  require("@defisaver/sdk");

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    balanceOf,
    standardAmounts,
    nullAddress,
    MAX_UINT,
    ETH_ADDR,
    UNISWAP_WRAPPER,
    AAVE_FL_FEE,
} = require("../utils");

const { sell } = require("../actions");

describe("FL-Aave", function () {
    this.timeout(60000);

    let senderAcc, proxy, taskExecutorAddr, aaveFl;

    const FLASHLOAN_TOKENS = ["ETH", "DAI", "USDC", "WBTC", "USDT", "YFI", "BAT", "LINK", "MKR"];

    before(async () => {
        taskExecutorAddr = await getAddrFromRegistry("TaskExecutor");

        aaveFl = await redeploy("FLAave");
        await redeploy("SendToken");
        await redeploy("TaskExecutor");
        
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < FLASHLOAN_TOKENS.length; ++i) {
        const tokenSymbol = FLASHLOAN_TOKENS[i];

        it(`... should get an ${tokenSymbol} Aave flash loan`, async () => {
            const assetInfo = getAssetInfo(tokenSymbol);

            const loanAmount = ethers.utils.parseUnits(standardAmounts[tokenSymbol], assetInfo.decimals);
            const feeAmount = ((standardAmounts[tokenSymbol] * AAVE_FL_FEE) * 10**assetInfo.decimals).toFixed(0);
           
            const basicFLRecipe = new dfs.Recipe("BasicFLRecipe", [
                new dfs.actions.flashloan.AaveFlashLoanAction(
                    loanAmount,
                    assetInfo.address,
                    nullAddress,
                    []
                ),
                new dfs.actions.basic.SendTokenAction(assetInfo.address, aaveFl.address, MAX_UINT),
            ]);

            const functionData = basicFLRecipe.encodeForDsProxyCall();

            let value = 0;

            if (tokenSymbol === "ETH") {
                value = feeAmount;
            } else {
                // buy token so we have it for fee
                const tokenBalance = await balanceOf(assetInfo.address, senderAcc.address);

                if (tokenBalance.lt(feeAmount)) {
                    await sell(
                        proxy,
                        ETH_ADDR,
                        assetInfo.address,
                        ethers.utils.parseUnits("1", 18),
                        UNISWAP_WRAPPER,
                        senderAcc.address,
                        senderAcc.address
                    );
                }

                await send(assetInfo.address, proxy.address, feeAmount);
            }

            await proxy["execute(address,bytes)"](taskExecutorAddr, functionData[1], {
                value,
                gasLimit: 3000000,
            });
        });
    }
});
