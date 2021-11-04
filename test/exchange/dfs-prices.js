const hre = require('hardhat');

const {
    redeploy,
    setNewExchangeWrapper,
    WETH_ADDRESS,
    DAI_ADDR,
} = require('../utils');

describe('Dfs-Prices', function () {
    this.timeout(40000);

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

        const amount = hre.ethers.utils.parseUnits('0.3', 18);
        const srcToken = WETH_ADDRESS;
        const destToken = DAI_ADDR;
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

        const path = abiCoder.encode(['address[]'], [[firstPath, secondPath]]);
        const uniRes = await dfsPrices.callStatic.getExpectedRate(
            uniWrapper.address,
            srcToken,
            destToken,
            amount,
            exchangeType,
            path,
        );

        const uniV3fee = 3000;
        const additionalData = hre.ethers.utils.solidityPack(['address', 'uint24', 'address'], [secondPath, uniV3fee, firstPath]);
        const uniV3Res = await dfsPrices.callStatic.getExpectedRate(
            uniV3Wrapper.address,
            srcToken,
            destToken,
            amount,
            exchangeType,
            additionalData,
        );

        console.log(`Kyber buy expected rate -> ${kyberRes.toString() / 1e18}`);
        console.log(`UniV2 buy expected rate -> ${uniRes.toString() / 1e18}`);
        console.log(`UniV3 buy expected rate -> ${uniV3Res.toString() / 1e18}`);
    });
});
