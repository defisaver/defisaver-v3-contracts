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

const eulerV2RepayTest = async (testPairs) => {
    describe('EulerV2-Repay-Recipe', function () {
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
            await redeploy('EulerV2Withdraw', REGISTRY_ADDR, false, isFork);
            await redeploy('EulerV2Payback', REGISTRY_ADDR, false, isFork);
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

            it(`should execute repay for EulerV2 position: ${supplyTokenSymbol} / ${borrowTokenSymbol}`, async () => {
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

                // 2. Then execute repay
                const repayAmount = supplyAmount.div(10);
                const eulerV2WithdrawAction = new dfs.actions.eulerV2.EulerV2WithdrawAction(
                    supplyVault,
                    account,
                    proxy.address,
                    repayAmount,
                );
                const sellAction = new dfs.actions.basic.SellAction(
                    formatExchangeObj(
                        supplyToken,
                        borrowToken,
                        '$1',
                        addrs[getNetwork()].UNISWAP_V3_WRAPPER,
                        0,
                        100,
                    ),
                    proxy.address,
                    proxy.address,
                );
                const eulerV2PaybackAction = new dfs.actions.eulerV2.EulerV2PaybackAction(
                    borrowVault,
                    borrowToken,
                    account,
                    proxy.address,
                    '$2',
                );
                const repayRecipe = new dfs.Recipe('EulerV2Repay', [
                    eulerV2WithdrawAction,
                    sellAction,
                    eulerV2PaybackAction,
                ]);
                const functionData = repayRecipe.encodeForDsProxyCall();
                await executeAction('RecipeExecutor', functionData[1], proxy);

                const ratioAfter = await getAccountRatio(account, borrowVault);

                expect(ratioAfter).to.be.gt(ratioBefore);
            });

            it(`should execute fl repay for EulerV2 position: ${supplyTokenSymbol} / ${borrowTokenSymbol}`, async () => {
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

                // 2. Then execute flashloan repay
                const repayAmount = supplyAmount.div(10);
                const flashLoanAction = new dfs.actions.flashloan.FLAction(
                    new dfs.actions.flashloan.BalancerFlashLoanAction(
                        [supplyToken],
                        [repayAmount],
                    ),
                );
                const sellAction = new dfs.actions.basic.SellAction(
                    formatExchangeObj(
                        supplyToken,
                        borrowToken,
                        repayAmount,
                        addrs[getNetwork()].UNISWAP_V3_WRAPPER,
                        0,
                        100,
                    ),
                    proxy.address,
                    proxy.address,
                );
                const eulerV2PaybackAction = new dfs.actions.eulerV2.EulerV2PaybackAction(
                    borrowVault,
                    borrowToken,
                    account,
                    proxy.address,
                    '$2',
                );
                const eulerV2WithdrawAction = new dfs.actions.eulerV2.EulerV2WithdrawAction(
                    supplyVault,
                    account,
                    flAddress,
                    repayAmount,
                );
                const flRepayRecipe = new dfs.Recipe('EulerV2Repay', [
                    flashLoanAction,
                    sellAction,
                    eulerV2PaybackAction,
                    eulerV2WithdrawAction,
                ]);
                const functionData = flRepayRecipe.encodeForDsProxyCall();
                await executeAction('RecipeExecutor', functionData[1], proxy);

                const ratioAfter = await getAccountRatio(account, borrowVault);

                expect(ratioAfter).to.be.gt(ratioBefore);
            });
        }
    });
};

describe('EulerV2-Repay-Recipe', function () {
    this.timeout(80000);

    it('...test EulerV2 repay', async () => {
        const supplyAmountInUsd = '50000';
        const borrowAmountInUsd = '25000';
        const testPairs = await getEulerV2TestPairs(supplyAmountInUsd, borrowAmountInUsd);
        await eulerV2RepayTest(testPairs);
    }).timeout(50000);
});
