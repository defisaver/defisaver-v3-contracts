const hre = require('hardhat');
const {
    redeploy,
    setNewExchangeWrapper,
} = require('../utils');

const { dfsBuyTest } = require('./exchange-tests');

// TODO: check stuff like price and slippage
// TODO: can we make it work with 0x?

describe('Dfs-Buy', function () {
    this.timeout(400000);

    let senderAcc; let uniWrapper; let
        kyberWrapper; let uniV3Wrapper;

    before(async () => {
        await redeploy('DFSBuy');
        uniWrapper = await redeploy('UniswapWrapperV3');
        kyberWrapper = await redeploy('KyberWrapperV3');
        uniV3Wrapper = await redeploy('UniV3WrapperV3');

        senderAcc = (await hre.ethers.getSigners())[0];

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
        await setNewExchangeWrapper(senderAcc, kyberWrapper.address);
        await setNewExchangeWrapper(senderAcc, uniV3Wrapper.address);
    });
    it('... should check best price from DFSPrices contract', async () => {
        await dfsBuyTest();
    });
});
