const {
    redeploy,
} = require('../utils');

const user = '0x7d790D3fca1232e6D7D7643cAD2b27951E20378A';

describe('Comp-view', function () {
    this.timeout(80000);

    let compRewardView;

    before(async () => {
        compRewardView = await redeploy('CompRewardView');
    });

    it('... should get comp balance', async () => {
        const res = await compRewardView.callStatic.getBalance(user, ['0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5', '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643', '0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e', '0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407', '0x39aa39c021dfbae8fac545936693ac917d5e7563', '0xccf4429db6322d5c611ee964527d42e5d685dd6a', '0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9', '0xface851a4921ce59e912d19329929ce6da6eb0c7', '0x35a18000230da775cac24873d00ff85bccded550', '0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4']);

        console.log(res.toString());
    });
});
