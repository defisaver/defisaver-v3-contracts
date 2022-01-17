const { ilks } = require('@defisaver/tokens');
const { mcdFullTest } = require('./mcd-tests');

describe('Maker full test', () => {
    it('... should do full Maker test', async () => {
        await mcdFullTest(ilks.length);
    });
});
