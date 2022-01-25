const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    approve,
    setBalance,
    balanceOf,
    DAI_ADDR,
    rariDaiFundManager,
    rdptAddress,
} = require('../utils');

const {
    createStrategy,
    addBotCaller,
    setMCDPriceVerifier,
} = require('../utils-strategies');

const { getRatio } = require('../utils-mcd');

const { callMcdRepayFromRariStrategy } = require('../strategy-calls');
const { subMcdRepayStrategy } = require('../strategy-subs');
const { createRariRepayStrategy } = require('../strategies');

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
        await redeploy('McdRatioCheck');
        strategyExecutor = await redeploy('StrategyExecutor');

        await redeploy('McdSupply');
        await redeploy('McdWithdraw');
        await redeploy('McdGenerate');
        await redeploy('McdPayback');
        await redeploy('McdOpen');
        await redeploy('RariDeposit');
        await redeploy('RariWithdraw');

        // rariView = await redeploy('rariView');
        await addBotCaller(botAcc.address);

        await setMCDPriceVerifier(mcdRatioTriggerAddr);

        proxy = await getProxy(senderAcc.address);
    });

    it('... should create repay strategy using rari funds', async () => {
        const repayStrategyEncoded = createRariRepayStrategy();

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

        const ratioUnder = hre.ethers.utils.parseUnits('3', '18');
        const targetRatio = hre.ethers.utils.parseUnits('3.2', '18');

        const bundleId = 0;
        ({ subId, strategySub } = await subMcdRepayStrategy(
            proxy, bundleId, vaultId, ratioUnder, targetRatio, false,
        ));
    });

    it('... should trigger a maker repay strategy', async () => {
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
});
