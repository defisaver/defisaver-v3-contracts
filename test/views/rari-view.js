const {
    redeploy,
    DAI_ADDR,
    USDC_ADDR,
} = require('../utils');

const rariFundProxyDai = '0x7C332FeA58056D1EF6aB2B2016ce4900773DC399';
const rariFundControllerDai = '0xaFD2AaDE64E6Ea690173F6DE59Fc09F5C9190d74';

const rariFundProxyUsdc = '0x4a785FA6fcD2E0845a24847Beb7Bddd26F996D4d';
const rariFundControllerUsdc = '0x66f4856f1bbd1eb09e1c8d9d646f5a3a193da569';

describe('Rari-view', function () {
    this.timeout(180000);

    let rariView;

    before(async () => {
        rariView = await redeploy('RariView');
    });

    it('... should get rari DAI pool liquidity', async () => {
        const res = await rariView.callStatic.getPoolLiquidity(
            DAI_ADDR,
            rariFundProxyDai,
            rariFundControllerDai,
        );

        console.log(`Dai liquidity: ${res.toString() / 1e18}`);
    });

    it('... should get rari USDC pool liquidity', async () => {
        const res = await rariView.callStatic.getPoolLiquidity(
            USDC_ADDR,
            rariFundProxyUsdc,
            rariFundControllerUsdc,
            { gasLimit: 3_000_000 },
        );

        console.log(`Usdc liquidity: ${res.toString() / 1e6}`);
    });
});
