const { cbChickenInTest } = require('./chicken-bonds-tests');
const { redeploy } = require('../../utils');

describe('CB-Chicken-In', () => {
    before(async () => {
        await redeploy('CBCreate');
        await redeploy('CBChickenIn');
    });

    it('... should test chicken in of a bond', async () => {
        await cbChickenInTest();
    });
});
