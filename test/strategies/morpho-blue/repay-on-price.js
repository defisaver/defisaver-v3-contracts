const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const automationSdk = require('@defisaver/automation-sdk');
const { configure } = require('@defisaver/sdk');

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
    fetchAmountInUSDPrice,
    getContractFromRegistry,
    formatExchangeObj,
    approve,
} = require('../../utils/utils');

const { addBotCaller } = require('../utils/utils-strategies');
const { topUp } = require('../../../scripts/utils/fork');
const { subMorphoBlueLeverageManagementOnPrice } = require('../utils/strategy-subs');
const { morphoBlueSupplyCollateral, morphoBlueBorrow } = require('../../utils/actions');
const {
    callMorphoBlueRepayOnPriceStrategy,
    callMorphoBlueFLRepayOnPriceStrategy,
} = require('../utils/strategy-calls');
const {
    MORPHO_BLUE_ADDRESS,
    formatMarketParams,
    deployMorphoBlueRepayOnPriceBundle,
} = require('../../utils/morpho-blue');

/* //////////////////////////////////////////////////////////////
                           CONSTANTS
////////////////////////////////////////////////////////////// */

// We are testing with real sell, without mocking, so use markets with enough uniV3 liquidity.
const L1_MARKETS_WITH_UNI_V3_LIQUIDITY = [
    // wstETH/ETH morpho market
    {
        loanToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        collateralToken: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
        oracle: '0x2a01eb9496094da03c4e364def50f5ad1280ad72',
        irm: '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
        lltv: '945000000000000000',
        uniV3Fee: 100,
    },
    // WBTC/USDC morpho market
    {
        loanToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        collateralToken: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        oracle: '0xDddd770BADd886dF3864029e4B377B5F6a2B6b83',
        irm: '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
        lltv: '860000000000000000',
        uniV3Fee: 3000,
    },
];
const L2_MARKETS_WITH_UNI_V3_LIQUIDITY = [
    // wstETH/ETH morpho market
    {
        loanToken: '0x4200000000000000000000000000000000000006',
        collateralToken: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
        oracle: '0x4A11590e5326138B514E08A9B52202D42077Ca65',
        irm: '0x46415998764C29aB2a25CbeA6254146D50D22687',
        lltv: '945000000000000000',
        uniV3Fee: 100,
    },
    // cbBTC/ETH morpho market
    {
        loanToken: '0x4200000000000000000000000000000000000006',
        collateralToken: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
        oracle: '0x10b95702a0ce895972C91e432C4f7E19811D320E',
        irm: '0x46415998764C29aB2a25CbeA6254146D50D22687',
        lltv: '915000000000000000',
        uniV3Fee: 500,
    },
];
const TEST_MARKETS =
    network === 'mainnet' ? L1_MARKETS_WITH_UNI_V3_LIQUIDITY : L2_MARKETS_WITH_UNI_V3_LIQUIDITY;

const COLL_AMOUNT_IN_USD = 10000;
const BORROW_AMOUNT_IN_USD = 5000;
const REPAY_COLL_AMOUNT_IN_USD = 1500;
// Sub &targetRatio; MorphoBlueTargetRatioCheck requires post-repay ratio within ±5% of this value.
// Tuned for COLL/BORROW/REPAY amounts above
const TARGET_RATIO = 244;
const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

const createPosition = async (marketParams, loanToken, collToken, senderAcc, proxy, user) => {
    // give auth for EOA automation
    if (user !== proxy.address) {
        const morphoBlue = await hre.ethers.getContractAt('IMorphoBlue', MORPHO_BLUE_ADDRESS);
        const isAuthorized = await morphoBlue.isAuthorized(senderAcc.address, proxy.address);
        if (!isAuthorized) {
            await morphoBlue.connect(senderAcc).setAuthorization(proxy.address, true);
        }
    }
    const borrowAmount = await fetchAmountInUSDPrice(loanToken.symbol, BORROW_AMOUNT_IN_USD);
    const supplyAmount = await fetchAmountInUSDPrice(collToken.symbol, COLL_AMOUNT_IN_USD);
    await setBalance(collToken.address, senderAcc.address, supplyAmount);
    await approve(collToken.address, proxy.address, senderAcc);
    await morphoBlueSupplyCollateral(
        proxy,
        formatMarketParams(marketParams),
        supplyAmount,
        senderAcc.address,
        user,
    );
    await morphoBlueBorrow(
        proxy,
        formatMarketParams(marketParams),
        borrowAmount,
        user,
        senderAcc.address,
    );
};

const calculateMorphoPrice = async (loanToken, collToken, oracle) => {
    const oracleContract = await hre.ethers.getContractAt('IOracle', oracle);
    const price = await oracleContract.price();
    const pricePrecision = hre.ethers.BigNumber.from(10).pow(8);
    const oracleDecimals = 36;
    const currentPrice = price
        .mul(pricePrecision)
        .div(
            hre.ethers.BigNumber.from(10).pow(
                oracleDecimals + loanToken.decimals - collToken.decimals,
            ),
        );
    return currentPrice.div(pricePrecision);
};

const formatExchangeObjForMarket = (marketParams, amount) =>
    formatExchangeObj(
        marketParams.collateralToken,
        marketParams.loanToken,
        amount,
        addrs[network].UNISWAP_V3_WRAPPER,
        0,
        marketParams.uniV3Fee,
    );

const morphoRepayOnPriceStrategyTest = async (isFork, eoaRepay) => {
    describe('Morpho Repay On Price Strategy Test', function () {
        this.timeout(1200000);
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let flAction;
        let view;
        let repayOnPriceBundleId;
        let user;

        before(async () => {
            if (network !== 'mainnet') {
                configure({
                    chainId: chainIds[network],
                    testMode: true,
                });
            }
            // setup callers
            [senderAcc, botAcc] = await hre.ethers.getSigners();
            if (isFork) {
                // fund script signer, bot, and registry owner on Tenderly fork
                await topUp(senderAcc.address);
                await topUp(botAcc.address);
                await topUp(getOwnerAddr());
            }
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            user = eoaRepay ? senderAcc.address : proxy.address;

            const strategyContractName =
                network === 'mainnet' ? 'StrategyExecutor' : 'StrategyExecutorL2';
            strategyExecutor = await hre.ethers.getContractAt(
                strategyContractName,
                addrs[network].STRATEGY_EXECUTOR_ADDR,
            );
            strategyExecutor = strategyExecutor.connect(botAcc);
            flAction = await getContractFromRegistry('FLAction', isFork);
            view = await hre.ethers.getContractAt(
                'MorphoBlueHelper',
                addrs[network].MORPHO_BLUE_VIEW,
            );

            // register repay-on-price bundle (regular + FL) in StrategyStorage/BundleStorage
            repayOnPriceBundleId = await deployMorphoBlueRepayOnPriceBundle(isFork);
            await addBotCaller(botAcc.address, isFork);
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        for (let i = 0; i < TEST_MARKETS.length; i++) {
            const marketParams = TEST_MARKETS[i];
            const loanToken = getAssetInfoByAddress(marketParams.loanToken, chainIds[network]);
            const collToken = getAssetInfoByAddress(
                marketParams.collateralToken,
                chainIds[network],
            );

            it(`... should call regular Morpho blue repay on price strategy for ${
                eoaRepay ? 'EOA' : 'wallet'
            } position: [${collToken.symbol}/${loanToken.symbol}]`, async () => {
                await createPosition(marketParams, loanToken, collToken, senderAcc, proxy, user);

                // take snapshot of ratio before
                const ratioBefore = await view.callStatic.getRatioUsingParams(marketParams, user);

                // calculate trigger price (set high so trigger passes in test)
                const price = await calculateMorphoPrice(loanToken, collToken, marketParams.oracle);
                const triggerPrice = price.mul(2);

                // subscribe to repay-on-price bundle (UNDER = repay when price drops)
                const { subId, strategySub } = await subMorphoBlueLeverageManagementOnPrice(
                    proxy,
                    repayOnPriceBundleId,
                    marketParams,
                    user,
                    TARGET_RATIO,
                    triggerPrice,
                    automationSdk.enums.RatioState.UNDER,
                );

                // calculate collateral amount to withdraw and sell for repay
                const repayAmount = await fetchAmountInUSDPrice(
                    collToken.symbol,
                    REPAY_COLL_AMOUNT_IN_USD,
                );
                // create exchange order (coll -> loan via UniV3)
                const exchangeOrder = formatExchangeObjForMarket(marketParams, repayAmount);

                await callMorphoBlueRepayOnPriceStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    repayAmount,
                    exchangeOrder,
                );

                // check ratio increased after repay
                const ratioAfter = await view.callStatic.getRatioUsingParams(marketParams, user);
                expect(ratioAfter).to.be.gt(ratioBefore);
            });

            it(`... should call flash loan Morpho blue repay on price strategy for ${
                eoaRepay ? 'EOA' : 'wallet'
            } position: [${collToken.symbol}/${loanToken.symbol}]`, async () => {
                await createPosition(marketParams, loanToken, collToken, senderAcc, proxy, user);

                // take snapshot of ratio before
                const ratioBefore = await view.callStatic.getRatioUsingParams(marketParams, user);

                // calculate trigger price (set high so trigger passes in test)
                const price = await calculateMorphoPrice(loanToken, collToken, marketParams.oracle);
                const triggerPrice = price.mul(2);

                // subscribe to repay-on-price bundle (UNDER = repay when price drops)
                const { subId, strategySub } = await subMorphoBlueLeverageManagementOnPrice(
                    proxy,
                    repayOnPriceBundleId,
                    marketParams,
                    user,
                    TARGET_RATIO,
                    triggerPrice,
                    automationSdk.enums.RatioState.UNDER,
                );

                // calculate collateral FL/repay amount
                const repayAmount = await fetchAmountInUSDPrice(
                    collToken.symbol,
                    REPAY_COLL_AMOUNT_IN_USD,
                );
                // fund Balancer vault so FL can pull collateral
                await setBalance(collToken.address, BALANCER_VAULT, repayAmount);
                // create exchange order (coll -> loan via UniV3)
                const exchangeOrder = formatExchangeObjForMarket(marketParams, repayAmount);

                await callMorphoBlueFLRepayOnPriceStrategy(
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    repayAmount,
                    exchangeOrder,
                    collToken.address,
                    flAction.address,
                );

                // check ratio increased after repay
                const ratioAfter = await view.callStatic.getRatioUsingParams(marketParams, user);
                expect(ratioAfter).to.be.gt(ratioBefore);
            });
        }
    });
};

describe('Morpho Repay On Price Strategy Test', function () {
    this.timeout(80000);
    it('... test morpho repay on price strategies', async () => {
        await morphoRepayOnPriceStrategyTest(isNetworkFork(), false);
        await morphoRepayOnPriceStrategyTest(isNetworkFork(), true);
    }).timeout(50000);
});

module.exports = {
    morphoRepayOnPriceStrategyTest,
};
