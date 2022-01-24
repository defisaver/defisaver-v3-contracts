const hre = require('hardhat');
const { expect } = require('chai');

const dfs = require('@defisaver/sdk');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    approve,
    DAI_ADDR,
    setBalance,
} = require('../utils');

const {
    createStrategy,
    addBotCaller,
    setMCDPriceVerifier,
} = require('../utils-strategies');

const {
    mUSD,
    imUSD,
    imUSDVault,
    AssetPair,
} = require('../utils-mstable');

const { getRatio } = require('../utils-mcd');

const { subMcdRepayStrategy, callMcdRepayFromMstableStrategy } = require('../strategies');

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
        await redeploy('McdRatioCheck');
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

    const createRepayStrategy = () => {
        const repayStrategy = new dfs.Strategy('McdMstableRepayStrategy');

        repayStrategy.addSubSlot('&vaultId', 'uint256');
        repayStrategy.addSubSlot('&targetRatio', 'uint256');

        const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
        repayStrategy.addTrigger(mcdRatioTrigger);

        const mstableWithdrawAction = new dfs.actions.mstable.MStableWithdrawAction(
            '%bAsset',
            '%mAsset',
            '%saveAddress',
            '%vaultAddress',
            '&proxy',
            '&proxy',
            '%amount',
            '%minOut',
            '%assetPair',
        );

        // TODO: Must pipe dai into next action?

        const feeTakingAction = new dfs.actions.basic.GasFeeAction(
            '0', '%daiAddr', '$1',
        );

        const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
            '&vaultId',
            '$2',
            '&proxy',
            '%mcdManager',
        );

        repayStrategy.addAction(mstableWithdrawAction);
        repayStrategy.addAction(feeTakingAction);
        repayStrategy.addAction(mcdPaybackAction);

        return repayStrategy.encodeForDsProxyCall();
    };

    it('... should create repay strategy using mstable funds', async () => {
        const repayStrategyEncoded = createRepayStrategy();

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

        const ratioUnder = hre.ethers.utils.parseUnits('3', '18');
        const targetRatio = hre.ethers.utils.parseUnits('3.2', '18');

        const bundleId = 0;
        ({ subId, strategySub } = await subMcdRepayStrategy(
            proxy, bundleId, vaultId, ratioUnder, targetRatio, false,
        ));
    });

    it('... should trigger a maker repay strategy', async () => {
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
});
