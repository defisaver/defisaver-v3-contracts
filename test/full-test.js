const {
    resetForkToBlock,
} = require('./utils');
const { aaveFullTest } = require('./aave/aave-tests');
const { reflexerFullTest } = require('./reflexer/reflexer-tests');
const { balancerFullTest, balancerClaimTest } = require('./balancer/balancer-tests');
const { compoundFullTest } = require('./compound/comp-tests');
const { mcdFullTest } = require('./mcd/mcd-tests');
const { guniFullTest } = require('./guni/guni-tests');
const { rariFullTest } = require('./rari/rari-tests');
const { yearnFullTest } = require('./yearn/yearn-tests');
const { uniFullTest } = require('./uniswap/uni-tests');
const { uniV3FullTest, univ3CreatePoolTest } = require('./uniswap/v3/univ3-tests');
const { authFullTest } = require('./auth/auth-tests');
const { instaFullTest } = require('./insta/insta-tests');

const aaveTestLength = 2;
const compTestLength = 2;
const mcdTestLenght = 2;
const yearnTestLength = 2;

const hardcodedBlockTests = async () => {
    await balancerClaimTest();
    await univ3CreatePoolTest();
    // await instaFullTest();
};

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
        await authFullTest();

        await hardcodedBlockTests();
    });
});
