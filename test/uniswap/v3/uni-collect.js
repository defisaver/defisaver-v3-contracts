/* eslint-disable no-await-in-loop */
const {
    redeploy,
} = require('../../utils');

const { uniV3CollectTest } = require('./univ3-tests');

describe('Uni-Mint-V3', () => {
    before(async () => {
        await redeploy('UniMintV3');
        await redeploy('UniSupplyV3');
        await redeploy('UniCollectV3');
    });

    it('... should only collect tokens owed from position on uniswap V3', async () => {
        await uniV3CollectTest();
    }).timeout(50000);
});
