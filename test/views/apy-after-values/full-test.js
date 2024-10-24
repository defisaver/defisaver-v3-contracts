const { getEulerV2TestPairs } = require('../../eulerV2/utils');
const { aaveV2ApyAfterValuesTest } = require('./test-aaveV2-apy');
const { aaveV3ApyAfterValuesTest } = require('./test-aaveV3-apy');
const { compV2ApyAfterValuesTest } = require('./test-compV2-apy');
const { eulerV2ApyAfterValuesTest } = require('./test-eulerV2-apy');
const { morphoBlueApyAfterValuesTest } = require('./test-morpho-blue-apy');
const { sparkApyAfterValuesTest } = require('./test-spark-apy');

describe('Apy-after-values', () => {
    it('... should test AaveV2 APY after values', async () => {
        await aaveV2ApyAfterValuesTest();
    });
    it('... should test AaveV3 APY after values', async () => {
        await aaveV3ApyAfterValuesTest();
    });
    it('... should test CompV2 APY after values', async () => {
        await compV2ApyAfterValuesTest();
    });
    it('... should test Morpho Blue APY after values', async () => {
        await morphoBlueApyAfterValuesTest();
    });
    it('... should test Spark APY after values', async () => {
        await sparkApyAfterValuesTest();
    });
    it('... should test EulerV2 APY after values', async () => {
        const supplyAmountInUsd = '50000';
        const borrowAmountInUsd = '25000';
        const testPairs = await getEulerV2TestPairs(supplyAmountInUsd, borrowAmountInUsd);
        await eulerV2ApyAfterValuesTest(testPairs);
    });
});
