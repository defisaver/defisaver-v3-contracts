/* eslint-disable max-len */
const hre = require('hardhat');
const {
    getContractFromRegistry,
    openStrategyAndBundleStorage,
} = require('./utils');
const {
    createLiquityV2RepayStrategy,
    createLiquityV2FLRepayStrategy,
    createLiquityV2BoostStrategy,
    createLiquityV2FLBoostStrategy,
    createLiquityV2FLBoostWithCollStrategy,
    createLiquityV2CloseToCollStrategy,
    createLiquityV2FLCloseToCollStrategy,
    createLiquityV2FLCloseToDebtStrategy,
    createLiquityV2BoostOnPriceStrategy,
    createLiquityV2FLBoostOnPriceStrategy,
    createLiquityV2RepayOnPriceStrategy,
    createLiquityV2FLRepayOnPriceStrategy,
    createLiquityV2FLBoostWithCollOnPriceStrategy,
    createLiquityV2PaybackFromSPStrategy,
} = require('../../strategies-spec/mainnet');
const { createStrategy, createBundle } = require('../strategies/utils/utils-strategies');

const CollActionType = { SUPPLY: 0, WITHDRAW: 1 };
const DebtActionType = { PAYBACK: 0, BORROW: 1 };

const getLiquityV2Hints = async (market, collIndex, interestRate, isFork = false) => {
    const marketContract = await hre.ethers.getContractAt('IAddressesRegistry', market);
    const sortedTrovesAddr = await marketContract.sortedTroves();
    const sortedTrovesContract = await hre.ethers.getContractAt('contracts/interfaces/liquityV2/ISortedTroves.sol:ISortedTroves', sortedTrovesAddr);
    const trovesSize = await sortedTrovesContract.getSize();
    if (trovesSize <= 2) {
        return { upperHint: 0, lowerHint: 0 };
    }
    const numTrials = Math.floor(15 * Math.sqrt(trovesSize));
    const seed = 42;

    const viewContract = await getContractFromRegistry('LiquityV2View', isFork);
    const { upperHint, lowerHint } = await viewContract.getInsertPosition(
        market,
        collIndex,
        interestRate,
        numTrials,
        seed,
    );

    return { upperHint, lowerHint };
};

const getLiquityV2MaxUpfrontFee = async (
    market,
    collIndex,
    borrowAmount,
    interestRate,
    batchManager = hre.ethers.constants.AddressZero,
) => {
    const marketContract = await hre.ethers.getContractAt('IAddressesRegistry', market);
    const hintHelpersAddr = await marketContract.hintHelpers();
    const hintHelpersContract = await hre.ethers.getContractAt('contracts/interfaces/liquityV2/IHintHelpers.sol:IHintHelpers', hintHelpersAddr);

    if (batchManager !== hre.ethers.constants.AddressZero) {
        const fee = await hintHelpersContract.predictOpenTroveAndJoinBatchUpfrontFee(
            collIndex,
            borrowAmount,
            batchManager,
        );
        return fee;
    }
    const fee = await hintHelpersContract.predictOpenTroveUpfrontFee(
        collIndex,
        borrowAmount,
        interestRate,
    );
    return fee;
};

const getLiquityV2AdjustBorrowMaxUpfrontFee = async (
    market,
    collIndex,
    troveId,
    debtIncrease,
) => {
    const marketContract = await hre.ethers.getContractAt('IAddressesRegistry', market);
    const hintHelpersAddr = await marketContract.hintHelpers();
    const hintHelpersContract = await hre.ethers.getContractAt('contracts/interfaces/liquityV2/IHintHelpers.sol:IHintHelpers', hintHelpersAddr);

    const fee = await hintHelpersContract.predictAdjustTroveUpfrontFee(
        collIndex,
        troveId,
        debtIncrease,
    );
    return fee;
};

const getLiquityV2TestPairs = async () => [
    {
        market: '0x38e1f07b954cfab7239d7acab49997fbaad96476',
        supplyTokenSymbol: 'WETH',
        collIndex: 0,
    },
    {
        market: '0x2d4ef56cb626e9a4c90c156018ba9ce269573c61',
        supplyTokenSymbol: 'wstETH',
        collIndex: 1,
    },
];

const deployLiquityV2RepayBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const repayStrategy = createLiquityV2RepayStrategy();
    const flRepayStrategy = createLiquityV2FLRepayStrategy();
    const repayStrategyId = await createStrategy(...repayStrategy, true);
    const flRepayStrategyId = await createStrategy(...flRepayStrategy, true);
    const bundleId = await createBundle([repayStrategyId, flRepayStrategyId]);
    return bundleId;
};

const deployLiquityV2BoostBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const boostStrategy = createLiquityV2BoostStrategy();
    const flBoostStrategy = createLiquityV2FLBoostStrategy();
    const flBoostWithCollStrategy = createLiquityV2FLBoostWithCollStrategy();
    const boostStrategyId = await createStrategy(...boostStrategy, true);
    const flBoostStrategyId = await createStrategy(...flBoostStrategy, true);
    const flBoostWithCollStrategyId = await createStrategy(...flBoostWithCollStrategy, true);
    const bundleId = await createBundle(
        [boostStrategyId, flBoostStrategyId, flBoostWithCollStrategyId],
    );
    return bundleId;
};

const deployLiquityV2CloseBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);

    const closeToCollateral = createLiquityV2CloseToCollStrategy();
    const closeToCollateralStrategyId = await createStrategy(...closeToCollateral, false);

    const flCloseToCollateral = createLiquityV2FLCloseToCollStrategy();
    const flCloseToCollateralStrategyId = await createStrategy(...flCloseToCollateral, false);

    const flCloseToDebt = createLiquityV2FLCloseToDebtStrategy();
    const flCloseToDebtStrategyId = await createStrategy(...flCloseToDebt, false);

    const bundleId = await createBundle(
        [
            closeToCollateralStrategyId,
            flCloseToCollateralStrategyId,
            flCloseToDebtStrategyId,
        ],
    );
    return bundleId;
};

const deployLiquityV2BoostOnPriceBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);

    const liquityV2BoostOnPriceStrategy = createLiquityV2BoostOnPriceStrategy();
    const liquityV2BoostOnPriceStrategyId = await createStrategy(...liquityV2BoostOnPriceStrategy, false);

    const liquityV2FLBoostOnPriceStrategy = createLiquityV2FLBoostOnPriceStrategy();
    const liquityV2FLBoostOnPriceStrategyId = await createStrategy(...liquityV2FLBoostOnPriceStrategy, false);

    const liquityV2FLBoostWithCollOnPriceStrategy = createLiquityV2FLBoostWithCollOnPriceStrategy();
    const liquityV2FLBoostWithCollOnPriceStrategyId = await createStrategy(...liquityV2FLBoostWithCollOnPriceStrategy, false);

    const bundleId = await createBundle(
        [
            liquityV2BoostOnPriceStrategyId,
            liquityV2FLBoostOnPriceStrategyId,
            liquityV2FLBoostWithCollOnPriceStrategyId,
        ],
    );
    return bundleId;
};

const deployLiquityV2RepayOnPriceBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const liquityV2RepayOnPriceStrategy = createLiquityV2RepayOnPriceStrategy();
    const liquityV2RepayOnPriceStrategyId = await createStrategy(...liquityV2RepayOnPriceStrategy, false);

    const liquityV2FLRepayOnPriceStrategy = createLiquityV2FLRepayOnPriceStrategy();
    const liquityV2FLRepayOnPriceStrategyId = await createStrategy(...liquityV2FLRepayOnPriceStrategy, false);

    const bundleId = await createBundle(
        [
            liquityV2RepayOnPriceStrategyId,
            liquityV2FLRepayOnPriceStrategyId,
        ],
    );
    return bundleId;
};

const deployLiquityV2PaybackFromSPStrategy = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);

    const liquityV2PaybackFromSPStrategy = createLiquityV2PaybackFromSPStrategy();
    const liquityV2PaybackFromSPStrategyId = await createStrategy(...liquityV2PaybackFromSPStrategy, true);

    return liquityV2PaybackFromSPStrategyId;
};

module.exports = {
    getLiquityV2Hints,
    getLiquityV2MaxUpfrontFee,
    getLiquityV2AdjustBorrowMaxUpfrontFee,
    getLiquityV2TestPairs,
    deployLiquityV2RepayBundle,
    deployLiquityV2BoostBundle,
    deployLiquityV2CloseBundle,
    deployLiquityV2BoostOnPriceBundle,
    deployLiquityV2RepayOnPriceBundle,
    deployLiquityV2PaybackFromSPStrategy,
    CollActionType,
    DebtActionType,
};
