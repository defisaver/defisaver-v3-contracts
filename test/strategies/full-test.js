const { resetForkToBlock } = require('../utils/utils');
const { compoundStrategiesTest } = require('./compound/compound-tests');
const { liquityStrategiesTest } = require('./liquity/liquity-tests');
const { mcdStrategiesTest } = require('./mcd/mcd-tests');
const { miscStrategiesTest } = require('./miscellaneous/misc-tests');

describe('Strategies full test', () => {
    it('... should do full Strategies test', async () => {
        await resetForkToBlock();
        await compoundStrategiesTest();
        await liquityStrategiesTest();
        await mcdStrategiesTest();
        await miscStrategiesTest();
    });
});
