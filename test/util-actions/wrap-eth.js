const { getAssetInfo } = require("@defisaver/tokens");
const dfs =  require("@defisaver/sdk");

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    standardAmounts,
    nullAddress,
    MAX_UINT,
    WETH_ADDRESS,
} = require("../utils");

describe("WrapEth", function () {
    this.timeout(60000);

    let senderAcc, proxy, taskExecutorAddr, dydxFl;

    before(async () => {
        taskExecutorAddr = await getAddrFromRegistry("TaskExecutor");

        dydxFl = await redeploy("FLDyDx");
        await redeploy("SendToken");
        await redeploy("TaskExecutor");

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it(`... should wrap Eth -> Weth on proxy`, async () => {
        const assetInfo = getAssetInfo(tokenSymbol);

        if (assetInfo.symbol === 'ETH') {
            assetInfo.address = WETH_ADDRESS;
        }

        const loanAmount = ethers.utils.parseUnits(standardAmounts[tokenSymbol], assetInfo.decimals);
        
        const basicFLRecipe = new dfs.Recipe("BasicFLRecipe", [
            new dfs.actions.flashloan.DyDxFlashLoanAction(
                loanAmount,
                assetInfo.address,
                nullAddress,
                []
            ),
            new dfs.actions.basic.SendTokenAction(assetInfo.address, dydxFl.address, MAX_UINT),
        ]);

        const functionData = basicFLRecipe.encodeForDsProxyCall();

        await proxy["execute(address,bytes)"](taskExecutorAddr, functionData[1], {
            gasLimit: 3000000,
        });
    });
});
