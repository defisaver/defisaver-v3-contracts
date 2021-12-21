const hre = require('hardhat');
const {
    setForkForTesting, resetForkToBlock,
} = require('./utils');
const { aaveFullTest } = require('./aave/aave-tests');
const { reflexerFullTest } = require('./reflexer/reflexer-tests');
const { balancerFullTest } = require('./balancer/balancer-tests');
const { compoundFullTest } = require('./compound/comp-tests');

const aaveTestLength = 2;
const compTestLength = 2;

describe('Run all DeFi Saver tests', async function () {
    this.timeout(10000000);

    it('... should run all DeFi Saver tests', async () => {
        await setForkForTesting();
        const blockNum = await hre.ethers.provider.getBlockNumber();
        await resetForkToBlock(blockNum - 10);

        await aaveFullTest(aaveTestLength);
        await reflexerFullTest();
        await compoundFullTest(compTestLength);
        await balancerFullTest();
    });
});
