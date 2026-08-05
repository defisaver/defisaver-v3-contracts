const { expect } = require('chai');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    takeSnapshot,
    revertToSnapshot,
    redeploy,
    setBalance,
    addrs,
    nullAddress,
    network,
    chainIds,
    getAndSetMockExchangeWrapper,
    formatMockExchangeObjUsdFeed,
    fetchAmountInUSDPrice,
} = require('../../utils/utils');
const {
    VARIABLE_RATE,
    AAVE_NO_DEBT_MODE,
    AAVE_V3_AUTOMATION_TEST_PAIRS_BOOST,
    openAaveV3ProxyPosition,
    isAssetBorrowableV3,
    getAaveV3ReserveData,
} = require('../../utils/aave');
const { executeAction } = require('../../utils/actions');

const BN = hre.ethers.BigNumber;
const MAX_UINT = hre.ethers.constants.MaxUint256;
const TEST_TIMEOUT = 300000;

const testPairs = AAVE_V3_AUTOMATION_TEST_PAIRS_BOOST[chainIds[network]] || [];

const pow10 = (decimals) => BN.from(10).pow(decimals);

const minBN = (...values) => values.reduce((min, value) => (value.lt(min) ? value : min));

const capHeadroom = (cap, decimals, used) => {
    if (cap.eq(0)) return MAX_UINT;

    const capAmount = cap.mul(pow10(decimals));
    return capAmount.gt(used) ? capAmount.sub(used) : BN.from(0);
};

const amountToUsd = (amount, asset, tokenInfo) =>
    amount.mul(tokenInfo.price).div(pow10(asset.decimals));

const amountFromUsd = (usdAmount, asset, tokenInfo) =>
    usdAmount.mul(pow10(asset.decimals)).div(tokenInfo.price);

const usdToTestInput = (usdAmount) => Number(hre.ethers.utils.formatUnits(usdAmount, 8));

const percentMul = (amount, percentage) => amount.mul(percentage).add(5000).div(10000);

const slightExcessAmount = (asset) => {
    const excessAmount = pow10(asset.decimals).div(1000);
    return excessAmount.gt(0) ? excessAmount : BN.from(1);
};

const sellOutputAmount = (debtAmount, context) =>
    debtAmount
        .mul(context.debtInfo.price)
        .mul(pow10(context.collAsset.decimals))
        .div(pow10(context.debtAsset.decimals))
        .div(context.collInfo.price);

describe('AaveV3 Boost Tests With Carry Debt FL', function () {
    this.timeout(TEST_TIMEOUT);

    let snapshotId;
    let senderAcc;
    let senderAddr;
    let wallet;
    let flActionAddress;
    let flAaveV3CarryDebtAddress;
    let aaveV3View;
    let mockWrapper;
    const pairContextCache = new Map();

    const executeRecipe = async (recipe) => {
        const functionData = recipe.encodeForDsProxyCall()[1];
        await executeAction('RecipeExecutor', functionData, wallet);
    };

    const getPoolDataProvider = async (marketAddr) => {
        const addressProvider = await hre.ethers.getContractAt(
            'IPoolAddressesProvider',
            marketAddr,
        );
        return addressProvider.getPoolDataProvider();
    };

    const getAaveV3FlashloanFee = async (amount) => {
        const addressProvider = await hre.ethers.getContractAt(
            'IPoolAddressesProvider',
            addrs[network].AAVE_MARKET,
        );
        const poolAddr = await addressProvider.getPool();
        const pool = await hre.ethers.getContractAt('IPoolV3', poolAddr);
        const premium = await pool.FLASHLOAN_PREMIUM_TOTAL();
        return percentMul(amount, premium);
    };

    const getPositionBalances = async (context) => {
        const [collTokenData, debtTokenData] = await aaveV3View.getTokenBalances(
            context.marketAddr,
            wallet.address,
            [context.collAsset.address, context.debtAsset.address],
        );

        return {
            collAmount: collTokenData.balance,
            debtAmount: debtTokenData.borrowsVariable,
        };
    };

    const getBorrowAllowanceToCarryDebtFL = async (context) => {
        const debtToken = await hre.ethers.getContractAt(
            'IDebtToken',
            context.debtReserveData.variableDebtTokenAddress,
        );
        return debtToken.borrowAllowance(wallet.address, flAaveV3CarryDebtAddress);
    };

    const validatePairContext = async (pair, index) => {
        if (pairContextCache.has(index)) return pairContextCache.get(index);

        const marketAddr = pair.marketAddr;
        const pairLabel = `${pair.collSymbol}/${pair.debtSymbol}`;

        try {
            const collAsset = getAssetInfo(
                pair.collSymbol === 'ETH' ? 'WETH' : pair.collSymbol,
                chainIds[network],
            );
            const debtAsset = getAssetInfo(
                pair.debtSymbol === 'ETH' ? 'WETH' : pair.debtSymbol,
                chainIds[network],
            );
            const dataProviderAddr = await getPoolDataProvider(marketAddr);
            const debtBorrowable = await isAssetBorrowableV3(dataProviderAddr, debtAsset.address);
            const collInfo = await aaveV3View.getTokenInfoFull(marketAddr, collAsset.address);
            const debtInfo = await aaveV3View.getTokenInfoFull(marketAddr, debtAsset.address);
            const collReserveData = await getAaveV3ReserveData(collAsset.address, marketAddr);
            const debtReserveData = await getAaveV3ReserveData(debtAsset.address, marketAddr);

            const collAmount = await fetchAmountInUSDPrice(collAsset.symbol, pair.collAmountInUSD);
            const debtAmount = await fetchAmountInUSDPrice(debtAsset.symbol, pair.debtAmountInUSD);
            const boostAmount = await fetchAmountInUSDPrice(
                debtAsset.symbol,
                pair.boostAmountInUSD,
            );
            const standardFeeAmount = await getAaveV3FlashloanFee(boostAmount);
            const standardPaybackAmount = boostAmount.add(standardFeeAmount);

            const expectedCollFromBoost = sellOutputAmount(standardPaybackAmount, {
                collAsset,
                debtAsset,
                collInfo,
                debtInfo,
            });

            const debtHeadroom = capHeadroom(
                debtInfo.borrowCap,
                debtAsset.decimals,
                debtInfo.totalBorrow,
            );
            const collHeadroom = capHeadroom(
                collInfo.supplyCap,
                collAsset.decimals,
                collInfo.totalSupply,
            );
            const requiredLiquidityForRegularFL = debtAmount
                .add(boostAmount)
                .add(standardPaybackAmount);
            const requiredBorrowHeadroom = debtAmount.add(standardPaybackAmount);
            const requiredSupplyHeadroom = collAmount.add(expectedCollFromBoost);

            let skipReason;
            if (marketAddr !== addrs[network].AAVE_MARKET) {
                skipReason = 'carry-debt FL action uses the default Aave V3 market';
            } else if (!collInfo.isActive || collInfo.isPaused || collInfo.isFrozen) {
                skipReason = 'collateral reserve is inactive, paused, or frozen';
            } else if (!collInfo.usageAsCollateralEnabled) {
                skipReason = 'collateral reserve cannot be used as collateral';
            } else if (!debtInfo.isActive || debtInfo.isPaused || debtInfo.isFrozen) {
                skipReason = 'debt reserve is inactive, paused, or frozen';
            } else if (!debtBorrowable || !debtInfo.borrowingEnabled) {
                skipReason = 'debt reserve is not borrowable';
            } else if (!debtInfo.isFlashLoanEnabled) {
                skipReason = 'debt reserve has flashloans disabled';
            } else if (debtInfo.availableLiquidity.lt(requiredLiquidityForRegularFL)) {
                skipReason = 'not enough debt liquidity for regular FL boost';
            } else if (debtHeadroom.lt(requiredBorrowHeadroom)) {
                skipReason = 'not enough debt borrow-cap headroom';
            } else if (collHeadroom.lt(requiredSupplyHeadroom)) {
                skipReason = 'not enough collateral supply-cap headroom';
            }

            const context = {
                valid: !skipReason,
                skipReason,
                pair,
                pairLabel,
                marketAddr,
                collAsset,
                debtAsset,
                collInfo,
                debtInfo,
                collReserveData,
                debtReserveData,
                collAmount,
                debtAmount,
                boostAmount,
                standardFeeAmount,
                standardPaybackAmount,
                expectedCollFromBoost,
                debtHeadroom,
                collHeadroom,
            };

            pairContextCache.set(index, context);
            return context;
        } catch (err) {
            const context = {
                valid: false,
                skipReason: `failed to build pair context: ${err.message}`,
                pair,
                pairLabel,
                marketAddr,
            };
            pairContextCache.set(index, context);
            return context;
        }
    };

    const getFirstValidPairContext = async () => {
        for (let i = 0; i < testPairs.length; ++i) {
            const context = await validatePairContext(testPairs[i], i);
            if (context.valid) return context;
        }

        return null;
    };

    const getStressContext = async () => {
        for (let i = 0; i < testPairs.length; ++i) {
            const context = await validatePairContext(testPairs[i], i);
            if (!context.valid) continue;

            if (context.debtInfo.price.eq(0) || context.collInfo.price.eq(0)) continue;

            const maxBoostFromSupply = context.collHeadroom.eq(MAX_UINT)
                ? MAX_UINT
                : amountFromUsd(
                      amountToUsd(context.collHeadroom, context.collAsset, context.collInfo).div(3),
                      context.debtAsset,
                      context.debtInfo,
                  );
            const maxBoostAmount = minBN(
                context.debtInfo.availableLiquidity.mul(6).div(10),
                context.debtHeadroom.mul(9).div(10),
                maxBoostFromSupply,
            );

            if (maxBoostAmount.lte(context.debtInfo.availableLiquidity.div(2))) continue;

            const openDebtAmount = maxBoostAmount.div(100);
            if (openDebtAmount.eq(0)) continue;
            const standardFeeAmount = await getAaveV3FlashloanFee(maxBoostAmount);
            const standardPaybackAmount = maxBoostAmount.add(standardFeeAmount);

            const availableAfterOpen = context.debtInfo.availableLiquidity.sub(openDebtAmount);
            if (maxBoostAmount.lte(availableAfterOpen.div(2))) continue;
            if (maxBoostAmount.add(openDebtAmount).gt(context.debtInfo.availableLiquidity))
                continue;
            if (standardPaybackAmount.add(openDebtAmount).gt(context.debtHeadroom)) continue;

            const boostUsd = amountToUsd(maxBoostAmount, context.debtAsset, context.debtInfo);
            const openDebtUsd = amountToUsd(openDebtAmount, context.debtAsset, context.debtInfo);
            const openCollUsd = boostUsd.mul(2);
            const openCollAmount = amountFromUsd(openCollUsd, context.collAsset, context.collInfo);
            const collFromBoost = sellOutputAmount(standardPaybackAmount, context);
            if (openCollAmount.add(collFromBoost).gt(context.collHeadroom)) continue;

            return {
                ...context,
                stressBoostAmount: maxBoostAmount,
                stressStandardFeeAmount: standardFeeAmount,
                stressStandardPaybackAmount: standardPaybackAmount,
                stressOpenDebtUsd: usdToTestInput(openDebtUsd),
                stressOpenCollUsd: usdToTestInput(openCollUsd),
            };
        }

        return null;
    };

    before(async () => {
        const flActionContract = await redeploy('FLAction');
        flActionAddress = flActionContract.address;

        const flAaveV3CarryDebtContract = await redeploy('FLAaveV3CarryDebt');
        flAaveV3CarryDebtAddress = flAaveV3CarryDebtContract.address;

        aaveV3View = await redeploy('AaveV3View');
        await redeploy('RecipeExecutor');
        await redeploy('DFSSell');
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3Borrow');
        await redeploy('AaveV3DelegateCredit');

        senderAcc = (await hre.ethers.getSigners())[0];
        senderAddr = senderAcc.address;
        wallet = await getProxy(senderAddr, true);
        mockWrapper = await getAndSetMockExchangeWrapper(senderAcc);
    });

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    testPairs.forEach((pair, index) => {
        it(`... should perform regular Aave V3 FL boost for ${pair.collSymbol}/${pair.debtSymbol}`, async function () {
            const context = await validatePairContext(pair, index);
            if (!context.valid) {
                console.log(`Skipping ${context.pairLabel}: ${context.skipReason}`);
                this.skip();
            }

            await openAaveV3ProxyPosition(
                senderAddr,
                wallet,
                context.collAsset.symbol,
                context.debtAsset.symbol,
                pair.collAmountInUSD,
                pair.debtAmountInUSD,
                context.marketAddr,
            );

            const loanDataBeforeBoost = await aaveV3View.getLoanData(
                context.marketAddr,
                wallet.address,
            );
            await setBalance(
                context.debtAsset.address,
                wallet.address,
                context.standardFeeAmount.add(1),
            );
            const exchangeData = await formatMockExchangeObjUsdFeed(
                context.debtAsset,
                context.collAsset,
                '$1',
                mockWrapper,
                context.standardPaybackAmount,
            );

            const regularBoostRecipe = new dfs.Recipe('RegularAaveV3BoostRecipe', [
                new dfs.actions.flashloan.FLAction(
                    new dfs.actions.flashloan.AaveV3FlashLoanAction(
                        [context.debtAsset.address],
                        [context.boostAmount.toString()],
                        [AAVE_NO_DEBT_MODE],
                        nullAddress,
                    ),
                ),
                new dfs.actions.basic.SellAction(exchangeData, wallet.address, wallet.address),
                new dfs.actions.aaveV3.AaveV3SupplyAction(
                    false,
                    context.marketAddr,
                    '$2',
                    wallet.address,
                    context.collAsset.address,
                    context.collReserveData.id,
                    true,
                    false,
                    nullAddress,
                ),
                new dfs.actions.aaveV3.AaveV3BorrowAction(
                    false,
                    context.marketAddr,
                    '$1',
                    flActionAddress,
                    VARIABLE_RATE,
                    context.debtReserveData.id,
                    false,
                    nullAddress,
                ),
            ]);

            await executeRecipe(regularBoostRecipe);

            const loanDataAfterBoost = await aaveV3View.getLoanData(
                context.marketAddr,
                wallet.address,
            );
            expect(loanDataAfterBoost.ratio).to.be.lt(loanDataBeforeBoost.ratio);
        });

        it(`... should perform Aave V3 carry-debt FL boost for ${pair.collSymbol}/${pair.debtSymbol}`, async function () {
            const context = await validatePairContext(pair, index);
            if (!context.valid) {
                console.log(`Skipping ${context.pairLabel}: ${context.skipReason}`);
                this.skip();
            }

            await openAaveV3ProxyPosition(
                senderAddr,
                wallet,
                context.collAsset.symbol,
                context.debtAsset.symbol,
                pair.collAmountInUSD,
                pair.debtAmountInUSD,
                context.marketAddr,
            );

            const loanDataBeforeBoost = await aaveV3View.getLoanData(
                context.marketAddr,
                wallet.address,
            );
            const positionBeforeBoost = await getPositionBalances(context);
            const exchangeData = await formatMockExchangeObjUsdFeed(
                context.debtAsset,
                context.collAsset,
                '$1',
                mockWrapper,
                context.boostAmount,
            );

            const carryDebtBoostRecipe = new dfs.Recipe('AaveV3BoostRecipeWithCarryDebtFL', [
                new dfs.actions.flashloan.AaveV3FlashLoanCarryDebtAction(
                    [context.debtAsset.address],
                    [context.boostAmount.toString()],
                    [VARIABLE_RATE],
                    wallet.address,
                ),
                new dfs.actions.basic.SellAction(exchangeData, wallet.address, wallet.address),
                new dfs.actions.aaveV3.AaveV3SupplyAction(
                    false,
                    context.marketAddr,
                    '$2',
                    wallet.address,
                    context.collAsset.address,
                    context.collReserveData.id,
                    true,
                    false,
                    nullAddress,
                ),
                new dfs.actions.aaveV3.AaveV3DelegateCredit(
                    false,
                    context.marketAddr,
                    '$1',
                    VARIABLE_RATE,
                    context.debtReserveData.id,
                    flAaveV3CarryDebtAddress,
                ),
            ]);

            await executeRecipe(carryDebtBoostRecipe);

            const loanDataAfterBoost = await aaveV3View.getLoanData(
                context.marketAddr,
                wallet.address,
            );
            const positionAfterBoost = await getPositionBalances(context);
            const allowance = await getBorrowAllowanceToCarryDebtFL(context);

            expect(loanDataAfterBoost.ratio).to.be.lt(loanDataBeforeBoost.ratio);
            expect(positionAfterBoost.collAmount).to.be.gt(positionBeforeBoost.collAmount);
            expect(positionAfterBoost.debtAmount).to.be.gt(positionBeforeBoost.debtAmount);
            expect(allowance).to.be.eq(0);
        });
    });

    it('... should revert on carry-debt FL when using maximum credit delegation allowance', async function () {
        const context = await getFirstValidPairContext();
        if (!context) this.skip();

        await openAaveV3ProxyPosition(
            senderAddr,
            wallet,
            context.collAsset.symbol,
            context.debtAsset.symbol,
            context.pair.collAmountInUSD,
            context.pair.debtAmountInUSD,
            context.marketAddr,
        );

        const exchangeData = await formatMockExchangeObjUsdFeed(
            context.debtAsset,
            context.collAsset,
            '$1',
            mockWrapper,
            context.boostAmount,
        );

        const carryDebtBoostRecipe = new dfs.Recipe('AaveV3BoostRecipeWithCarryDebtFL', [
            new dfs.actions.flashloan.AaveV3FlashLoanCarryDebtAction(
                [context.debtAsset.address],
                [context.boostAmount.toString()],
                [VARIABLE_RATE],
                wallet.address,
            ),
            new dfs.actions.basic.SellAction(exchangeData, wallet.address, wallet.address),
            new dfs.actions.aaveV3.AaveV3SupplyAction(
                false,
                context.marketAddr,
                '$2',
                wallet.address,
                context.collAsset.address,
                context.collReserveData.id,
                true,
                false,
                nullAddress,
            ),
            new dfs.actions.aaveV3.AaveV3DelegateCredit(
                false,
                context.marketAddr,
                MAX_UINT,
                VARIABLE_RATE,
                context.debtReserveData.id,
                flAaveV3CarryDebtAddress,
            ),
        ]);

        await expect(executeRecipe(carryDebtBoostRecipe)).to.be.reverted;
    });

    it('... should revert on carry-debt FL when delegation is slightly bigger than FL amount', async function () {
        const context = await getFirstValidPairContext();
        if (!context) this.skip();

        await openAaveV3ProxyPosition(
            senderAddr,
            wallet,
            context.collAsset.symbol,
            context.debtAsset.symbol,
            context.pair.collAmountInUSD,
            context.pair.debtAmountInUSD,
            context.marketAddr,
        );

        const exchangeData = await formatMockExchangeObjUsdFeed(
            context.debtAsset,
            context.collAsset,
            '$1',
            mockWrapper,
            context.boostAmount,
        );

        const carryDebtBoostRecipe = new dfs.Recipe('AaveV3BoostRecipeWithCarryDebtFL', [
            new dfs.actions.flashloan.AaveV3FlashLoanCarryDebtAction(
                [context.debtAsset.address],
                [context.boostAmount.toString()],
                [VARIABLE_RATE],
                wallet.address,
            ),
            new dfs.actions.basic.SellAction(exchangeData, wallet.address, wallet.address),
            new dfs.actions.aaveV3.AaveV3SupplyAction(
                false,
                context.marketAddr,
                '$2',
                wallet.address,
                context.collAsset.address,
                context.collReserveData.id,
                true,
                false,
                nullAddress,
            ),
            new dfs.actions.aaveV3.AaveV3DelegateCredit(
                false,
                context.marketAddr,
                context.boostAmount.add(slightExcessAmount(context.debtAsset)),
                VARIABLE_RATE,
                context.debtReserveData.id,
                flAaveV3CarryDebtAddress,
            ),
        ]);

        await expect(executeRecipe(carryDebtBoostRecipe)).to.be.reverted;
    });

    it('... should use carry-debt FL above half of available liquidity', async function () {
        const context = await getStressContext();
        if (!context) this.skip();

        await openAaveV3ProxyPosition(
            senderAddr,
            wallet,
            context.collAsset.symbol,
            context.debtAsset.symbol,
            context.stressOpenCollUsd,
            context.stressOpenDebtUsd,
            context.marketAddr,
        );

        const exchangeData = await formatMockExchangeObjUsdFeed(
            context.debtAsset,
            context.collAsset,
            '$1',
            mockWrapper,
            context.stressStandardPaybackAmount,
        );
        await setBalance(
            context.debtAsset.address,
            wallet.address,
            context.stressStandardFeeAmount.add(1),
        );

        const regularBoostRecipe = new dfs.Recipe('RegularAaveV3BoostRecipe', [
            new dfs.actions.flashloan.FLAction(
                new dfs.actions.flashloan.AaveV3FlashLoanAction(
                    [context.debtAsset.address],
                    [context.stressBoostAmount.toString()],
                    [AAVE_NO_DEBT_MODE],
                    nullAddress,
                ),
            ),
            new dfs.actions.basic.SellAction(exchangeData, wallet.address, wallet.address),
            new dfs.actions.aaveV3.AaveV3SupplyAction(
                false,
                context.marketAddr,
                '$2',
                wallet.address,
                context.collAsset.address,
                context.collReserveData.id,
                true,
                false,
                nullAddress,
            ),
            new dfs.actions.aaveV3.AaveV3BorrowAction(
                false,
                context.marketAddr,
                '$1',
                flActionAddress,
                VARIABLE_RATE,
                context.debtReserveData.id,
                false,
                nullAddress,
            ),
        ]);

        await expect(executeRecipe(regularBoostRecipe)).to.be.reverted;

        const carryDebtBoostRecipe = new dfs.Recipe('AaveV3BoostRecipeWithCarryDebtFL', [
            new dfs.actions.flashloan.AaveV3FlashLoanCarryDebtAction(
                [context.debtAsset.address],
                [context.stressBoostAmount.toString()],
                [VARIABLE_RATE],
                wallet.address,
            ),
            new dfs.actions.basic.SellAction(exchangeData, wallet.address, wallet.address),
            new dfs.actions.aaveV3.AaveV3SupplyAction(
                false,
                context.marketAddr,
                '$2',
                wallet.address,
                context.collAsset.address,
                context.collReserveData.id,
                true,
                false,
                nullAddress,
            ),
            new dfs.actions.aaveV3.AaveV3DelegateCredit(
                false,
                context.marketAddr,
                '$1',
                VARIABLE_RATE,
                context.debtReserveData.id,
                flAaveV3CarryDebtAddress,
            ),
        ]);

        await executeRecipe(carryDebtBoostRecipe);

        const allowance = await getBorrowAllowanceToCarryDebtFL(context);
        expect(allowance).to.be.eq(0);
    });
});
