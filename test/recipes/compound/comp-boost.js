const { assert } = require('chai');
const hre = require('hardhat');

const {
    getAssetInfo, assetAmountInEth, assetAmountInWei,
} = require('@defisaver/tokens');
const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    approve,
    formatExchangeObj,
    balanceOf,
    nullAddress,
    depositToWeth,
    setNewExchangeWrapper,
} = require('../../utils');

const {
    supplyComp,
} = require('../../actions.js');

const {
    getBorrowBalance,
    getSupplyBalance,
} = require('../../utils-comp');

describe('Compound: Boost', function () {
    this.timeout(80000);

    let senderAcc;
    let proxy;
    let uniWrapper;
    let taskExecutorAddr;
    let compView;
    let dydxFlAddr;
    let aaveV2FlAddr;

    before(async () => {
        await redeploy('CompSupply');
        await redeploy('CompBorrow');
        await redeploy('TaskExecutor');
        await redeploy('DFSSell');
        await redeploy('FLDyDx');
        await redeploy('FLAaveV2');

        compView = await redeploy('CompView');
        dydxFlAddr = await getAddrFromRegistry('FLDyDx');
        aaveV2FlAddr = await getAddrFromRegistry('FLAaveV2');

        uniWrapper = await redeploy('UniswapWrapperV3');
        taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);

        const supplyBalance = await getSupplyBalance(compView, proxy.address, getAssetInfo('cETH').address);
        if (supplyBalance.lt(assetAmountInWei('5', 'ETH'))) {
            console.log('Supplying 5 ETH');
            const initialCollAmount = assetAmountInWei('5', 'ETH');
            await approve(getAssetInfo('WETH').address, proxy.address);
            await depositToWeth(initialCollAmount);
            await supplyComp(proxy, getAssetInfo('cETH').address, getAssetInfo('WETH').address, initialCollAmount, senderAcc.address);
        }
    });

    ['ETH', 'WBTC', 'USDC'].forEach((collAsset) => {
        ['DAI', 'BAT', 'USDT'].forEach((debtAsset) => {
            it(`...should Boost 100 ${debtAsset} for ${collAsset} coll`, async () => {
                const debtAmount = 100;
                const collAddress = getAssetInfo(collAsset.replace(/^ETH/, 'WETH')).address;

                const collBalanceBefore = await balanceOf(collAddress, senderAcc.address);
                const debtBalanceBefore = await balanceOf(
                    getAssetInfo(debtAsset).address,
                    senderAcc.address,
                );
                const borrowBalanceBefore = await getBorrowBalance(compView, proxy.address, getAssetInfo(`c${debtAsset}`).address);
                const supplyBalanceBefore = await getSupplyBalance(compView, proxy.address, getAssetInfo(`c${collAsset}`).address);

                const recipe = new dfs.Recipe('Compound Boost', [
                    new dfs.actions.compound.CompoundBorrowAction(
                        getAssetInfo(`c${debtAsset}`).address,
                        assetAmountInWei(debtAmount, debtAsset),
                        proxy.address,
                    ),
                    new dfs.actions.basic.SellAction(
                        formatExchangeObj(
                            getAssetInfo(debtAsset).address,
                            collAddress,
                            assetAmountInWei(debtAmount, debtAsset),
                            uniWrapper.address,
                        ),
                        proxy.address,
                        proxy.address,
                    ),
                    new dfs.actions.compound.CompoundSupplyAction(
                        getAssetInfo(`c${collAsset}`).address,
                        '$2',
                        proxy.address,
                        true,
                    ),
                ]);

                const functionData = recipe.encodeForDsProxyCall();

                await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000 });

                const collBalanceAfter = await balanceOf(collAddress, senderAcc.address);
                const debtBalanceAfter = await balanceOf(
                    getAssetInfo(debtAsset).address,
                    senderAcc.address,
                );
                const borrowBalanceAfter = await getBorrowBalance(compView, proxy.address, getAssetInfo(`c${debtAsset}`).address);
                const supplyBalanceAfter = await getSupplyBalance(compView, proxy.address, getAssetInfo(`c${collAsset}`).address);

                assert.equal(+assetAmountInEth(collBalanceBefore, collAsset), +assetAmountInEth(collBalanceAfter, collAsset), 'Coll asset balance');
                assert.equal(+assetAmountInEth(debtBalanceBefore, debtAsset), +assetAmountInEth(debtBalanceAfter, debtAsset), 'Debt asset balance');
                assert.isBelow(+assetAmountInEth(supplyBalanceBefore, collAsset), +assetAmountInEth(supplyBalanceAfter, collAsset), 'Supply balance');
                assert.isBelow(+assetAmountInEth(borrowBalanceBefore, debtAsset), +assetAmountInEth(borrowBalanceAfter, debtAsset), 'Borrow balance');
                const collDelta = assetAmountInEth(supplyBalanceAfter, collAsset)
                    - assetAmountInEth(supplyBalanceBefore, collAsset);
                const debtDelta = assetAmountInEth(borrowBalanceAfter, debtAsset)
                    - assetAmountInEth(borrowBalanceBefore, debtAsset);
                console.log(`Supplied ${collDelta} ${collAsset} and created ${debtDelta} ${debtAsset} debt`);
            });
        });
    });

    it('...Boost 500 DAI for ETH using dYdX FL', async () => {
        const collAsset = 'ETH';
        const debtAsset = 'DAI';
        const debtAmount = 500;
        const collAddress = getAssetInfo(collAsset.replace(/^ETH/, 'WETH')).address;

        const collBalanceBefore = await balanceOf(collAddress, senderAcc.address);
        const debtBalanceBefore = await balanceOf(
            getAssetInfo(debtAsset).address,
            senderAcc.address,
        );
        const borrowBalanceBefore = await getBorrowBalance(compView, proxy.address, getAssetInfo(`c${debtAsset}`).address);
        const supplyBalanceBefore = await getSupplyBalance(compView, proxy.address, getAssetInfo(`c${collAsset}`).address);

        const recipe = new dfs.Recipe('Compound FL Boost', [
            // Flashloan DAI
            new dfs.actions.flashloan.DyDxFlashLoanAction(
                assetAmountInWei(debtAmount, debtAsset),
                getAssetInfo(debtAsset).address,
                nullAddress,
                [],
            ),
            // Sell DAI for ETH
            new dfs.actions.basic.SellAction(
                formatExchangeObj(
                    getAssetInfo(debtAsset).address,
                    collAddress,
                    assetAmountInWei(debtAmount, debtAsset),
                    uniWrapper.address,
                ),
                proxy.address,
                proxy.address,
            ),
            // Supply bought ETH to Compound
            new dfs.actions.compound.CompoundSupplyAction(
                getAssetInfo(`c${collAsset}`).address,
                '$2',
                proxy.address,
                false,
            ),
            // Borrow DAI from Compound
            new dfs.actions.compound.CompoundBorrowAction(
                getAssetInfo(`c${debtAsset}`).address,
                assetAmountInWei(debtAmount, debtAsset),
                proxy.address,
            ),
            // Pay DAI flashloan back
            new dfs.actions.basic.SendTokenAction(
                getAssetInfo(debtAsset).address,
                dydxFlAddr,
                '$1',
            ),
        ]);

        const functionData = recipe.encodeForDsProxyCall();

        await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000 });

        const collBalanceAfter = await balanceOf(collAddress, senderAcc.address);
        const debtBalanceAfter = await balanceOf(
            getAssetInfo(debtAsset).address,
            senderAcc.address,
        );
        const borrowBalanceAfter = await getBorrowBalance(compView, proxy.address, getAssetInfo(`c${debtAsset}`).address);
        const supplyBalanceAfter = await getSupplyBalance(compView, proxy.address, getAssetInfo(`c${collAsset}`).address);

        assert.equal(+assetAmountInEth(collBalanceBefore, collAsset), +assetAmountInEth(collBalanceAfter, collAsset), 'Coll asset balance');
        assert.equal(+assetAmountInEth(debtBalanceBefore, debtAsset), +assetAmountInEth(debtBalanceAfter, debtAsset), 'Debt asset balance');
        assert.isBelow(+assetAmountInEth(supplyBalanceBefore, collAsset), +assetAmountInEth(supplyBalanceAfter, collAsset), 'Supply balance');
        assert.isBelow(+assetAmountInEth(borrowBalanceBefore, debtAsset), +assetAmountInEth(borrowBalanceAfter, debtAsset), 'Borrow balance');
        const collDelta = assetAmountInEth(supplyBalanceAfter, collAsset)
            - assetAmountInEth(supplyBalanceBefore, collAsset);
        const debtDelta = assetAmountInEth(borrowBalanceAfter, debtAsset)
            - assetAmountInEth(borrowBalanceBefore, debtAsset);
        console.log(`Supplied ${collDelta} ${collAsset} and created ${debtDelta} ${debtAsset} debt`);
    });

    it('...Boost 500 BAT for ETH using Aave FL', async () => {
        const collAsset = 'ETH';
        const debtAsset = 'BAT';
        const debtAmount = 500;
        const collAddress = getAssetInfo(collAsset.replace(/^ETH/, 'WETH')).address;

        const collBalanceBefore = await balanceOf(collAddress, senderAcc.address);
        const debtBalanceBefore = await balanceOf(
            getAssetInfo(debtAsset).address,
            senderAcc.address,
        );
        const borrowBalanceBefore = await getBorrowBalance(compView, proxy.address, getAssetInfo(`c${debtAsset}`).address);
        const supplyBalanceBefore = await getSupplyBalance(compView, proxy.address, getAssetInfo(`c${collAsset}`).address);
        const recipe = new dfs.Recipe('Compound FL Boost', [
            // Flashloan BAT
            new dfs.actions.flashloan.AaveV2FlashLoanAction(
                [assetAmountInWei(debtAmount, debtAsset)],
                [getAssetInfo(debtAsset).address],
                [0],
                nullAddress,
                nullAddress,
                [],
            ),
            // Sell BAT for ETH
            new dfs.actions.basic.SellAction(
                formatExchangeObj(
                    getAssetInfo(debtAsset).address,
                    collAddress,
                    assetAmountInWei(debtAmount, debtAsset),
                    uniWrapper.address,
                ),
                proxy.address,
                proxy.address,
            ),
            // Supply bought ETH to Compound
            new dfs.actions.compound.CompoundSupplyAction(
                getAssetInfo(`c${collAsset}`).address,
                '$2',
                proxy.address,
                false,
            ),
            // Borrow BAT from Compound
            new dfs.actions.compound.CompoundBorrowAction(
                getAssetInfo(`c${debtAsset}`).address,
                '$1',
                aaveV2FlAddr,
            ),
        ]);

        const functionData = recipe.encodeForDsProxyCall();

        await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000 });

        const collBalanceAfter = await balanceOf(collAddress, senderAcc.address);
        const debtBalanceAfter = await balanceOf(
            getAssetInfo(debtAsset).address,
            senderAcc.address,
        );
        const borrowBalanceAfter = await getBorrowBalance(compView, proxy.address, getAssetInfo(`c${debtAsset}`).address);
        const supplyBalanceAfter = await getSupplyBalance(compView, proxy.address, getAssetInfo(`c${collAsset}`).address);

        assert.equal(+assetAmountInEth(collBalanceBefore, collAsset), +assetAmountInEth(collBalanceAfter, collAsset), 'Coll asset balance');
        assert.equal(+assetAmountInEth(debtBalanceBefore, debtAsset), +assetAmountInEth(debtBalanceAfter, debtAsset), 'Debt asset balance');
        assert.isBelow(+assetAmountInEth(supplyBalanceBefore, collAsset), +assetAmountInEth(supplyBalanceAfter, collAsset), 'Supply balance');
        assert.isBelow(+assetAmountInEth(borrowBalanceBefore, debtAsset), +assetAmountInEth(borrowBalanceAfter, debtAsset), 'Borrow balance');
        const collDelta = assetAmountInEth(supplyBalanceAfter, collAsset)
            - assetAmountInEth(supplyBalanceBefore, collAsset);
        const debtDelta = assetAmountInEth(borrowBalanceAfter, debtAsset)
            - assetAmountInEth(borrowBalanceBefore, debtAsset);
        console.log(`Supplied ${collDelta} ${collAsset} and created ${debtDelta} ${debtAsset} debt`);
    });
});
