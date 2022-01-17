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
const { uniV3FullTest, univ3CreatePoolTest } = require('./uniswap/v3/univ3-tests');
const { authFullTest } = require('./auth/auth-tests');
const { instaFullTest } = require('./insta/insta-tests');
const { dfsRegistryControllerTest, utilsTestsFullTest } = require('./utils-test/utils-tests');
const { utilsActionsFullTest, automationV2UnsubTest, changeOwnerTest } = require('./utils-actions/utils-actions-tests');
const { fullFLTest } = require('./flashloan/fl-tests');
const { dfsExchangeFullTest } = require('./exchange/exchange-tests');
const { coreFullTest } = require('./core/core-tests');
const { uniFullTest } = require('./uniswap/v2/uni-tests');
const { lidoFullTest } = require('./lido/lido-tests');

const aaveTestLength = 2;
const compTestLength = 2;
const mcdTestLenght = 2;
const yearnTestLength = 2;

const specialTests = async () => {
    await dfsRegistryControllerTest();
    await changeOwnerTest();
    await balancerClaimTest();
    await univ3CreatePoolTest();
    await instaFullTest();
    await automationV2UnsubTest();
};

describe('Run all DeFi Saver tests', async function () {
    this.timeout(10000000);

    it('... should run all DeFi Saver tests', async () => {
        await resetForkToBlock();

        await coreFullTest();
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
        await lidoFullTest();
        await authFullTest();
        await utilsActionsFullTest();
        await utilsTestsFullTest();
        await fullFLTest();
        await dfsExchangeFullTest();

        await specialTests();
    });
});
