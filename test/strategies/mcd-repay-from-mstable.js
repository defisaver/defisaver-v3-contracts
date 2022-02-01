const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    approve,
    DAI_ADDR,
    setBalance,
    USDC_ADDR,
} = require('../utils');

const {
    createStrategy,
    addBotCaller,
    setMCDPriceVerifier,
    createBundle,
} = require('../utils-strategies');

const {
    mUSD,
    imUSD,
    imUSDVault,
    AssetPair,
} = require('../utils-mstable');

const { getRatio } = require('../utils-mcd');

const { callMcdRepayFromMstableStrategy, callMcdRepayFromMstableWithExchangeStrategy } = require('../strategy-calls');
const { subRepayFromSavingsStrategy } = require('../strategy-subs');
const { createMstableRepayStrategy, createMstableRepayStrategyWithExchange } = require('../strategies');

const { openVault, mStableDeposit } = require('../actions');

describe('Mcd-Repay-Mstable-Strategy', function () {
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
    // let mstableView;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        await redeploy('BotAuth');
        await redeploy('ProxyAuth');
        mcdRatioTriggerAddr = (await redeploy('McdRatioTrigger')).address;
        await redeploy('DFSSell');
        await redeploy('StrategyStorage');
        await redeploy('SubStorage');
        await redeploy('BundleStorage');

        mcdView = await redeploy('McdView');

        await redeploy('SubProxy');
        await redeploy('StrategyProxy');
        await redeploy('RecipeExecutor');
        await redeploy('GasFeeTaker');
        strategyExecutor = await redeploy('StrategyExecutor');

        await redeploy('McdSupply');
        await redeploy('McdWithdraw');
        await redeploy('McdGenerate');
        await redeploy('McdPayback');
        await redeploy('McdOpen');
        await redeploy('MStableDeposit');
        await redeploy('MStableWithdraw');

        // mstableView = await redeploy('MStableView');
        await addBotCaller(botAcc.address);

        await setMCDPriceVerifier(mcdRatioTriggerAddr);

        proxy = await getProxy(senderAcc.address);
    });

    it('... should create repay strategy using mstable funds', async () => {
        const repayStrategyEncoded = createMstableRepayStrategy();
        const repayStrategyWithExchangeEncoded = createMstableRepayStrategyWithExchange();

        await createStrategy(proxy, ...repayStrategyEncoded, true);
        await createStrategy(proxy, ...repayStrategyWithExchangeEncoded, true);

        await createBundle(proxy, [0, 1]);
    });

    it('... should sub the user to a repay bundle ', async () => {
        // create vault
        vaultId = await openVault(
            proxy,
            'ETH-A',
            fetchAmountinUSDPrice('WETH', '60000'),
            fetchAmountinUSDPrice('DAI', '30000'),
        );

        console.log('Vault id: ', vaultId);

        // Deposit money to mstable
        const daiAmount = hre.ethers.utils.parseUnits('10000', 18);

        await setBalance(DAI_ADDR, senderAcc.address, daiAmount);
        await approve(DAI_ADDR, proxy.address);

        await mStableDeposit(
            proxy,
            DAI_ADDR,
            mUSD,
            imUSD,
            imUSDVault,
            senderAcc.address,
            proxy.address,
            daiAmount,
            0,
            AssetPair.BASSET_IMASSETVAULT,
        );

        // Deposit some usdc in yearn
        const usdcAmount = hre.ethers.utils.parseUnits('5000', 6);

        await setBalance(USDC_ADDR, senderAcc.address, usdcAmount);
        await approve(USDC_ADDR, proxy.address);

        await mStableDeposit(
            proxy,
            USDC_ADDR,
            mUSD,
            imUSD,
            imUSDVault,
            senderAcc.address,
            proxy.address,
            usdcAmount,
            0,
            AssetPair.BASSET_IMASSETVAULT,
        );

        const ratioUnder = hre.ethers.utils.parseUnits('3', '18');
        const targetRatio = hre.ethers.utils.parseUnits('3.2', '18');

        const bundleId = 0;
        ({ subId, strategySub } = await subRepayFromSavingsStrategy(
            proxy, bundleId, vaultId, ratioUnder, targetRatio, true,
        ));
    });

    it('... should trigger a maker repay from mstable strategy', async () => {
        const ratioBefore = await getRatio(mcdView, vaultId);

        // TODO: calc. dynamicly
        // around 5k dai
        const repayAmount = '43862160000170780360530';

        // eslint-disable-next-line max-len
        // const balanceInVault = (await mstableView.rawBalanceOf(imUSDVault, proxy.address)).div(2);

        // console.log(balanceInVault.toString());

        await callMcdRepayFromMstableStrategy(
            // eslint-disable-next-line max-len
            botAcc, strategyExecutor, 0, subId, strategySub, repayAmount,
        );

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioAfter).to.be.gt(ratioBefore);
    });

    it('... should trigger a maker repay from mstable with exchange strategy', async () => {
        const ratioBefore = await getRatio(mcdView, vaultId);

        // TODO: calc. dynamicly
        // around 5k dai
        const repayAmount = '43862160000170780360530';

        // eslint-disable-next-line max-len
        // const balanceInVault = (await mstableView.rawBalanceOf(imUSDVault, proxy.address)).div(2);

        // console.log(balanceInVault.toString());

        await callMcdRepayFromMstableWithExchangeStrategy(
            // eslint-disable-next-line max-len
            botAcc, strategyExecutor, 1, subId, strategySub, repayAmount,
        );

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioAfter).to.be.gt(ratioBefore);
    });
});
