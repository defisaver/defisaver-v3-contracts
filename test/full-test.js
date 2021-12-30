const {
    resetForkToBlock,
} = require('./utils');
const { aaveFullTest } = require('./aave/aave-tests');
const { reflexerFullTest } = require('./reflexer/reflexer-tests');
const { balancerFullTest } = require('./balancer/balancer-tests');
const { compoundFullTest } = require('./compound/comp-tests');
const { mcdFullTest } = require('./mcd/mcd-tests');
const { guniFullTest } = require('./guni/guni-tests');
const { rariFullTest } = require('./rari/rari-tests');
const { yearnFullTest } = require('./yearn/yearn-tests');
const { uniFullTest } = require('./uniswap/uni-tests');
const { uniV3FullTest } = require('./uniswap/v3/univ3-tests');

const aaveTestLength = 2;
const compTestLength = 2;
const mcdTestLenght = 2;
const yearnTestLength = 2;

describe('Run all DeFi Saver tests', async function () {
    this.timeout(10000000);

    it('... should run all DeFi Saver tests', async () => {
        await resetForkToBlock();

        await aaveFullTest(aaveTestLength);
        await reflexerFullTest();
        await compoundFullTest(compTestLength);
        await mcdFullTest(mcdTestLenght);
        await guniFullTest();
        await rariFullTest();
        await yearnFullTest(yearnTestLength);
        await uniFullTest();
        await balancerFullTest();

        await uniV3FullTest();
    });
});
