const { redeploy } = require('../utils/utils');

describe('LiquityV2DebtInFrontTrigger', () => {
    let trigger;
    const WETH_MARKET_ADDR = '0x20F7C9ad66983F6523a0881d0f82406541417526';
    const WSTETH_MARKET_ADDR = '0x8d733F7ea7c23Cbea7C613B6eBd845d46d3aAc54';
    const RETH_MARKET_ADDR = '0x6106046F031a22713697e04C08B330dDaf3e8789';

    before(async () => {
        trigger = await redeploy('LiquityV2DebtInFrontTrigger');
    });

    it('test debt in front for live troves', async () => {
        console.log('first WETH trove:', await trigger.getDebtInFront(WETH_MARKET_ADDR, '108944359109208165624092356986168793957147284372283522328459696677773946197825'));
        console.log('second WETH trove:', await trigger.getDebtInFront(WETH_MARKET_ADDR, '102247037494986730506041632222868001124387697185626929998095238518734059870154'));

        console.log('first WSTETH trove:', await trigger.getDebtInFront(WSTETH_MARKET_ADDR, '26244146308537641262439670569871691678767189479044609337562239650880434266541'));
        console.log('second WSTETH trove:', await trigger.getDebtInFront(WSTETH_MARKET_ADDR, '75612223830594747844811694143670180236762873742227582769905911215507573448955'));

        console.log('first RETH trove:', await trigger.getDebtInFront(RETH_MARKET_ADDR, '75612223830594747844811694143670180236762873742227582769905911215507573448955'));
        console.log('second RETH trove:', await trigger.getDebtInFront(RETH_MARKET_ADDR, '25048764505723750848412142899070275197324445056419529315520539466064949999115'));
    });
});
