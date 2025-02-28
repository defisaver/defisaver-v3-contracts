const {
    createFlCompV3RepayStrategy,
    createCompV3FlBoostStrategy,
    createFlCompV3EOARepayStrategy,
    createCompV3EOAFlBoostStrategy,
} = require('./strategies');

const { createStrategy, createBundle } = require('./utils-strategies');

const getSupportedAssets = async (compV3View) => {
    const assets = await compV3View.getAssets();
    return assets;
};

const createNewCompV3AutomationBundles = async () => {
    // existing strategies
    const existingCompV3RepayStrategyId = 15;
    const existingCompV3BoostStrategyId = 19;
    const existingCompV3EOARepayStrategyId = 23;
    const existingCompV3EOABoostStrategyId = 27;

    // encode new strategies with FLBalancer replaced with FLAction
    const compV3RepayFLStrategyEncoded = createFlCompV3RepayStrategy();
    const compV3BoostFLStrategyEncoded = createCompV3FlBoostStrategy();
    const compV3EOARepayFLStrategyEncoded = createFlCompV3EOARepayStrategy();
    const compV3EOABoostFLStrategyEncoded = createCompV3EOAFlBoostStrategy();

    // create new strategies
    const newRepayFLStrategyId = await createStrategy(...compV3RepayFLStrategyEncoded, true);
    const newBoostFLStrategyId = await createStrategy(...compV3BoostFLStrategyEncoded, true);
    const newRepayEOAFLStrategyId = await createStrategy(...compV3EOARepayFLStrategyEncoded, true);
    const newBoostEOAFLStrategyId = await createStrategy(...compV3EOABoostFLStrategyEncoded, true);

    // create new bundles
    const repayBundleId = await createBundle(
        [existingCompV3RepayStrategyId, newRepayFLStrategyId],
    );
    const boostBundleId = await createBundle(
        [existingCompV3BoostStrategyId, newBoostFLStrategyId],
    );
    const repayBundleEOAId = await createBundle(
        [existingCompV3EOARepayStrategyId, newRepayEOAFLStrategyId],
    );
    const boostBundleEOAId = await createBundle(
        [existingCompV3EOABoostStrategyId, newBoostEOAFLStrategyId],
    );

    console.log(`Repay bundle id: ${repayBundleId}`);
    console.log(`Boost bundle id: ${boostBundleId}`);
    console.log(`Repay EOA bundle id: ${repayBundleEOAId}`);
    console.log(`Boost EOA bundle id: ${boostBundleEOAId}`);

    return {
        repayBundleId, boostBundleId, repayBundleEOAId, boostBundleEOAId,
    };
};

module.exports = {
    getSupportedAssets,
    createNewCompV3AutomationBundles,
};
