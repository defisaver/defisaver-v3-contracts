const { ilks } = require('@defisaver/tokens');
const {
    redeploy,
} = require('../utils');

const { mcdMergeTest } = require('./mcd-tests');

describe('Mcd-Merge', () => {
    before(async () => {
        await redeploy('McdSupply');
        await redeploy('McdGenerate');
        await redeploy('McdMerge');
        const mcdView = await redeploy('McdView');
        console.log(mcdView);
    });

    it('... should merge two Maker vaults', async () => {
        await mcdMergeTest(ilks.length);
    }).timeout(50000);
});
