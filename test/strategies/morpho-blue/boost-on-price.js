/* eslint-disable max-len */
const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo, getAssetInfoByAddress } = require('@defisaver/tokens');
const automationSdk = require('@defisaver/automation-sdk');

const {
    getProxy,
    setBalance,
    network,
    addrs,
    chainIds,
    takeSnapshot,
    revertToSnapshot,
    isNetworkFork,
    getOwnerAddr,
    fetchTokenPriceInUSD,
    fetchAmountInUSDPrice,
    getContractFromRegistry,
    formatExchangeObj,
    openStrategyAndBundleStorage,
    getNetwork,
    balanceOf,
    redeploy,
    approve,
} = require('../../utils');

const {
    addBotCaller,
    createStrategy,
    createBundle,
} = require('../../utils-strategies');

const { topUp } = require('../../../scripts/utils/fork');
const { subMorphoBlueLeverageManagementOnPrice } = require('../../strategy-subs');
const { createMorphoBlueBoostOnTargetPriceStrategy } = require('../../strategies');
const { createMorphoBlueBoostOnTargetPriceL2Strategy } = require('../../l2-strategies');
const { getMarkets, getBaseMarkets } = require('../../morpho-blue/utils');
const { morphoBlueSupplyCollateral, morphoBlueBorrow } = require('../../actions');

const deployBoostOnPriceBundle = async (isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const boostOnPriceStrategy = getNetwork() === 'mainnet'
        ? createMorphoBlueBoostOnTargetPriceStrategy()
        : createMorphoBlueBoostOnTargetPriceL2Strategy();
    const flBoostOnPriceStrategy = getNetwork() === 'mainnet'
        ? createMorphoBlueBoostOnTargetPriceStrategy()
        : createMorphoBlueBoostOnTargetPriceL2Strategy();
    const boostOnPriceStrategyId = await createStrategy(undefined, ...boostOnPriceStrategy, false);
    const flBoostOnPriceStrategyId = await createStrategy(undefined, ...flBoostOnPriceStrategy, false);
    const boostOnPriceBundleId = await createBundle(undefined, [boostOnPriceStrategyId, flBoostOnPriceStrategyId]);
    return boostOnPriceBundleId;
};

const morphoBoostOnPriceStrategyTest = async (isFork, eoaBoost) => {
    describe('Morpho Boost On Price Strategy Test', function () {
        this.timeout(1200000);
        const REGISTRY_ADDR = addrs[network].REGISTRY_ADDR;
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let flAction;
        let view;
        let boostOnPriceBundleId;
        const markets = network === 'mainnet' ? getMarkets()[0] : getBaseMarkets()[0];
        let user;

        const setUpCallers = async () => {
            [senderAcc, botAcc] = await hre.ethers.getSigners();
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(botAcc.address);
                await topUp(getOwnerAddr());
            }
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            user = eoaBoost ? senderAcc.address : proxy.address;
        };
        const setUpContracts = async () => {
            const strategyContractName = network === 'mainnet' ? 'StrategyExecutor' : 'StrategyExecutorL2';
            strategyExecutor = await hre.ethers.getContractAt(strategyContractName, addrs[getNetwork()].STRATEGY_EXECUTOR_ADDR);
            strategyExecutor = strategyExecutor.connect(botAcc);
            flAction = await getContractFromRegistry('FLAction', REGISTRY_ADDR, false, isFork);
            view = await hre.ethers.getContractAt('MorphoBlueHelper', addrs[getNetwork()].MORPHO_BLUE_VIEW);
            await redeploy('MorphoBluePriceTrigger', REGISTRY_ADDR, false, isFork);
            await redeploy('MorphoBlueTargetRatioCheck', REGISTRY_ADDR, false, isFork);
        };
        const createPosition = async (
            marketParams,
            loanToken,
            collToken,
            supplyAmountInUsd,
            borrowAmountInUsd,
        ) => {
            const borrowAmount = await fetchAmountInUSDPrice(loanToken.symbol, borrowAmountInUsd);
            const supplyAmount = await fetchAmountInUSDPrice(collToken.symbol, supplyAmountInUsd);
            await setBalance(collToken.address, senderAcc.address, supplyAmount);
            await approve(collToken.address, proxy.address, senderAcc);
            await morphoBlueSupplyCollateral(
                proxy,
                marketParams,
                supplyAmount,
                senderAcc.address,
                user,
            );
            await morphoBlueBorrow(
                proxy,
                marketParams,
                borrowAmount,
                user,
                senderAcc.address,
            );
        };
        const subBoostOnPrice = async (
            marketParams,
            targetRatio,
            price,
            priceState,
        ) => {
            const { subId, strategySub } = await subMorphoBlueLeverageManagementOnPrice(
                proxy,
                boostOnPriceBundleId,
                marketParams,
                user,
                targetRatio,
                price,
                priceState,
                true,
            );
            return { subId, strategySub };
        };
        before(async () => {
            await setUpCallers();
            await setUpContracts();
            boostOnPriceBundleId = await deployBoostOnPriceBundle(isFork);
            await addBotCaller(botAcc.address, REGISTRY_ADDR, isFork);
        });
        beforeEach(async () => { snapshotId = await takeSnapshot(); });
        afterEach(async () => { await revertToSnapshot(snapshotId); });

        for (let i = 0; i < markets.length; i++) {
            const marketParams = markets[i];
            const loanToken = getAssetInfoByAddress(marketParams[0], chainIds[network]);
            const collToken = getAssetInfoByAddress(marketParams[1], chainIds[network]);

            it(`... should call regular Morpho blue boost on price strategy for position: [${collToken.symbol}/${loanToken.symbol}]`, async () => {
                await createPosition(marketParams, loanToken, collToken, 10000, 5000);
                const ratio = await view.callStatic.getRatioUsingParams(marketParams, user);

                // const targetRatio = 150;
                // // TODO: odrediti dinamicki
                // const price = 2;
                // await subBoostOnPrice(marketParams, targetRatio, price, automationSdk.enums.RatioState.UNDER);
            });
            // it(`... should call flash loan Morpho blue boost on price strategy for position: [${collToken.symbol}/${loanToken.symbol}]`, async () => {
            // });
        }
    });
};

describe('Morpho Boost On Price Strategy Test', function () {
    this.timeout(80000);
    it('... test morpho boost on price strategies', async () => {
        await morphoBoostOnPriceStrategyTest(isNetworkFork(), false);
    }).timeout(50000);
});

module.exports = {
    morphoBoostOnPriceStrategyTest,
};
