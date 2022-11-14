const hre = require('hardhat');
const { expect } = require('chai');

const { configure } = require('@defisaver/sdk');
const { getAssetInfo, MAXUINT } = require('@defisaver/tokens');
const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    openStrategyAndBundleStorage,
    redeployCore,
    resetForkToBlock,
    chainIds,
    addrs,
    setNewExchangeWrapper,
    takeSnapshot,
    revertToSnapshot,
    logUsersCompV3Position,
    balanceOf,
    setBalance,
} = require('../../utils');

const {
    createBundle,
    createStrategy,
    addBotCaller,
    activateSub,
} = require('../../utils-strategies');

const {
    createCompV3CloseToDebtStrategy,
    createCompV3FLCloseToDebtStrategy,
} = require('../../strategies');
const { openCompV3Position, supplyCompV3 } = require('../../actions');
const { subCompV3CloseBundle } = require('../../strategy-subs');
const { RATIO_STATE_OVER } = require('../../triggers');
const { callCompV3CloseToDebtStrategy } = require('../../strategy-calls');

const compAssets = {
    USDC_MARKET: {
        address: addrs.mainnet.COMET_USDC_ADDR,
        collaterals: ['WETH', 'WBTC', 'COMP', 'UNI', 'LINK'],
        bAsset: 'USDC',
    },
};
const compMarkets = Object.keys(compAssets);

const deployCloseToDebtBundle = async (proxy, isFork = undefined) => {
    await openStrategyAndBundleStorage(isFork);
    const compV3CloseToDebtStrategyId = await createStrategy(
        proxy,
        ...createCompV3CloseToDebtStrategy(),
        false,
    );
    const compV3FLCloseToDebtStrategyId = await createStrategy(
        proxy,
        ...createCompV3FLCloseToDebtStrategy(),
        false,
    );
    const compV3CloseToDebtBundleId = await createBundle(
        proxy,
        [compV3CloseToDebtStrategyId, compV3FLCloseToDebtStrategyId],
    );

    return compV3CloseToDebtBundleId;
};

const compV3CloseToDebtTest = async () => {
    describe('CompV3-Close-to-base-asset Strategy test', function () {
        this.timeout(1000000);

        const USD_COLL_OPEN = '30000';
        const HELPER_COLL_AMOUNT = '120000';
        const USD_DEBT_OPEN = '10000';

        let strategyExecutorByBot;
        let strategySub;
        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let subId;
        let bundleId;
        let snapshotId;

        before(async () => {
            const network = hre.network.config.name;
            console.log(`Network: ${network}`);

            await resetForkToBlock();

            configure({
                chainId: chainIds[network],
                testMode: true,
            });

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            console.log({ eoa: senderAcc.address, proxy: proxyAddr });

            strategyExecutor = await redeployCore(false);

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            bundleId = await deployCloseToDebtBundle(proxy);

            snapshotId = await takeSnapshot();
        });

        for (let i = 0; i < compMarkets.length; i++) {
            const bAsset = compAssets[compMarkets[i]].bAsset;
            const market = compAssets[compMarkets[i]].address;
            const collaterals = compAssets[compMarkets[i]].collaterals;
            for (let j = 0; j < collaterals.length; j++) {
                it(`... should subscribe and execute a CompV3 Close strategy with ${collaterals[j]} as supplied asset`, async () => {
                    snapshotId = await takeSnapshot();

                    const amount = fetchAmountinUSDPrice(collaterals[j], USD_COLL_OPEN).toString();
                    await openCompV3Position(
                        market,
                        collaterals[j],
                        bAsset,
                        amount,
                        USD_DEBT_OPEN,
                        proxy.address,
                        senderAcc,
                        proxy,
                    );
                    /// @notice This is us collateralizing a position with other assets so we can
                    /// close the position with subscribed collateral
                    const helperCollateralIndex = (j + 1) % collaterals.length;
                    const helperAmount = fetchAmountinUSDPrice(
                        collaterals[helperCollateralIndex], HELPER_COLL_AMOUNT,
                    ).toString();
                    const helperAmountInWei = hre.ethers.utils.parseUnits(
                        helperAmount, getAssetInfo(collaterals[helperCollateralIndex]).decimals,
                    );
                    await supplyCompV3(
                        market,
                        proxy,
                        getAssetInfo(collaterals[helperCollateralIndex]).address,
                        helperAmountInWei,
                        senderAcc.address,
                        proxy.address,
                    );
                    await logUsersCompV3Position(market, proxy.address);

                    const targetRatio = hre.ethers.utils.parseUnits('2', '18');
                    const ratioState = RATIO_STATE_OVER;
                    ({ subId, strategySub } = await subCompV3CloseBundle(
                        proxy,
                        bundleId,
                        market,
                        getAssetInfo(collaterals[j]).address,
                        getAssetInfo(bAsset).address,
                        targetRatio.toString(),
                        ratioState,
                        proxy.address,
                    ));

                    await activateSub(proxy, subId);

                    const debtAssetBalanceBefore = await balanceOf(
                        getAssetInfo(bAsset).address, senderAcc.address,
                    );
                    await callCompV3CloseToDebtStrategy(
                        strategyExecutorByBot,
                        subId,
                        MAXUINT,
                        getAssetInfo(collaterals[j]),
                        getAssetInfo(bAsset),
                        strategySub,
                    );
                    const debtAssetBalanceAfter = await balanceOf(
                        getAssetInfo(bAsset).address, senderAcc.address,
                    );

                    await logUsersCompV3Position(market, proxy.address);
                    await revertToSnapshot(snapshotId);
                    console.log(`Users subscribed coll/asset had ${USD_COLL_OPEN}/${USD_DEBT_OPEN} in USD`);
                    console.log(`User received ${(debtAssetBalanceAfter.sub(debtAssetBalanceBefore)).toString()} ${getAssetInfo(bAsset).symbol}`);
                });
            }
        }
    });
};
module.exports = {
    compV3CloseToDebtTest,
};
