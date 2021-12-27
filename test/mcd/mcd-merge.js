const { ilks } = require('@defisaver/tokens');
const {
    redeploy,
} = require('../utils');

const { mcdMergeTest } = require('./mcd-tests');

describe('Mcd-Merge', () => {
    before(async () => {
        await redeploy('McdOpen');
        await redeploy('McdSupply');
        await redeploy('McdGenerate');
        await redeploy('McdMerge');
        await redeploy('McdView');
    });

    it('... should merge two Maker vaults', async () => {
        await mcdMergeTest(ilks.length);
    }).timeout(50000);
});
