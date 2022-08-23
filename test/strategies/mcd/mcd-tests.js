const hre = require('hardhat');
const { expect } = require('chai');

const { ilks } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    openStrategyAndBundleStorage,
    redeployCore,
    balanceOf,
    getAddrFromRegistry,
    setBalance,
    approve,
    depositToWeth,
    getChainLinkPrice,
    DAI_ADDR,
    WETH_ADDRESS,
    USDC_ADDR,
    rariDaiFundManager,
    rariUsdcFundManager,
    rdptAddress,
    rsptAddress,
    YEARN_REGISTRY_ADDRESS,
    ETH_ADDR,
    takeSnapshot,
    revertToSnapshot,
    Float2BN,
} = require('../../utils');

const {
    createBundle,
    createStrategy,
    addBotCaller,
    setMCDPriceVerifier,
} = require('../../utils-strategies');

const { getRatio } = require('../../utils-mcd');

const {
    createMcdBoostStrategy,
    createFlMcdBoostStrategy,
    createRepayStrategy,
    createFLRepayStrategy,
    createRariRepayStrategy,
    createRariRepayStrategyWithExchange,
    createYearnRepayStrategy,
    createYearnRepayStrategyWithExchange,
    createMstableRepayStrategy,
    createMstableRepayStrategyWithExchange,
    createMcdCloseStrategy,
    createMcdCloseToCollStrategy,
    createMcdBoostCompositeStrategy,
    createMcdFLBoostCompositeStrategy,
    createMcdRepayCompositeStrategy,
    createMcdFLRepayCompositeStrategy,
} = require('../../strategies');

const {
    callMcdBoostStrategy,
    callFLMcdBoostStrategy,
    callFLMcdRepayStrategy,
    callMcdRepayStrategy,
    callMcdRepayFromRariStrategy,
    callMcdRepayFromRariStrategyWithExchange,
    callMcdRepayFromYearnStrategy,
    callMcdRepayFromYearnWithExchangeStrategy,
    callMcdRepayFromMstableStrategy,
    callMcdRepayFromMstableWithExchangeStrategy,
    callMcdCloseStrategy,
    callMcdCloseToCollStrategy,
    callMcdBoostCompositeStrategy,
    callMcdFLBoostCompositeStrategy,
    callMcdFLRepayCompositeStrategy,
    callMcdRepayCompositeStrategy,
} = require('../../strategy-calls');

const {
    subMcdBoostStrategy,
    subMcdRepayStrategy,
    subRepayFromSavingsStrategy,
    subMcdCloseStrategy,
    subMcdCloseToCollStrategy,
} = require('../../strategy-subs');

const {
    openVault,
    rariDeposit,
    yearnSupply,
    mStableDeposit,
} = require('../../actions');

const {
    mUSD,
    imUSD,
    imUSDVault,
    AssetPair,
} = require('../../utils-mstable');

const { RATIO_STATE_OVER } = require('../../triggers');

const mcdBoostStrategyTest = async () => {
    describe('Mcd-Boost-Strategy', function () {
        this.timeout(320000);

        const boostAmount = Float2BN(fetchAmountinUSDPrice('DAI', '2000'), '18');

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

        let snapshotId;

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
            await redeploy('McdBoostComposite');
            await redeploy('McdFLBoostComposite');
            strategyTriggerView = await redeploy('StrategyTriggerView');
            await addBotCaller(botAcc.address);

            proxy = await getProxy(senderAcc.address);
        });

        it('... should create 4 boost strategies and create a bundle', async () => {
            const boostStrategy = createMcdBoostStrategy();
            const flBoostStrategy = createFlMcdBoostStrategy();
            const boostCompositeStrategy = createMcdBoostCompositeStrategy();
            const flBoostCompositeStrategy = createMcdFLBoostCompositeStrategy();

            await openStrategyAndBundleStorage();

            const strategyId1 = await createStrategy(proxy, ...boostStrategy, true);
            const strategyId2 = await createStrategy(proxy, ...flBoostStrategy, true);
            const strategyId3 = await createStrategy(proxy, ...boostCompositeStrategy, true);
            const strategyId4 = await createStrategy(proxy, ...flBoostCompositeStrategy, true);

            bundleId = await createBundle(
                proxy,
                [strategyId1, strategyId2, strategyId3, strategyId4],
            );
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

            snapshotId = await takeSnapshot();
        });

        it('... should trigger a maker boost strategy', async () => {
            const ratioBefore = await getRatio(mcdView, vaultId);

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
            await revertToSnapshot(snapshotId);
            snapshotId = await takeSnapshot();

            const ratioBefore = await getRatio(mcdView, vaultId);

            // eslint-disable-next-line max-len
            await callFLMcdBoostStrategy(botAcc, strategyExecutor, 1, subId, strategySub, flDyDx.address, ethJoin, boostAmount);

            const ratioAfter = await getRatio(mcdView, vaultId);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.gt(ratioAfter);
        });

        it('... should trigger a maker boost composite strategy', async () => {
            await revertToSnapshot(snapshotId);
            snapshotId = await takeSnapshot();

            const ratioBefore = await getRatio(mcdView, vaultId);

            // eslint-disable-next-line max-len
            await callMcdBoostCompositeStrategy(botAcc, strategyExecutor, 2, subId, strategySub, ethJoin, boostAmount);

            const ratioAfter = await getRatio(mcdView, vaultId);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.gt(ratioAfter);
        });

        it('... should trigger a maker fl boost composite strategy', async () => {
            await revertToSnapshot(snapshotId);
            snapshotId = await takeSnapshot();

            const ratioBefore = await getRatio(mcdView, vaultId);

            // eslint-disable-next-line max-len
            await callMcdFLBoostCompositeStrategy(botAcc, strategyExecutor, 3, subId, strategySub, ethJoin, boostAmount);

            const ratioAfter = await getRatio(mcdView, vaultId);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.gt(ratioAfter);
        });
    });
};

const mcdRepayStrategyTest = async () => {
    describe('Mcd-Repay-Strategy', function () {
        this.timeout(1200000);

        const repayAmount = Float2BN(fetchAmountinUSDPrice('WETH', '1000'), '18');

        let senderAcc;
        let proxy;
        let botAcc;
        let flDyDx;
        let strategyExecutor;
        let subId;
        let vaultId;
        let mcdView;
        let mcdRatioTriggerAddr;
        let strategySub;
        let bundleId;
        let snapshotId;

        const ethJoin = ilks[0].join;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            strategyExecutor = await redeployCore();

            mcdRatioTriggerAddr = (await redeploy('McdRatioTrigger')).address;
            await redeploy('DFSSell');
            await redeploy('McdPayback');

            mcdView = await redeploy('McdView');

            await redeploy('GasFeeTaker');
            await redeploy('McdRatioCheck');

            await redeploy('McdSupply');
            await redeploy('McdWithdraw');
            await redeploy('McdGenerate');
            await redeploy('McdPayback');
            await redeploy('McdOpen');
            await redeploy('McdRatio');
            flDyDx = await redeploy('FLDyDx');
            await redeploy('McdRepayComposite');
            await redeploy('McdFLRepayComposite');

            await addBotCaller(botAcc.address);

            await setMCDPriceVerifier(mcdRatioTriggerAddr);

            proxy = await getProxy(senderAcc.address);
        });

        it('... should create 4 repay strategies and create a bundle', async () => {
            const repayStrategyEncoded = createRepayStrategy();
            const flRepayStrategyEncoded = createFLRepayStrategy();
            const repayCompositeStrategyEncoded = createMcdRepayCompositeStrategy();
            const flRepayCompositeStrategyEncoded = createMcdFLRepayCompositeStrategy();

            await openStrategyAndBundleStorage();

            const strategyId1 = await createStrategy(proxy, ...repayStrategyEncoded, true);
            const strategyId2 = await createStrategy(proxy, ...flRepayStrategyEncoded, true);
            const strategyId3 = await createStrategy(proxy, ...repayCompositeStrategyEncoded, true);
            // eslint-disable-next-line max-len
            const strategyId4 = await createStrategy(proxy, ...flRepayCompositeStrategyEncoded, true);

            bundleId = await createBundle(
                proxy,
                [strategyId1, strategyId2, strategyId3, strategyId4],
            );
        });

        it('... should sub the user to a repay bundle ', async () => {
            vaultId = await openVault(
                proxy,
                'ETH-A',
                fetchAmountinUSDPrice('WETH', '40000'),
                fetchAmountinUSDPrice('DAI', '18000'),
            );

            console.log('Vault id: ', vaultId);

            const ratioUnder = hre.ethers.utils.parseUnits('3', '18');
            const targetRatio = hre.ethers.utils.parseUnits('3.2', '18');

            ({ subId, strategySub } = await subMcdRepayStrategy(
                proxy, bundleId, vaultId, ratioUnder, targetRatio, true,
            ));

            snapshotId = await takeSnapshot();
        });

        it('... should trigger a maker repay strategy', async () => {
            const ratioBefore = await getRatio(mcdView, vaultId);

            await callMcdRepayStrategy(
                botAcc, strategyExecutor, 0, subId, strategySub, ethJoin, repayAmount,
            );

            const ratioAfter = await getRatio(mcdView, vaultId);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioAfter).to.be.gt(ratioBefore);
        });

        it('... should trigger a maker FL repay strategy', async () => {
            await revertToSnapshot(snapshotId);
            snapshotId = await takeSnapshot();

            const ratioBefore = await getRatio(mcdView, vaultId);

            // eslint-disable-next-line max-len
            await callFLMcdRepayStrategy(
                botAcc,
                strategyExecutor,
                1,
                subId,
                strategySub,
                flDyDx.address,
                ethJoin,
                repayAmount,
            );

            const ratioAfter = await getRatio(mcdView, vaultId);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioAfter).to.be.gt(ratioBefore);
        });

        it('... should trigger a maker composite repay strategy', async () => {
            await revertToSnapshot(snapshotId);
            snapshotId = await takeSnapshot();
            const ratioBefore = await getRatio(mcdView, vaultId);

            // eslint-disable-next-line max-len
            await callMcdRepayCompositeStrategy(
                botAcc,
                strategyExecutor,
                2,
                subId,
                strategySub,
                ethJoin,
                repayAmount,
            );

            const ratioAfter = await getRatio(mcdView, vaultId);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioAfter).to.be.gt(ratioBefore);
        });

        it('... should trigger a maker fl composite repay strategy', async () => {
            await revertToSnapshot(snapshotId);
            const ratioBefore = await getRatio(mcdView, vaultId);

            // eslint-disable-next-line max-len
            await callMcdFLRepayCompositeStrategy(
                botAcc,
                strategyExecutor,
                3,
                subId,
                strategySub,
                ethJoin,
                repayAmount,
            );

            const ratioAfter = await getRatio(mcdView, vaultId);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioAfter).to.be.gt(ratioBefore);
        });
    });
};

const mcdRepayFromRariStrategyTest = async () => {
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
};

const mcdRepayFromYearnStrategyTest = async () => {
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
        let yearnRegistry;
        let strategySub;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];
            strategyExecutor = await redeployCore();

            mcdRatioTriggerAddr = getAddrFromRegistry('McdRatioTrigger');
            mcdView = await redeploy('McdView');

            await addBotCaller(botAcc.address);

            await setMCDPriceVerifier(mcdRatioTriggerAddr);
            yearnRegistry = await hre.ethers.getContractAt('IYearnRegistry', YEARN_REGISTRY_ADDRESS);

            proxy = await getProxy(senderAcc.address);
        });

        it('... should sub the user to a repay bundle ', async () => {
            const repayStrategyEncoded = createYearnRepayStrategy();
            const flRepayStrategyEncoded = createYearnRepayStrategyWithExchange();

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

            // Deposit money to yearn
            const daiAmount = hre.ethers.utils.parseUnits('100000', 18);

            await setBalance(DAI_ADDR, senderAcc.address, daiAmount);
            await approve(DAI_ADDR, proxy.address);

            await yearnSupply(
                DAI_ADDR,
                daiAmount,
                senderAcc.address,
                proxy.address,
                proxy,
            );

            // Deposit some weth in yearn
            const wethAmount = hre.ethers.utils.parseUnits('10', 18);

            await depositToWeth(wethAmount);
            await approve(WETH_ADDRESS, proxy.address);

            await yearnSupply(
                WETH_ADDRESS,
                wethAmount,
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

        it('... should trigger a maker repay strategy from yearn', async () => {
            const yToken = await yearnRegistry.latestVault(DAI_ADDR);

            console.log(yToken);
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

        it('... should trigger a maker repay strategy from yearn with exchange', async () => {
            const yToken = await yearnRegistry.latestVault(WETH_ADDRESS);
            const yTokenBalanceBefore = await balanceOf(yToken, senderAcc.address);
            console.log(yTokenBalanceBefore.toString());

            await approve(yToken, proxy.address);

            const ratioBefore = await getRatio(mcdView, vaultId);
            const repayAmount = hre.ethers.utils.parseUnits('1', 18);

            await callMcdRepayFromYearnWithExchangeStrategy(
                botAcc, strategyExecutor, 1, subId, strategySub, yToken, repayAmount,
            );

            const ratioAfter = await getRatio(mcdView, vaultId);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioAfter).to.be.gt(ratioBefore);
        });
    });
};

const mcdRepayFromMStableStrategyTest = async () => {
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

            mcdView = await redeploy('McdView');
            mcdRatioTriggerAddr = getAddrFromRegistry('McdRatioTrigger');

            strategyExecutor = await redeployCore();
            await addBotCaller(botAcc.address);

            await setMCDPriceVerifier(mcdRatioTriggerAddr);

            proxy = await getProxy(senderAcc.address);
        });

        it('... should sub the user to a repay bundle ', async () => {
            const repayStrategyEncoded = createMstableRepayStrategy();
            const flRepayStrategyEncoded = createMstableRepayStrategyWithExchange();

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
};

const mcdCloseToDaiStrategyTest = async () => {
    describe('Mcd-Close Strategy (convert coll to DAI, payback debt, send DAI to recipient)', function () {
        this.timeout(120000);
        const ethJoin = ilks[0].join;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let vaultId;
        let makerFlAddr;
        let subStorage;
        let subId;
        let strategySub;
        let flAmount;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            strategyExecutor = await redeployCore();

            await redeploy('SendToken');
            await redeploy('McdRatioTrigger');
            await redeploy('DFSSell');
            await redeploy('McdView');
            await redeploy('GasFeeTaker');
            await redeploy('McdRatioCheck');

            const subStorageAddr = getAddrFromRegistry('SubStorage');
            subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

            await redeploy('McdSupply');
            await redeploy('McdWithdraw');
            await redeploy('McdGenerate');
            await redeploy('McdPayback');
            await redeploy('McdOpen');
            await redeploy('ChainLinkPriceTrigger');
            await addBotCaller(botAcc.address);
            makerFlAddr = await getAddrFromRegistry('FLMaker');
            proxy = await getProxy(senderAcc.address);
        });

        it('... should make a new strategy that closes CDP when price hits a point, transfers ETH to DAI, repays debt, transfers all remaining DAI to user', async () => {
            const vaultColl = fetchAmountinUSDPrice('WETH', '40000');
            const amountDai = fetchAmountinUSDPrice('DAI', '18000');
            vaultId = await openVault(
                proxy,
                'ETH-A',
                vaultColl,
                amountDai,
            );
            console.log(`VaultId: ${vaultId}`);
            console.log(`Vault collateral${vaultColl}`);
            console.log(`Vault debt${amountDai}`);
            flAmount = (parseFloat(amountDai) + 1).toString();
            flAmount = hre.ethers.utils.parseUnits(flAmount, 18);

            await openStrategyAndBundleStorage();

            const strategyData = createMcdCloseStrategy();
            const strategyId = await createStrategy(proxy, ...strategyData, false);

            const currPrice = await getChainLinkPrice(ETH_ADDR);

            const targetPrice = currPrice - 100; // Target is smaller so we can execute it
            ({ subId, strategySub } = await subMcdCloseStrategy(
                vaultId,
                proxy,
                targetPrice,
                WETH_ADDRESS,
                RATIO_STATE_OVER,
                strategyId,
            ));
            console.log(subId);
            console.log(await subStorage.getSub(subId));
        });

        it('... should trigger a mcd close strategy', async () => {
            const daiBalanceBefore = await balanceOf(DAI_ADDR, senderAcc.address);
            console.log(`Dai before closing : ${daiBalanceBefore.toString()}`);
            await callMcdCloseStrategy(
                proxy, botAcc, strategyExecutor, subId, strategySub, flAmount, ethJoin, makerFlAddr,
            );
            const daiBalanceAfter = await balanceOf(DAI_ADDR, senderAcc.address);
            console.log(`Dai after closing : ${daiBalanceAfter.toString()}`);
            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        });
        it('... should fail to trigger the same strategy again as its one time', async () => {
            try {
                await callMcdCloseStrategy(
                    proxy,
                    botAcc,
                    strategyExecutor,
                    subId,
                    strategySub,
                    flAmount,
                    ethJoin,
                    makerFlAddr,
                );
            } catch (err) {
                expect(err.toString()).to.have.string('SubNotEnabled');
            }
        });
    });
};

const mcdCloseToCollStrategyTest = async () => {
    describe('Mcd-Close Strategy to collateral', function () {
        this.timeout(320000);
        const ethJoin = ilks[0].join;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let vaultId;
        let makerFlAddr;
        let subStorage;
        let subId;
        let strategySub;
        let flAmount;

        const daiDebt = '18000';
        const ethCollInDollars = '40000';

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            strategyExecutor = await redeployCore();

            await redeploy('SendToken');
            await redeploy('SendTokenAndUnwrap');
            await redeploy('DFSSell');
            await redeploy('McdView');
            await redeploy('GasFeeTaker');

            const subStorageAddr = getAddrFromRegistry('SubStorage');
            subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

            await redeploy('McdSupply');
            await redeploy('McdWithdraw');
            await redeploy('McdGenerate');
            await redeploy('McdPayback');
            await redeploy('McdOpen');
            await redeploy('ChainLinkPriceTrigger');
            await addBotCaller(botAcc.address);
            makerFlAddr = await getAddrFromRegistry('FLMaker');
            proxy = await getProxy(senderAcc.address);
        });

        it('... should make a new strategy for cdp close to coll', async () => {
            const vaultColl = fetchAmountinUSDPrice('WETH', ethCollInDollars);
            const amountDai = fetchAmountinUSDPrice('DAI', daiDebt);
            vaultId = await openVault(
                proxy,
                'ETH-A',
                vaultColl,
                amountDai,
            );
            console.log(`VaultId: ${vaultId}`);
            console.log(`Vault collateral${vaultColl}`);
            console.log(`Vault debt${amountDai}`);
            flAmount = (parseFloat(amountDai) + 1).toString();
            flAmount = hre.ethers.utils.parseUnits(flAmount, 18);

            await openStrategyAndBundleStorage();

            const strategyData = createMcdCloseToCollStrategy();
            console.log(strategyData);
            const strategyId = await createStrategy(proxy, ...strategyData, false);

            const currPrice = await getChainLinkPrice(ETH_ADDR);

            const targetPrice = currPrice - 100; // Target is smaller so we can execute it
            ({ subId, strategySub } = await subMcdCloseToCollStrategy(
                vaultId,
                proxy,
                targetPrice,
                WETH_ADDRESS,
                RATIO_STATE_OVER,
                strategyId,
            ));
            console.log(subId);
            console.log(await subStorage.getSub(subId));
        });

        it('... should trigger a mcd close strategy', async () => {
            const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth before closing : ${ethBalanceBefore.toString() / 1e18}`);

            const daiBalanceBefore = await balanceOf(DAI_ADDR, senderAcc.address);
            console.log(`Dai before closing : ${daiBalanceBefore.toString() / 1e18}`);

            // enough eth to payback whole dai debt + 5% because of slippage
            const debtEstimate = (parseInt(daiDebt, 10) * 1.05).toString();
            const sellAmount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', debtEstimate), '18');

            console.log(sellAmount);

            await callMcdCloseToCollStrategy(
                proxy,
                botAcc,
                strategyExecutor,
                subId,
                strategySub,
                flAmount,
                sellAmount,
                ethJoin,
                makerFlAddr,
            );

            const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth after closing : ${ethBalanceAfter.toString() / 1e18}`);

            const daiBalanceAfter = await balanceOf(DAI_ADDR, senderAcc.address);
            console.log(`Dai after closing : ${daiBalanceAfter.toString() / 1e18}`);

            expect(ethBalanceAfter).to.be.gt(ethBalanceBefore);
            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        });

        it('... should fail to trigger the same strategy again as its one time', async () => {
            try {
                // enough eth to payback whole dai debt + 5% because of slippage
                const debtEstimate = (parseInt(daiDebt, 10) * 1.05).toString();
                const sellAmount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', debtEstimate), '18');

                await callMcdCloseToCollStrategy(
                    proxy,
                    botAcc,
                    strategyExecutor,
                    subId,
                    strategySub,
                    flAmount,
                    sellAmount,
                    ethJoin,
                    makerFlAddr,
                );
            } catch (err) {
                expect(err.toString()).to.have.string('SubNotEnabled');
            }
        });
    });
};

const mcdStrategiesTest = async () => {
    await mcdBoostStrategyTest();
    await mcdRepayStrategyTest();
    await mcdRepayFromRariStrategyTest();
    await mcdRepayFromYearnStrategyTest();
    await mcdRepayFromMStableStrategyTest();
    await mcdCloseToDaiStrategyTest();
    await mcdCloseToCollStrategyTest();
};
module.exports = {
    mcdStrategiesTest,
    mcdBoostStrategyTest,
    mcdRepayStrategyTest,
    mcdRepayFromRariStrategyTest,
    mcdRepayFromYearnStrategyTest,
    mcdRepayFromMStableStrategyTest,
    mcdCloseToDaiStrategyTest,
    mcdCloseToCollStrategyTest,
};
