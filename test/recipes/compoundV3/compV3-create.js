const { assert } = require('chai');
const hre = require('hardhat');

const { getAssetInfo, assetAmountInEth, assetAmountInWei } = require('@defisaver/tokens');
const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    approve,
    formatExchangeObj,
    balanceOf,
    nullAddress,
    setNewExchangeWrapper,
    setBalance,
    fetchAmountinUSDPrice,
    resetForkToBlock,
} = require('../../utils/utils');

const { executeAction } = require('../../utils/actions');
const { COMP_V3_MARKETS } = require('../../utils/compoundV3');

const COMET_ADDR = COMP_V3_MARKETS[1].USDC;

describe('CompV3 Create test', function () {
    this.timeout(80000);

    let senderAcc;
    let proxy;
    let uniWrapper;
    let flActionAddr;

    before(async () => {
        // Keep this legacy USDC-market fixture before collateral offboarding.
        await resetForkToBlock(20000000);
        await redeploy('CompV3Supply');
        await redeploy('CompV3Borrow');
        await redeploy('RecipeExecutor');
        await redeploy('FLAction');
        await redeploy('SendToken');
        await redeploy('DFSSell');

        flActionAddr = await getAddrFromRegistry('FLAction');

        uniWrapper = await redeploy('UniswapWrapperV3');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
    });

    ['WETH', 'WBTC'].forEach((collAsset) => {
        const debtAsset = 'USDC';
        const baseAssetAddress = getAssetInfo(debtAsset).address;

        const fetchedAmount = fetchAmountinUSDPrice(collAsset, '2000');
        it(`...should supply ${fetchedAmount} ${collAsset} and borrow 500 ${debtAsset}`, async () => {
            const debtAmount = 500;
            const collAmount = assetAmountInWei(fetchedAmount, collAsset);
            const collAddress = getAssetInfo(collAsset).address;

            const collAmountParsed = hre.ethers.utils.parseUnits(collAmount, 1);
            await setBalance(collAddress, senderAcc.address, collAmountParsed);

            const collBalanceBefore = await balanceOf(collAddress, senderAcc.address);
            const debtBalanceBefore = await balanceOf(baseAssetAddress, senderAcc.address);
            const borrowBalanceBefore = await balanceOf(baseAssetAddress, senderAcc.address);

            await approve(collAddress, proxy.address);

            const recipe = new dfs.Recipe('CompoundV3 Supply & Borrow', [
                new dfs.actions.compoundV3.CompoundV3SupplyAction(
                    COMET_ADDR,
                    collAddress,
                    collAmount,
                    senderAcc.address,
                    nullAddress,
                ),
                new dfs.actions.compoundV3.CompoundV3BorrowAction(
                    COMET_ADDR,
                    assetAmountInWei(debtAmount, debtAsset),
                    senderAcc.address,
                    nullAddress,
                ),
            ]);

            const functionData = recipe.encodeForDsProxyCall();

            await executeAction('RecipeExecutor', functionData[1], proxy);

            const collBalanceAfter = await balanceOf(collAddress, senderAcc.address);
            const debtBalanceAfter = await balanceOf(baseAssetAddress, senderAcc.address);
            const borrowBalanceAfter = await balanceOf(baseAssetAddress, senderAcc.address);

            assert.closeTo(
                +assetAmountInEth(collBalanceBefore, collAsset) - fetchedAmount,
                +assetAmountInEth(collBalanceAfter, collAsset),
                0.005,
                'Coll asset balance',
            );
            assert.closeTo(
                +assetAmountInEth(debtBalanceBefore, debtAsset) + debtAmount,
                +assetAmountInEth(debtBalanceAfter, debtAsset),
                0.005,
                'Debt asset balance',
            );
            assert.closeTo(
                +assetAmountInEth(borrowBalanceBefore, debtAsset) + debtAmount,
                +assetAmountInEth(borrowBalanceAfter, debtAsset),
                0.005,
                'Borrow balance',
            );
        });
    });

    it('...should create a leveraged position of 2000$ in WETH/500 USDC using FLAction (Balancer)', async () => {
        const collAsset = 'WETH';
        const debtAsset = 'USDC';
        const fetchedAmount = fetchAmountinUSDPrice(collAsset, '2000');
        const debtAmount = 500;

        const collAmount = assetAmountInWei(fetchedAmount, collAsset);

        const collAddress = getAssetInfo(collAsset).address;

        const baseAssetAddress = getAssetInfo(debtAsset).address;

        await setBalance(
            collAddress,
            senderAcc.address,
            hre.ethers.utils.parseUnits(collAmount, 1),
        );

        const collBalanceBefore = await balanceOf(collAddress, senderAcc.address);
        const debtBalanceBefore = await balanceOf(baseAssetAddress, proxy.address);

        await approve(collAddress, proxy.address);

        const recipe = new dfs.Recipe('CompoundV3 Leveraged Create Using FL', [
            // Flashloan USDC
            new dfs.actions.flashloan.FLAction(
                new dfs.actions.flashloan.BalancerFlashLoanAction(
                    [baseAssetAddress],
                    [assetAmountInWei(debtAmount, debtAsset)],
                    nullAddress,
                    [],
                ),
            ),
            // Sell USDC for WETH
            new dfs.actions.basic.SellAction(
                formatExchangeObj(
                    baseAssetAddress,
                    collAddress,
                    assetAmountInWei(debtAmount, debtAsset),
                    uniWrapper.address,
                ),
                proxy.address,
                proxy.address,
            ),
            // Supply bought WETH to Compound
            new dfs.actions.compoundV3.CompoundV3SupplyAction(
                COMET_ADDR,
                collAddress,
                '$2',
                proxy.address,
                nullAddress,
            ),
            // Supply WETH from EOA wallet to Compound
            new dfs.actions.compoundV3.CompoundV3SupplyAction(
                COMET_ADDR,
                collAddress,
                collAmount,
                senderAcc.address,
                nullAddress,
            ),
            // Borrow USDC from Compound
            new dfs.actions.compoundV3.CompoundV3BorrowAction(
                COMET_ADDR,
                '$1',
                proxy.address,
                nullAddress,
            ),
            // Pay USDC flashloan back
            new dfs.actions.basic.SendTokenAction(baseAssetAddress, flActionAddr, '$1'),
        ]);

        const functionData = recipe.encodeForDsProxyCall();

        await executeAction('RecipeExecutor', functionData[1], proxy);

        const collBalanceAfter = await balanceOf(collAddress, senderAcc.address);
        const debtBalanceAfter = await balanceOf(baseAssetAddress, proxy.address);

        assert.closeTo(
            +assetAmountInEth(collBalanceBefore, collAsset) - fetchedAmount,
            +assetAmountInEth(collBalanceAfter, collAsset),
            0.005,
            'Coll asset balance',
        );
        assert.closeTo(
            +assetAmountInEth(debtBalanceBefore, debtAsset),
            +assetAmountInEth(debtBalanceAfter, debtAsset),
            0.005,
            'Debt asset balance',
        );
    });
});
