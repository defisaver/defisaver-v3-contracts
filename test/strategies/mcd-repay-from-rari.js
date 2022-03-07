const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    approve,
    setBalance,
    balanceOf,
    getAddrFromRegistry,
    redeployCore,
    openStrategyAndBundleStorage,
    DAI_ADDR,
    rariDaiFundManager,
    rariUsdcFundManager,
    rdptAddress,
    rsptAddress,
    USDC_ADDR,
} = require('../utils');

const {
    createStrategy,
    createBundle,
    addBotCaller,
    setMCDPriceVerifier,
} = require('../utils-strategies');

const { getRatio } = require('../utils-mcd');

const { createRariRepayStrategy, createRariRepayStrategyWithExchange } = require('../strategies');

const { callMcdRepayFromRariStrategy, callMcdRepayFromRariStrategyWithExchange } = require('../strategy-calls');
const { subRepayFromSavingsStrategy } = require('../strategy-subs');

const { openVault, rariDeposit } = require('../actions');

describe('Mcd-Repay-Rari-Strategy', function () {
    this.timeout(1200000);

    let senderAcc;
    let proxy;
    let botAcc;
    let strategyExecutor;
    let subId;
    let vaultId;
    let mcdView;
    let mcdRatioTriggerAddr;
    let strategySub;
    // let rariView;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        mcdView = await redeploy('McdView');

        mcdRatioTriggerAddr = getAddrFromRegistry('McdRatioTrigger');
        strategyExecutor = await redeployCore();
        await addBotCaller(botAcc.address);

        await setMCDPriceVerifier(mcdRatioTriggerAddr);

        proxy = await getProxy(senderAcc.address);
    });

    it('... should sub the user to a repay bundle ', async () => {
        const repayStrategyEncoded = createRariRepayStrategy();
        const flRepayStrategyEncoded = createRariRepayStrategyWithExchange();

        await openStrategyAndBundleStorage();

        const strategyId1 = await createStrategy(proxy, ...repayStrategyEncoded, true);
        const strategyId2 = await createStrategy(proxy, ...flRepayStrategyEncoded, true);

        const bundleId = await createBundle(proxy, [strategyId1, strategyId2]);

        // create vault
        vaultId = await openVault(
            proxy,
            'ETH-A',
            fetchAmountinUSDPrice('WETH', '60000'),
            fetchAmountinUSDPrice('DAI', '30000'),
        );

        console.log('Vault id: ', vaultId);

        const daiAmount = hre.ethers.utils.parseUnits('5000', 18);
        await setBalance(DAI_ADDR, senderAcc.address, daiAmount);
        await approve(DAI_ADDR, proxy.address);

        await rariDeposit(
            rariDaiFundManager,
            DAI_ADDR,
            rdptAddress,
            daiAmount,
            senderAcc.address,
            proxy.address,
            proxy,
        );

        // Deposit some usdc in yearn
        const usdcAmount = hre.ethers.utils.parseUnits('5000', 6);

        await setBalance(USDC_ADDR, senderAcc.address, usdcAmount);
        await approve(USDC_ADDR, proxy.address);

        await rariDeposit(
            rariUsdcFundManager,
            USDC_ADDR,
            rsptAddress,
            usdcAmount,
            senderAcc.address,
            proxy.address,
            proxy,
        );

        const ratioUnder = hre.ethers.utils.parseUnits('3', '18');
        const targetRatio = hre.ethers.utils.parseUnits('3.2', '18');

        ({ subId, strategySub } = await subRepayFromSavingsStrategy(
            proxy, bundleId, vaultId, ratioUnder, targetRatio, true,
        ));
    });

    it('... should trigger a maker repay from rari strategy', async () => {
        const ratioBefore = await getRatio(mcdView, vaultId);

        const repayAmount = hre.ethers.utils.parseUnits('5000', 18);
        const poolAmount = await balanceOf(rdptAddress, proxy.address);

        await callMcdRepayFromRariStrategy(
            // eslint-disable-next-line max-len
            botAcc, strategyExecutor, 0, subId, strategySub, poolAmount, repayAmount,
        );

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioAfter).to.be.gt(ratioBefore);
    });

    it('... should trigger a maker repay from rari with exchange strategy', async () => {
        const ratioBefore = await getRatio(mcdView, vaultId);

        const repayAmount = hre.ethers.utils.parseUnits('5000', 6);
        const poolAmount = await balanceOf(rsptAddress, proxy.address);

        await callMcdRepayFromRariStrategyWithExchange(
            // eslint-disable-next-line max-len
            botAcc, strategyExecutor, 1, subId, strategySub, poolAmount, repayAmount,
        );

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioAfter).to.be.gt(ratioBefore);
    });
});
