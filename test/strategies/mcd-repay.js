const hre = require('hardhat');

const {
    getProxy,
    redeploy,
} = require('../utils');

const {
    subTemplate,
    // subStrategy,
} = require('../utils-strategies.js');

describe('Mcd-Repay', function () {
    this.timeout(80000);

    let senderAcc; let proxy;

    before(async () => {
        await redeploy('McdRatioTrigger');
        await redeploy('McdWithdraw');
        await redeploy('DFSSell');
        await redeploy('McdPayback');
        await redeploy('SubscriptionProxy');

        senderAcc = (await hre.ethers.getSigners())[0];
        // eslint-disable-next-line no-unused-vars
        proxy = await getProxy(senderAcc.address);
    });

    it('... should make a new strategy', async () => {
        const name = 'McdRepayTemplate';
        const triggerIds = ['McdRatioTrigger'];
        const actionIds = ['McdWithdraw', 'DFSSell', 'McdPayback'];
        const paramMapping = [[0, 0, 0, 0], [0, 0, 1, 0, 0], [0, 2, 0]];

        await subTemplate(name, triggerIds, actionIds, paramMapping);

        // const templates = await subContract.getTemplates();
        // console.log(templates);
        // const triggerData = await createMcdTrigger();

        // await subStrategy(templateId, true, [], [triggerData]);
    });
});
