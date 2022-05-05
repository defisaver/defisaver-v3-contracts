const {
    redeploy, DAI_ADDR, WETH_ADDRESS, ETH_ADDR, STETH_ADDRESS, WSTETH_ADDRESS,
} = require('../utils');

const BITCOIN_ADDR = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
const names = ['DAI', 'WETH', 'ETH', 'BTC', 'STETH', 'WSTETH'];

const tokens = [DAI_ADDR, WETH_ADDRESS, ETH_ADDR, BITCOIN_ADDR, STETH_ADDRESS, WSTETH_ADDRESS];

describe('ChainLink-price-trigger', function () {
    this.timeout(80000);

    let chainLinkPriceTrigger;

    before(async () => {
        chainLinkPriceTrigger = await redeploy('ChainLinkPriceTrigger');
    });

    it('... should get price from chainlink from different assets', async () => {
        for (let i = 0; i < tokens.length; ++i) {
            // eslint-disable-next-line no-await-in-loop
            const price = await chainLinkPriceTrigger.getPrice(tokens[i]);
            console.log(names[i], ':', price / 1e8);
        }
    });
});
