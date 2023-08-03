const hre = require('hardhat');
const {
    redeploy,
} = require('../utils');

const {
    aaveFlTest, balancerFLTest, makerFLTest, aaveV3FlTest,
    ghoFLTest, sparkFlTest, uniswapV3FlashloanTest,
} = require('./fl-tests');

describe('Generalised flashloan test', function () {
    this.timeout(60000);

    before(async () => {
        await redeploy('FLAction');
    });

    it('... should test generalised flash loan', async () => {
        const network = hre.network.config.name;
        if (network === 'mainnet') {
            await aaveFlTest(true);
            await makerFLTest(true);
            await ghoFLTest(true);
            await sparkFlTest(true);
            await uniswapV3FlashloanTest(true);
        }

        await balancerFLTest(true);
        await aaveV3FlTest(true);
    });
});
