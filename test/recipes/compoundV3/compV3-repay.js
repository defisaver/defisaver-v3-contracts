const { expect } = require('chai');
const hre = require('hardhat');
const ethers = require('ethers');
const { getAssetInfo, ilks } = require('@defisaver/tokens');
const dfs = require('@defisaver/sdk');
const { supplyCompV3, borrowCompV3, executeAction } = require('../../actions');

const {
    getProxy,
    redeploy,
    formatExchangeObj,
    setNewExchangeWrapper,
    WETH_ADDRESS,
    balanceOf,
    fetchAmountinUSDPrice,
    UNISWAP_WRAPPER,
    nullAddress,
    getAddrFromRegistry,
} = require('../../utils');

// Will work when Payback works
describe('CompoundV3 Repay recipe test', function () {
    this.timeout(80000);

    let uniWrapper;
    let senderAcc;
    let proxy;
    let aaveV2FlAddr;

    before(async () => {
        uniWrapper = await redeploy('UniswapWrapperV3');
        await redeploy('CompV3Supply');
        await redeploy('CompV3Withdraw');
        await redeploy('DFSSell');
        await redeploy('CompV3Payback');
        await redeploy('CompV3Borrow');

        aaveV2FlAddr = await getAddrFromRegistry('FLAaveV2');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
    });

    const ilkData = ilks[0];
    const tokenData = getAssetInfo(ilkData.asset);
    let repayAmount = fetchAmountinUSDPrice(tokenData.symbol, '100');

    it(`... should call a repay ${repayAmount} ETH`, async () => {
        const assetInfo = getAssetInfo('USDC');

        // Supply action
        await supplyCompV3(proxy, WETH_ADDRESS, ethers.utils.parseEther('10'), senderAcc.address);

        const borrowingAmount = hre.ethers.utils.parseUnits(
            fetchAmountinUSDPrice('USDC', '2000'),
            assetInfo.decimals,
        );

        await borrowCompV3(proxy, borrowingAmount, proxy.address);
        repayAmount = hre.ethers.utils.parseUnits(repayAmount, 18);

        // Get ratio before
        const balanceBefore = await balanceOf(assetInfo.address, proxy.address);

        const from = proxy.address;
        const to = proxy.address;
        const collToken = WETH_ADDRESS;
        const fromToken = getAssetInfo('USDC').address;

        // Withdraw col

        const compV3WithdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
            to,
            WETH_ADDRESS,
            repayAmount,
        );

        // Sell col

        const sellAction = new dfs.actions.basic.SellAction(
            formatExchangeObj(collToken, fromToken, '$1', UNISWAP_WRAPPER),
            from,
            to,
        );

        // Payback

        const paybackCompV3Action = new dfs.actions.compoundV3.CompoundV3PaybackAction(
            '$2',
            from,
            from,
        );

        const repayRecipe = new dfs.Recipe('RepayRecipe', [
            compV3WithdrawAction,
            sellAction,
            paybackCompV3Action,
        ]);

        const functionData = repayRecipe.encodeForDsProxyCall();

        await executeAction('RecipeExecutor', functionData[1], proxy);

        // Get ratio after
        const balanceAfter = await balanceOf(assetInfo.address, proxy.address);

        expect(balanceBefore).to.be.gt(balanceAfter);
    });

    it(`... should call a FL repay ${repayAmount} ${tokenData.symbol}`, async () => {
        const assetInfo = getAssetInfo('USDC');

        // Supply action
        await supplyCompV3(proxy, WETH_ADDRESS, ethers.utils.parseEther('10'), senderAcc.address);

        const borrowingAmount = hre.ethers.utils.parseUnits(
            fetchAmountinUSDPrice('USDC', '2000'),
            assetInfo.decimals,
        );

        await borrowCompV3(proxy, borrowingAmount, proxy.address);
        const flAmount = hre.ethers.utils.parseUnits('0.2', 18);

        // Get ratio before
        const balanceBefore = await balanceOf(assetInfo.address, proxy.address);

        const from = proxy.address;
        const to = proxy.address;
        const collToken = WETH_ADDRESS;
        const fromToken = getAssetInfo('USDC').address;

        const exchangeOrder = formatExchangeObj(collToken, fromToken, flAmount, UNISWAP_WRAPPER);

        const flAaveV2Action = new dfs.actions.flashloan.AaveV2FlashLoanAction(
            [flAmount],
            [collToken],
            [0],
            nullAddress,
            nullAddress,
            [],
        );

        const repayRecipe = new dfs.Recipe('FLRepayRecipe', [
            flAaveV2Action, // new dydxFLAction(flAmount, collToken, nullAddress, []),
            new dfs.actions.basic.SellAction(exchangeOrder, proxy.address, proxy.address),
            new dfs.actions.compoundV3.CompoundV3PaybackAction('$2', from, to),
            new dfs.actions.compoundV3.CompoundV3WithdrawAction(
                aaveV2FlAddr, WETH_ADDRESS, '$1',
            ),
        ]);

        const functionData = repayRecipe.encodeForDsProxyCall();

        await executeAction('RecipeExecutor', functionData[1], proxy);

        // Get ratio after
        const balanceAfter = await balanceOf(assetInfo.address, proxy.address);

        expect(balanceBefore).to.be.gt(balanceAfter);
    });
});
