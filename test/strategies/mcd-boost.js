const hre = require('hardhat');
const { expect } = require('chai');

const { ilks } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    openStrategyAndBundleStorage,
    redeployCore,
} = require('../utils');

const { createBundle, createStrategy, addBotCaller } = require('../utils-strategies.js');

const { getRatio } = require('../utils-mcd.js');

const { createMcdBoostStrategy, createFlMcdBoostStrategy } = require('../strategies');
const { callMcdBoostStrategy, callFLMcdBoostStrategy } = require('../strategy-calls');
const { subMcdBoostStrategy } = require('../strategy-subs');

const { openVault } = require('../actions');

describe('Mcd-Boost-Strategy', function () {
    this.timeout(320000);

    let senderAcc;
    let proxy;
    let botAcc;
    let strategyExecutor;
    let subId;
    let strategySub;
    let vaultId;
    let mcdView;
    let flDyDx;
    let strategyTriggerView;
    let bundleId;
    const ethJoin = ilks[0].join;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        strategyExecutor = await redeployCore();

        await redeploy('McdRatioTrigger');
        await redeploy('McdWithdraw');
        await redeploy('DFSSell');
        await redeploy('McdPayback');
        mcdView = await redeploy('McdView');

        await redeploy('GasFeeTaker');
        await redeploy('McdRatioCheck');

        flDyDx = await redeploy('FLDyDx');
        await redeploy('McdSupply');
        await redeploy('McdWithdraw');
        await redeploy('McdGenerate');
        await redeploy('McdPayback');
        await redeploy('McdOpen');
        await redeploy('McdRatio');
        strategyTriggerView = await redeploy('StrategyTriggerView');
        await addBotCaller(botAcc.address);

        proxy = await getProxy(senderAcc.address);
    });

    it('... should create 2 boost strategies and create a bundle', async () => {
        const boostStrategy = createMcdBoostStrategy();
        const flBoostStrategy = createFlMcdBoostStrategy();

        await openStrategyAndBundleStorage();

        const strategyId1 = await createStrategy(proxy, ...boostStrategy, true);
        const strategyId2 = await createStrategy(proxy, ...flBoostStrategy, true);

        bundleId = await createBundle(proxy, [strategyId1, strategyId2]);
    });

    it('... should sub to boost bundle', async () => {
        vaultId = await openVault(
            proxy,
            'ETH-A',
            fetchAmountinUSDPrice('WETH', '40000'),
            fetchAmountinUSDPrice('DAI', '18000'),
        );

        console.log('VaultId: ', vaultId);

        const rationOver = hre.ethers.utils.parseUnits('1.7', '18');
        const targetRatio = hre.ethers.utils.parseUnits('2', '18');

        ({ subId, strategySub } = await subMcdBoostStrategy(
            proxy,
            bundleId,
            vaultId,
            rationOver,
            targetRatio,
            true,
        ));
    });

    it('... should sub to boost bundle', async () => {
        vaultId = await openVault(
            proxy,
            'ETH-A',
            fetchAmountinUSDPrice('WETH', '40000'),
            fetchAmountinUSDPrice('DAI', '18000'),
        );

        console.log('VaultId: ', vaultId);

        const rationOver = hre.ethers.utils.parseUnits('1.7', '18');
        const targetRatio = hre.ethers.utils.parseUnits('2.0', '18');

        ({ subId, strategySub } = await subMcdBoostStrategy(
            proxy,
            bundleId,
            vaultId,
            rationOver,
            targetRatio,
            true,
        ));
    });

    it('... should trigger a maker boost strategy', async () => {
        const ratioBefore = await getRatio(mcdView, vaultId);
        const boostAmount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('DAI', '2000'), '18');

        const abiCoder = hre.ethers.utils.defaultAbiCoder;
        const triggerCallData = [];
        triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], ['0', '0'])); // check curr ratio
        console.log(await strategyTriggerView.callStatic.checkTriggers(
            strategySub, triggerCallData,
        ));
        /*
        // This is tested with commented out onchain checking next price
        triggerCallData = [];
        triggerCallData.push(
            abiCoder.encode(['uint256', 'uint8'],
            ['5000000000000000000000000000000',
            '1']
        )); // check next ratio
        console.log(await strategyTriggerView.callStatic.checkTriggers(
            strategySub, triggerCallData,
        ));

        triggerCallData = [];
        triggerCallData.push(
            abiCoder.encode(['uint256', 'uint8'],
            ['5000000000000000000000000000000',
            '2']
        )); // check both ratios
        console.log(await strategyTriggerView.callStatic.checkTriggers(
            strategySub, triggerCallData,
        ));
        */

        await callMcdBoostStrategy(
            botAcc,
            strategyExecutor,
            0,
            subId,
            strategySub,
            ethJoin,
            boostAmount,
        );

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioBefore).to.be.gt(ratioAfter);
    });

    it('... should trigger a maker FL boost strategy', async () => {
        const ratioBefore = await getRatio(mcdView, vaultId);
        const boostAmount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('DAI', '400'), '18');

        // eslint-disable-next-line max-len
        await callFLMcdBoostStrategy(botAcc, strategyExecutor, 1, subId, strategySub, flDyDx.address, ethJoin, boostAmount);

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioBefore).to.be.gt(ratioAfter);
    });
});
