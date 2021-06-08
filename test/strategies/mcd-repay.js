const hre = require('hardhat');
const { expect } = require('chai');

const dfs = require('@defisaver/sdk');

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const {
    createMcdTrigger,
    RATIO_STATE_UNDER,
} = require('../triggers');

const {
    getProxy,
    redeploy,
    formatExchangeObj,
    fetchAmountinUSDPrice,
    UNISWAP_WRAPPER,
    WETH_ADDRESS,
    DAI_ADDR,
    MAX_UINT,
    nullAddress,
} = require('../utils');

const {
    subTemplate,
    getLatestTemplateId,
    subStrategy,
    addBotCaller,
} = require('../utils-strategies.js');

const {
    getRatio,
} = require('../utils-mcd.js');

const { openVault } = require('../actions');

const { fetchMakerAddresses, MCD_MANAGER_ADDR } = require('../utils-mcd');

// Dfs sdk won't accept 0x0 and we need some rand addr for testing
const placeHolderAddr = '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF';

describe('Mcd-Repay', function () {
    this.timeout(80000);

    let senderAcc; let proxy; let makerAddresses;
    let botAcc; let strategyExecutor; let strategyId; let vaultId;
    let mcdView;

    const ethJoin = ilks[0].join;

    const abiCoder = new hre.ethers.utils.AbiCoder();

    before(async () => {
        await redeploy('ProxyAuth');
        await redeploy('McdRatioTrigger');
        await redeploy('McdWithdraw');
        await redeploy('DFSSell');
        await redeploy('McdPayback');
        await redeploy('Subscriptions');
        await redeploy('SubInputs');
        await redeploy('SubscriptionProxy');
        await redeploy('TaskExecutor');
        await redeploy('GasFeeTaker');
        strategyExecutor = await redeploy('StrategyExecutor');
        await redeploy('BotAuth');
        mcdView = await redeploy('McdView');

        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        await addBotCaller(botAcc.address);

        proxy = await getProxy(senderAcc.address);

        makerAddresses = await fetchMakerAddresses();
    });

    it('... should make a new strategy', async () => {
        const name = 'McdRepayTemplate';
        const triggerIds = ['McdRatioTrigger'];
        const actionIds = ['McdWithdraw', 'GasFeeTaker', 'DFSSell', 'McdPayback'];
        const paramMapping = [[128, 0, 0, 129], [0, 0, 0], [0, 0, 0, 129, 129], [128, 3, 129]];

        const tokenData = getAssetInfo('WETH');

        await subTemplate(proxy, name, triggerIds, actionIds, paramMapping);

        vaultId = await openVault(
            makerAddresses,
            proxy,
            ethJoin,
            tokenData,
            fetchAmountinUSDPrice('WETH', '16000'),
            fetchAmountinUSDPrice('DAI', '8000'),
        );

        const rationUnder = hre.ethers.utils.parseUnits('2.5', '18');

        const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
        const proxyAddrEncoded = abiCoder.encode(['address'], [proxy.address]);

        const templateId = await getLatestTemplateId();
        const triggerData = await createMcdTrigger(vaultId, rationUnder, RATIO_STATE_UNDER);

        strategyId = await subStrategy(proxy, templateId, true, [vaultIdEncoded, proxyAddrEncoded],
            [triggerData]);
    });

    it('... should trigger a maker repay strategy', async () => {
        const triggerCallData = [];
        const actionsCallData = [];

        const repayAmount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '500'), '18');

        const withdrawAction = new dfs.actions.maker.MakerWithdrawAction(
            '0',
            repayAmount,
            ethJoin,
            placeHolderAddr,
            MCD_MANAGER_ADDR,
        );

        // TODO: How to validate amount?
        // TODO: Try and remove last flag in feeTaking action
        // TODO: Handle with FL

        const repayGasCost = 1200000; // 1.2 mil gas
        const feeTakingAction = new dfs.actions.basic.GasFeeAction(
            repayGasCost, WETH_ADDRESS, true,
        );

        const sellAction = new dfs.actions.basic.SellAction(
            formatExchangeObj(
                WETH_ADDRESS,
                DAI_ADDR,
                MAX_UINT,
                UNISWAP_WRAPPER,
            ),
            placeHolderAddr,
            placeHolderAddr,
        );

        const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
            '0', // vaultId
            '0', // amount
            placeHolderAddr, // proxy
            MCD_MANAGER_ADDR,
        );

        actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
        actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
        actionsCallData.push(sellAction.encodeForRecipe()[0]);
        actionsCallData.push(mcdPaybackAction.encodeForRecipe()[0]);

        triggerCallData.push([abiCoder.encode(['uint256'], ['0'])]);

        const ratioBefore = await getRatio(mcdView, vaultId);

        const strategyExecutorByBot = strategyExecutor.connect(botAcc);
        await strategyExecutorByBot.executeStrategy(strategyId, triggerCallData, actionsCallData, {
            gasLimit: 8000000,
        });

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(`Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`);

        expect(ratioAfter).to.be.gt(ratioBefore);
    });
});
