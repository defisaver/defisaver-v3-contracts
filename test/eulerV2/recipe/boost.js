const hre = require('hardhat');
const { expect } = require('chai');
const dfs = require('@defisaver/sdk');

const { getAssetInfo } = require('@defisaver/tokens');
const {
    takeSnapshot,
    revertToSnapshot,
    getProxy,
    redeploy,
    addrs,
    formatExchangeObj,
    getNetwork,
    getOwnerAddr, getAddrFromRegistry,
} = require('../../utils');
const { topUp } = require('../../../scripts/utils/fork');
const { getEulerV2TestPairs, eulerV2CreatePosition, getAccountRatio } = require('../utils');
const { executeAction } = require('../../actions');

const eulerV2BoostTest = async (testPairs) => {
    describe('EulerV2-Boost-Recipe', function () {
        this.timeout(100000);
        let isFork;
        const REGISTRY_ADDR = addrs[getNetwork()].REGISTRY_ADDR;

        let snapshot;
        let senderAcc;
        let proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            isFork = hre.network.name === 'fork';
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
            }
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await redeploy('EulerV2Supply', REGISTRY_ADDR, false, isFork);
            await redeploy('EulerV2Borrow', REGISTRY_ADDR, false, isFork);
        });
        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        for (let i = 0; i < testPairs.length; ++i) {
            const supplyVault = testPairs[i].supplyVault;
            const supplyTokenSymbol = testPairs[i].supplyTokenSymbol;
            const supplyTokenAsset = getAssetInfo(supplyTokenSymbol);
            const supplyToken = supplyTokenAsset.address;
            const supplyAmount = testPairs[i].supplyAmount;
            const borrowVault = testPairs[i].borrowVault;
            const borrowTokenSymbol = testPairs[i].borrowTokenSymbol;
            const borrowTokenAsset = getAssetInfo(borrowTokenSymbol);
            const borrowToken = borrowTokenAsset.address;
            const borrowAmount = testPairs[i].borrowAmount;

            it(`should execute boost for EulerV2 position: ${supplyTokenSymbol} / ${borrowTokenSymbol}`, async () => {
                const account = proxy.address;

                // 1. first create position
                await eulerV2CreatePosition(
                    supplyToken,
                    supplyVault,
                    supplyAmount,
                    borrowVault,
                    borrowAmount,
                    senderAcc,
                    proxy,
                );

                const ratioBefore = await getAccountRatio(account, borrowVault);

                // 2. Then execute boost
                const boostAmount = borrowAmount.div(10);
                const borrowAction = new dfs.actions.eulerV2.EulerV2BorrowAction(
                    borrowVault,
                    account,
                    proxy.address,
                    boostAmount,
                    true,
                );
                const sellAction = new dfs.actions.basic.SellAction(
                    formatExchangeObj(
                        borrowToken,
                        supplyToken,
                        '$1',
                        addrs[getNetwork()].UNISWAP_V3_WRAPPER,
                        0,
                        100,
                    ),
                    proxy.address,
                    proxy.address,
                );
                const supplyAction = new dfs.actions.eulerV2.EulerV2SupplyAction(
                    supplyVault,
                    supplyToken,
                    account,
                    proxy.address,
                    '$2',
                    false,
                );
                const boostRecipe = new dfs.Recipe('EulerV2Boost', [
                    borrowAction,
                    sellAction,
                    supplyAction,
                ]);
                const functionData = boostRecipe.encodeForDsProxyCall();
                await executeAction('RecipeExecutor', functionData[1], proxy);

                const ratioAfter = await getAccountRatio(account, borrowVault);

                expect(ratioAfter).to.be.lt(ratioBefore);
            });

            it(`should execute fl boost for EulerV2 position: ${supplyTokenSymbol} / ${borrowTokenSymbol}`, async () => {
                const account = proxy.address;
                const flAddress = await getAddrFromRegistry('FLAction');

                // 1. first create position
                await eulerV2CreatePosition(
                    supplyToken,
                    supplyVault,
                    supplyAmount,
                    borrowVault,
                    borrowAmount,
                    senderAcc,
                    proxy,
                );

                const ratioBefore = await getAccountRatio(account, borrowVault);

                // 2. Then execute flashloan boost
                const boostAmount = borrowAmount.div(10);
                const flashLoanAction = new dfs.actions.flashloan.FLAction(
                    new dfs.actions.flashloan.BalancerFlashLoanAction(
                        [borrowToken],
                        [boostAmount],
                    ),
                );
                const sellAction = new dfs.actions.basic.SellAction(
                    formatExchangeObj(
                        borrowToken,
                        supplyToken,
                        boostAmount,
                        addrs[getNetwork()].UNISWAP_V3_WRAPPER,
                        0,
                        100,
                    ),
                    proxy.address,
                    proxy.address,
                );
                const supplyAction = new dfs.actions.eulerV2.EulerV2SupplyAction(
                    supplyVault,
                    supplyToken,
                    account,
                    proxy.address,
                    '$2',
                    false,
                );
                const borrowAction = new dfs.actions.eulerV2.EulerV2BorrowAction(
                    borrowVault,
                    account,
                    flAddress,
                    boostAmount,
                );

                const flbBoostRecipe = new dfs.Recipe('EulerV2Boost', [
                    flashLoanAction,
                    sellAction,
                    supplyAction,
                    borrowAction,
                ]);
                const functionData = flbBoostRecipe.encodeForDsProxyCall();
                await executeAction('RecipeExecutor', functionData[1], proxy);

                const ratioAfter = await getAccountRatio(account, borrowVault);

                expect(ratioAfter).to.be.lt(ratioBefore);
            });
        }
    });
};

describe('EulerV2-Boost-Recipe', function () {
    this.timeout(80000);

    it('...test EulerV2 boost', async () => {
        const supplyAmountInUsd = '50000';
        const borrowAmountInUsd = '25000';
        const testPairs = await getEulerV2TestPairs(supplyAmountInUsd, borrowAmountInUsd);
        await eulerV2BoostTest(testPairs);
    }).timeout(50000);
});
