const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    approve,
    YEARN_REGISTRY_ADDRESS,
    balanceOf,
    DAI_ADDR,
    setBalance,
} = require('../utils');

const {
    createStrategy,
    addBotCaller,
    setMCDPriceVerifier,
} = require('../utils-strategies');

const { getRatio } = require('../utils-mcd');

const { callMcdRepayFromYearnStrategy } = require('../strategy-calls');
const { subMcdRepayStrategy } = require('../strategy-subs');
const { createYearnRepayStrategy } = require('../strategies');

const { openVault, yearnSupply } = require('../actions');

describe('Mcd-Repay-Yearn-Strategy', function () {
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
    let yearnRegistry;

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
        await redeploy('McdRatioCheck');
        await redeploy('GasFeeTaker');
        strategyExecutor = await redeploy('StrategyExecutor');

        await redeploy('McdSupply');
        await redeploy('McdWithdraw');
        await redeploy('McdGenerate');
        await redeploy('McdPayback');
        await redeploy('McdOpen');
        await redeploy('YearnSupply');
        await redeploy('YearnWithdraw');
        await addBotCaller(botAcc.address);

        await setMCDPriceVerifier(mcdRatioTriggerAddr);
        yearnRegistry = await hre.ethers.getContractAt('IYearnRegistry', YEARN_REGISTRY_ADDRESS);

        proxy = await getProxy(senderAcc.address);
    });

    it('... should create repay strategy using yearn funds', async () => {
        const repayStrategyEncoded = createYearnRepayStrategy();

        await createStrategy(proxy, ...repayStrategyEncoded, true);
    });

    it('... should sub the user to a repay bundle ', async () => {
        // create vault
        vaultId = await openVault(
            proxy,
            'ETH-A',
            fetchAmountinUSDPrice('WETH', '50000'),
            fetchAmountinUSDPrice('DAI', '25000'),
        );

        console.log('Vault id: ', vaultId);

        // Deposit money to yearn
        const daiAmount = hre.ethers.utils.parseUnits('100000', 18);

        await setBalance(DAI_ADDR, senderAcc.address, daiAmount);
        await approve(DAI_ADDR, proxy.address);

        await yearnSupply(
            DAI_ADDR,
            daiAmount,
            senderAcc.address,
            senderAcc.address,
            proxy,
        );

        const ratioUnder = hre.ethers.utils.parseUnits('3', '18');
        const targetRatio = hre.ethers.utils.parseUnits('3.2', '18');

        const bundleId = 0;
        ({ subId, strategySub } = await subMcdRepayStrategy(
            proxy, bundleId, vaultId, ratioUnder, targetRatio, false,
        ));
    });

    it('... should trigger a maker repay strategy', async () => {
        const yToken = await yearnRegistry.latestVault(DAI_ADDR);
        const yTokenBalanceBefore = await balanceOf(yToken, senderAcc.address);
        console.log(yTokenBalanceBefore.toString());

        await approve(yToken, proxy.address);

        const ratioBefore = await getRatio(mcdView, vaultId);
        const repayAmount = hre.ethers.utils.parseUnits('5000', 18);

        await callMcdRepayFromYearnStrategy(
            botAcc, strategyExecutor, 0, subId, strategySub, yToken, repayAmount,
        );

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioAfter).to.be.gt(ratioBefore);
    });
});
