const { redeploy } = require('../utils/utils');

describe('Sky-view', function () {
    this.timeout(180000);

    let skyView;
    // const random0 = '0xe34eb31bfd2afea4320b1ce0d1b8ae943afac425';
    // const random1 = '0xEA8aa8Ed99134E8EfE85E593c6cF1AC91580b606';
    // const random2 = '0xe34eb31BfD2afEa4320b1ce0D1B8Ae943aFaC425';
    const random3 = '0xA4C39Bc895E380e0B54f9b1c952c3bC151cf6FB2';
    const random4 = '0x9ccf93089cb14f94baeb8822f8ceffd91bd71649';

    before(async () => {
        skyView = await redeploy('SkyView');
    });

    it('... should get SKY User info', async () => {
        const res = await skyView.callStatic.getUserInfo(random4);
        console.log(res);
    });

    it('... should get general info for Sky Staking', async () => {
        const res = await skyView.callStatic.getGeneralInfo();
        console.log(res);
    });
});
