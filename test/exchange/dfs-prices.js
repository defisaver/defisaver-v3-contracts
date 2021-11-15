const hre = require('hardhat');

const {
    redeploy,
    setNewExchangeWrapper,
    WETH_ADDRESS,
    UNI_ADDR,
} = require('../utils');

describe('Dfs-Prices', function () {
    this.timeout(140000);

    let senderAcc; let uniWrapper; let
        kyberWrapper; let uniV3Wrapper; let dfsPrices;

    before(async () => {
        uniWrapper = await redeploy('UniswapWrapperV3');
        kyberWrapper = await redeploy('KyberWrapperV3');
        uniV3Wrapper = await redeploy('UniV3WrapperV3');

        dfsPrices = await redeploy('DFSPrices');

        senderAcc = (await hre.ethers.getSigners())[0];

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
        await setNewExchangeWrapper(senderAcc, kyberWrapper.address);
        await setNewExchangeWrapper(senderAcc, uniV3Wrapper.address);
    });

    it('... should check best price from DFSPrices contract', async () => {
        const abiCoder = new hre.ethers.utils.AbiCoder();
        const REN_ADDR = '0x408e41876cccdc0f92210600ef50372656052a38';

        const amount = hre.ethers.utils.parseUnits('0.3', 18);
        const srcToken = UNI_ADDR;
        const destToken = REN_ADDR;
        const exchangeType = 1; // BUY

        const firstPath = srcToken;
        const secondPath = destToken;

        const kyberRes = await dfsPrices.callStatic.getExpectedRate(
            kyberWrapper.address,
            srcToken,
            destToken,
            amount,
            exchangeType,
            [],
        );

        console.log(`Kyber buy expected rate -> ${kyberRes.toString() / 1e18}`);

        const path = abiCoder.encode(['address[]'], [[secondPath, firstPath]]);
        const uniRes = await dfsPrices.callStatic.getExpectedRate(
            uniWrapper.address,
            srcToken,
            destToken,
            amount,
            exchangeType,
            path,
        );

        console.log(`UniV2 buy expected rate -> ${uniRes.toString() / 1e18}`);

        const additionalData = hre.ethers.utils.solidityPack(['address', 'uint24', 'address', 'uint24', 'address'], [REN_ADDR, 3000, WETH_ADDRESS, 10000, UNI_ADDR]);
        const uniV3Res = await dfsPrices.callStatic.getExpectedRate(
            uniV3Wrapper.address,
            srcToken,
            destToken,
            amount,
            exchangeType,
            additionalData,
        );

        console.log(`UniV3 buy expected rate -> ${uniV3Res.toString() / 1e18}`);
    });
});
