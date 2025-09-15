// AaveV3 Close strategies (CloseToColl/CloseToDebt with and without FL)

const runCloseTests = () => {
    describe('AaveV3 Close Strategies Tests', () => {
        it('... should execute AaveV3 EOA FL close-to-coll strategy for test pairs');
        it('... should execute AaveV3 EOA FL close-to-debt strategy for test pairs');
        it('... should execute AaveV3 SW FL close-to-coll strategy for test pairs');
        it('... should execute AaveV3 SW FL close-to-debt strategy for test pairs');
    });
};

module.exports = {
    runCloseTests,
};
