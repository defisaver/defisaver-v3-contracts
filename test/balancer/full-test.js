const { resetForkToBlock } = require('../utils');
const { balancerFullTest } = require('./balancer-tests');

describe('Balancer full test', () => {
    it('... should do full Balancer test', async () => {
        await resetForkToBlock();
        await balancerFullTest();
    });
});
