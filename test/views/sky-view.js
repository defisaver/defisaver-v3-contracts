const { redeploy } = require('../utils/utils');

describe('Sky-view', function () {
    this.timeout(180000);

    let skyView;
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
