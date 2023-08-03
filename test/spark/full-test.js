const { sparkFullTest } = require('./spark-tests');

describe('Spark full test', () => {
    it('... should do full Spark test', async () => {
        await sparkFullTest();
    });
});
