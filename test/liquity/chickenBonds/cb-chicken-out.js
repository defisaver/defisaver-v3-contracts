const { cbChickenOutTest } = require('./chicken-bonds-tests');
const { redeploy } = require('../../utils');

describe('CB-Chicken-Out', () => {
    before(async () => {
        await redeploy('CBCreate');
        await redeploy('CBChickenOut');
    });

    it('... should test chicken out of a bond', async () => {
        await cbChickenOutTest();
    });
});
