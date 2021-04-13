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
    isEth,
    nullAddress,
    standardAmounts,
    WETH_ADDRESS,
    depositToWeth,
    setNewExchangeWrapper,
} = require('../../utils');

const {
    sell,
} = require('../../actions.js');

const {
    getBorrowBalance,
    getSupplyBalance,
} = require('../../utils-comp');

describe('Compound: Create', function () {
    this.timeout(80000);

    let senderAcc;
    let proxy;
    let uniWrapper;
    let taskExecutorAddr;
    let compView;
    let dydxFlAddr;

    before(async () => {
        await redeploy('CompSupply');
        await redeploy('CompBorrow');
        await redeploy('TaskExecutor');
        await redeploy('FLDyDx');
        await redeploy('DFSSell');

        compView = await redeploy('CompView');
        dydxFlAddr = await getAddrFromRegistry('FLDyDx');

        uniWrapper = await redeploy('UniswapWrapperV3');
        taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
    });

    ['ETH', 'WBTC', 'USDC'].forEach((collAsset) => {
        ['DAI', 'BAT', 'USDT'].forEach((debtAsset) => {
            it(`...should supply ${standardAmounts[collAsset]} ${collAsset} and borrow 500 ${debtAsset}`, async () => {
                const debtAmount = 500;
                const collAmount = assetAmountInWei(standardAmounts[collAsset], collAsset);
                const collAddress = getAssetInfo(collAsset.replace(/^ETH/, 'WETH')).address;
                let collBalanceBefore = await balanceOf(collAddress, senderAcc.address);

                if (collBalanceBefore.lt(collAmount)) {
                    if (isEth(collAddress)) {
                        await depositToWeth(collAmount);
                        // eslint-disable-next-line max-len
                        // const wethBalance = await balanceOf(getAssetInfo('WETH').address, senderAcc.address);
                    } else {
                        await sell(
                            proxy,
                            WETH_ADDRESS,
                            collAddress,
                            assetAmountInWei(5, 'ETH'),
                            uniWrapper.address,
                            senderAcc.address,
                            senderAcc.address,
                        );
                    }
                }

                collBalanceBefore = await balanceOf(collAddress, senderAcc.address);
                const debtBalanceBefore = await balanceOf(
                    getAssetInfo(debtAsset).address,
                    senderAcc.address,
                );
                const borrowBalanceBefore = await getBorrowBalance(compView, proxy.address, getAssetInfo(`c${debtAsset}`).address);

                await approve(collAddress, proxy.address);

                const recipe = new dfs.Recipe('Compound Supply & Borrow', [
                    new dfs.actions.compound.CompoundSupplyAction(
                        getAssetInfo(`c${collAsset}`).address,
                        collAmount,
                        senderAcc.address,
                        true,
                    ),
                    new dfs.actions.compound.CompoundBorrowAction(
                        getAssetInfo(`c${debtAsset}`).address,
                        assetAmountInWei(debtAmount, debtAsset),
                        senderAcc.address,
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

                assert.closeTo(+assetAmountInEth(collBalanceBefore, collAsset) - standardAmounts[collAsset], +assetAmountInEth(collBalanceAfter, collAsset), 0.005, 'Coll asset balance');
                assert.closeTo(+assetAmountInEth(debtBalanceBefore, debtAsset) + debtAmount, +assetAmountInEth(debtBalanceAfter, debtAsset), 0.005, 'Debt asset balance');
                assert.closeTo(+assetAmountInEth(borrowBalanceBefore, debtAsset) + debtAmount, +assetAmountInEth(borrowBalanceAfter, debtAsset), 0.005, 'Borrow balance');
            });
        });
    });

    it(`...should create a leveraged position of ${standardAmounts.ETH} ETH/500 DAI using dYdX FL`, async () => {
        const collAsset = 'ETH';
        const debtAsset = 'DAI';
        const debtAmount = 500;
        const collAmount = assetAmountInWei(standardAmounts[collAsset], collAsset);
        const collAddress = getAssetInfo(collAsset.replace(/^ETH/, 'WETH')).address;
        let collBalanceBefore = await balanceOf(collAddress, senderAcc.address);

        if (collBalanceBefore.lt(collAmount)) {
            if (isEth(collAddress)) {
                await depositToWeth(collAmount);
                // eslint-disable-next-line max-len
                // const wethBalance = await balanceOf(getAssetInfo('WETH').address, senderAcc.address);
            } else {
                await sell(
                    proxy,
                    WETH_ADDRESS,
                    collAddress,
                    assetAmountInWei(5, 'ETH'),
                    uniWrapper.address,
                    senderAcc.address,
                    senderAcc.address,
                );
            }
        }

        collBalanceBefore = await balanceOf(collAddress, senderAcc.address);
        const debtBalanceBefore = await balanceOf(
            getAssetInfo(debtAsset).address,
            senderAcc.address,
        );
        const borrowBalanceBefore = await getBorrowBalance(compView, proxy.address, getAssetInfo(`c${debtAsset}`).address);
        const supplyBalanceBefore = await getSupplyBalance(compView, proxy.address, getAssetInfo(`c${collAsset}`).address);

        await approve(collAddress, proxy.address);

        const recipe = new dfs.Recipe('Compound Leveraged Create', [
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
            // Supply ETH from EOA wallet to Compound
            new dfs.actions.compound.CompoundSupplyAction(
                getAssetInfo(`c${collAsset}`).address,
                collAmount,
                senderAcc.address,
                true,
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

        assert.closeTo(+assetAmountInEth(collBalanceBefore, collAsset) - standardAmounts[collAsset], +assetAmountInEth(collBalanceAfter, collAsset), 0.005, 'Coll asset balance');
        assert.closeTo(+assetAmountInEth(debtBalanceBefore, debtAsset), +assetAmountInEth(debtBalanceAfter, debtAsset), 0.005, 'Debt asset balance');
        assert.closeTo(+assetAmountInEth(borrowBalanceBefore, debtAsset) + 500, +assetAmountInEth(borrowBalanceAfter, debtAsset), 0.005, 'Borrow balance');
        assert.isBelow(+assetAmountInEth(supplyBalanceBefore, debtAsset) + parseFloat(standardAmounts[collAsset]), +assetAmountInEth(supplyBalanceAfter, debtAsset), 'Supply balance');
        const collDelta = assetAmountInEth(supplyBalanceAfter, debtAsset)
            - assetAmountInEth(supplyBalanceBefore, debtAsset);
        const debtDelta = assetAmountInEth(borrowBalanceAfter, debtAsset)
            - assetAmountInEth(borrowBalanceBefore, debtAsset);
        console.log(`Supplied ${collDelta} ${collAsset} (${standardAmounts[collAsset]} ${collAsset} from wallet) and created ${debtDelta} ${debtAsset} debt`);
    });
});
