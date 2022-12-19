/* eslint-disable no-use-before-define */
/* eslint-disable spaced-comment */
const { expect } = require('chai');
const hre = require('hardhat');
const ethers = require('ethers');
const { getAssetInfo, assetAmountInWei } = require('@defisaver/tokens');
const dfs = require('@defisaver/sdk');
const { supplyCompV3, borrowCompV3, executeAction } = require('../../actions');

const {
    getProxy,
    redeploy,
    formatExchangeObj,
    setNewExchangeWrapper,
    fetchAmountinUSDPrice,
    UNISWAP_WRAPPER,
    nullAddress,
    approve,
    getAddrFromRegistry,
    setBalance,
} = require('../../utils');

const cometABI = [
    'function collateralBalanceOf(address account, address asset) external view returns (uint128)',
    'function borrowBalanceOf(address account) public view returns (uint256)',
];
const cometAddress = '0xc3d688B66703497DAA19211EEdff47f25384cdc3';

describe('CompoundV3 Boost recipe test', function () {
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

    ['WETH', 'WBTC'].forEach((ilk) => {
        const tokenData = getAssetInfo(ilk);
        const boostAmount = 10;

        it(`... should call a boost ${boostAmount} ${ilk}`, async () => {
            const comet = new ethers.Contract(cometAddress, cometABI, senderAcc);
            const assetInfo = getAssetInfo('USDC');

            const colAmount = hre.ethers.utils.parseUnits(
                fetchAmountinUSDPrice(tokenData.symbol, '10000'),
                tokenData.decimals,
            );

            // Supply action
            await supplyCompV3(
                proxy,
                tokenData.address,
                colAmount,
                senderAcc.address,
            );

            const borrowingAmount = hre.ethers.utils.parseUnits(
                fetchAmountinUSDPrice('USDC', '2000'),
                assetInfo.decimals,
            );

            await borrowCompV3(proxy, borrowingAmount, senderAcc.address);

            // Get ratio before
            const colBefore = await comet.collateralBalanceOf(proxy.address, tokenData.address);
            const debtBefore = await comet.borrowBalanceOf(proxy.address);
            const ratioBefore = colBefore / debtBefore;

            const from = proxy.address;
            const to = proxy.address;
            const collToken = tokenData.address;
            const fromToken = getAssetInfo('USDC').address;
            
            // Borrow more asset

            const compV3BorrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
                boostAmount,
                to,
            );

            // Buy collateral

            const sellAction = new dfs.actions.basic.SellAction(
                formatExchangeObj(
                    fromToken,
                    collToken,
                    assetAmountInWei(boostAmount, 'USDC'),
                    uniWrapper.address,
                ),
                from,
                to,
            );

            // Supply newly bought collateral

            const supplyCompV3Action = new dfs.actions.compoundV3.CompoundV3SupplyAction(
                collToken,
                '$2',
                proxy.address,
            );

            const boostRecipe = new dfs.Recipe('BoostRecipe', [
                compV3BorrowAction,
                sellAction,
                supplyCompV3Action,
            ]);
            
            const functionData = boostRecipe.encodeForDsProxyCall();

            await executeAction('RecipeExecutor', functionData[1], proxy);

            // Get ratio after
            const colAfter = await comet.collateralBalanceOf(proxy.address, tokenData.address);
            const debtAfter = await comet.borrowBalanceOf(proxy.address);
            const ratioAfter = colAfter / debtAfter;

            expect(colBefore).to.be.lt(colAfter);
            expect(debtBefore).to.be.lt(debtAfter);
            expect(ratioBefore).to.be.lt(ratioAfter);
        });

        it(`... should call a FL boost ${boostAmount} ${tokenData.symbol}`, async () => {
            const comet = new ethers.Contract(cometAddress, cometABI, senderAcc);
            const assetInfo = getAssetInfo('USDC');
            const colAmount = hre.ethers.utils.parseUnits(
                fetchAmountinUSDPrice(tokenData.symbol, '10000'),
                tokenData.decimals,
            );

            // Supply action
            await supplyCompV3(
                proxy,
                tokenData.address,
                colAmount,
                senderAcc.address,
            );

            const borrowingAmount = hre.ethers.utils.parseUnits(
                fetchAmountinUSDPrice('USDC', '2000'),
                assetInfo.decimals,
            );

            await borrowCompV3(proxy, borrowingAmount, senderAcc.address);


            // Get ratio before
            const colBefore = await comet.collateralBalanceOf(proxy.address, tokenData.address);
            const debtBefore = await comet.borrowBalanceOf(proxy.address);
            const ratioBefore = colBefore / debtBefore;

            const collToken = tokenData.address;
            const fromToken = getAssetInfo('USDC').address;

            const exchangeOrder = formatExchangeObj(
                fromToken,
                collToken,
                assetAmountInWei(boostAmount, 'USDC'),
                UNISWAP_WRAPPER,
            );

            const flAaveV2Action = new dfs.actions.flashloan.AaveV2FlashLoanAction(
                [fromToken],
                assetAmountInWei(boostAmount, 'USDC'),
                [0],
                nullAddress,
                nullAddress,
                [],
            );

            const boostRecipe = new dfs.Recipe('FLBoostRecipe', [
                flAaveV2Action,
                new dfs.actions.basic.SellAction(exchangeOrder, proxy.address, proxy.address),
                new dfs.actions.compoundV3.CompoundV3SupplyAction(
                    collToken,
                    '$2',
                    proxy.address,
                ),
                new dfs.actions.compoundV3.CompoundV3BorrowAction(
                    '$1',
                    aaveV2FlAddr,
                ),
            ]);
            
            const functionData = boostRecipe.encodeForDsProxyCall();

            await executeAction('RecipeExecutor', functionData[1], proxy);

            // Get ratio after
            const colAfter = await comet.collateralBalanceOf(proxy.address, tokenData.address);
            const debtAfter = await comet.borrowBalanceOf(proxy.address);
            const ratioAfter = colAfter / debtAfter;

            expect(colBefore).to.be.gt(colAfter);
            expect(debtBefore).to.be.gt(debtAfter);
            expect(ratioAfter).to.be.gt(ratioBefore);
        });
    });
});
