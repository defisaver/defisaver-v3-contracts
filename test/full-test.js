const {
    takeSnapshot, setForkForTesting,
} = require('./utils');
const { aaveFullTest } = require('./aave/aave-tests');
const { reflexerFullTest } = require('./reflexer/reflexer-tests');

const aaveTestLength = 2;

describe('Run all DeFi Saver tests', async function () {
    this.timeout(10000000);

    before(async () => {
        setForkForTesting();
    });
    it('... should run all DeFi Saver tests', async () => {
        // await aaveFullTest(aaveTestLength, snapshot);
        await reflexerFullTest();
    });
});
