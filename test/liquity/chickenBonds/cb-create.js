const { cbCreateTest } = require('./chicken-bonds-tests');
const { redeploy } = require('../../utils');

describe('CB-Create', () => {
    before(async () => {
        await redeploy('CBCreate');
    });

    it('... should test creation of a chicken bond', async () => {
        await cbCreateTest();
    });
});
