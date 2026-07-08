// Minimal Spark Generic Repay test - single pair (WETH/DAI), SW only, no FL
const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    network,
    addrs,
    chainIds,
    getStrategyExecutorContract,
    getAndSetMockExchangeWrapper,
    formatMockExchangeObjUsdFeed,
    fetchAmountInUSDPrice,
    isNetworkFork,
    redeploy,
    sendEther,
    setBalance,
    approve,
} = require('../../../utils/utils');

const { addBotCaller } = require('../../utils/utils-strategies');
const { subSparkLeverageManagementGeneric } = require('../../utils/strategy-subs');
const { callSparkGenericRepayStrategy } = require('../../utils/strategy-calls');
const {
    openSparkProxyPosition,
    getSparkPositionRatio,
    deploySparkRepayGenericBundle,
    mockSparkOracle,
} = require('../../../utils/spark');

const RATIO_STATE_REPAY = 1;

describe('Spark Generic Repay - single pair debug', function () {
    this.timeout(600000);

    let senderAcc;
    let proxy;
    let botAcc;
    let strategyExecutor;
    let mockWrapper;
    let bundleId;

    // override pair with env vars, e.g: COLL=TBTC DEBT=USDC npx hardhat test ...
    const collAsset = getAssetInfo(process.env.COLL || 'WETH', chainIds[network]);
    const debtAsset = getAssetInfo(process.env.DEBT || 'DAI', chainIds[network]);
    // NOTE: must be above the opened position's ratio (~169% for 40k/20k on Spark,
    // WETH liq. threshold is higher than on AaveV3) so the repay trigger fires
    const triggerRatioRepay = 175;
    const targetRatioRepay = 225;
    const collAmountInUSD = 40_000;
    const debtAmountInUSD = 20_000;
    const repayAmountInUSD = 8_000;

    before(async () => {
        const isFork = isNetworkFork();
        await hre.network.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        // Must run BEFORE any redeploys: redeploy() time travels (registry wait
        // period) which makes Spark's Chronicle/Aggor price feeds stale and every
        // pool operation reverts with CanNotPickMedianOfEmptyArray (0x9e198af9).
        await mockSparkOracle(addrs[network].SPARK_MARKET);

        await sendEther(senderAcc, addrs[network].OWNER_ACC, '10');
        proxy = await getProxy(senderAcc.address);
        await addBotCaller(botAcc.address, isFork);
        strategyExecutor = (await getStrategyExecutorContract()).connect(botAcc);
        mockWrapper = await getAndSetMockExchangeWrapper(senderAcc);

        await redeploy('SparkRatioTrigger', isFork);
        await redeploy('SparkPayback', isFork);
        await redeploy('SparkSupply', isFork);
        await redeploy('SparkBorrow', isFork);
        await redeploy('SparkWithdraw', isFork);
        await redeploy('SparkRatioCheck', isFork);
        await redeploy('SparkView', isFork);
        await redeploy('PullToken', isFork);

        bundleId = await deploySparkRepayGenericBundle();
    });

    it('... should execute Spark SW repay strategy for WETH/DAI (single pair)', async () => {
        const marketAddr = addrs[network].SPARK_MARKET;

        // STEP 0: sanity check - direct supply/borrow on Spark pool from EOA.
        // This bypasses the whole DFS stack (DSProxy/RecipeExecutor swallows revert
        // reasons), so if the protocol itself rejects the tx (frozen/paused reserve,
        // supply/borrow cap...) we will see the actual Aave/Spark error code here.
        const block = await hre.ethers.provider.getBlock('latest');
        console.log(
            '>>> STEP 0 timestamp:',
            block.timestamp,
            new Date(block.timestamp * 1000).toISOString(),
        );
        console.log('>>> STEP 0: direct pool.supply/borrow sanity check');
        const providerContract = await hre.ethers.getContractAt(
            'IPoolAddressesProvider',
            marketAddr,
        );
        const poolAddr = await providerContract.getPool();
        const pool = await hre.ethers.getContractAt('IPoolV3', poolAddr, senderAcc);

        const supplyAmount = hre.ethers.utils.parseUnits('10', collAsset.decimals);
        await setBalance(collAsset.address, senderAcc.address, supplyAmount);
        await approve(collAsset.address, poolAddr, senderAcc);
        await pool.supply(collAsset.address, supplyAmount, senderAcc.address, 0);
        console.log('>>> STEP 0a done: direct supply works');

        const borrowAmount = hre.ethers.utils.parseUnits('1000', debtAsset.decimals);
        await pool.borrow(debtAsset.address, borrowAmount, 2, 0, senderAcc.address);
        console.log('>>> STEP 0b done: direct borrow works');

        console.log('>>> STEP 1: opening SW position');
        await openSparkProxyPosition(
            senderAcc.address,
            proxy,
            collAsset.symbol,
            debtAsset.symbol,
            collAmountInUSD,
            debtAmountInUSD,
            marketAddr,
        );
        console.log('>>> STEP 1 done');

        const ratioBefore = await getSparkPositionRatio(proxy.address, null, marketAddr);
        console.log('>>> ratioBefore', ratioBefore.toString());

        console.log('>>> STEP 2: subscribing to strategy');
        const { subId, strategySub } = await subSparkLeverageManagementGeneric(
            bundleId,
            proxy,
            senderAcc.address,
            marketAddr,
            RATIO_STATE_REPAY,
            targetRatioRepay,
            triggerRatioRepay,
            false, // isEOA
        );
        console.log('>>> STEP 2 done, subId:', subId.toString());

        console.log('>>> STEP 3: executing repay strategy');
        const repayAmount = await fetchAmountInUSDPrice(collAsset.symbol, repayAmountInUSD);
        const exchangeObject = await formatMockExchangeObjUsdFeed(
            collAsset,
            debtAsset,
            repayAmount,
            mockWrapper,
        );
        try {
            await callSparkGenericRepayStrategy(
                strategyExecutor,
                0, // strategyIndex (non-FL)
                subId,
                strategySub,
                exchangeObject,
                repayAmount,
                marketAddr,
            );
        } catch (err) {
            console.log('>>> STEP 3 failed, extracting call trace of the failed tx...');
            const failedBlock = await hre.ethers.provider.getBlock('latest');
            const txHash = failedBlock.transactions[failedBlock.transactions.length - 1];
            console.log('>>> failed tx:', txHash);
            const trace = await hre.network.provider.send('debug_traceTransaction', [
                txHash,
                { disableStorage: true, disableMemory: true, enableMemory: false },
            ]);
            const events = [];
            for (let i = 0; i < trace.structLogs.length; i++) {
                const log = trace.structLogs[i];
                if (['CALL', 'DELEGATECALL', 'STATICCALL', 'CALLCODE'].includes(log.op)) {
                    const to = `0x${log.stack[log.stack.length - 2].slice(-40)}`;
                    events.push(`${' '.repeat(log.depth)}${log.depth} ${log.op} -> ${to}`);
                } else if (log.op === 'REVERT' || log.op === 'INVALID') {
                    events.push(`${' '.repeat(log.depth)}${log.depth} ${log.op} (pc=${log.pc})`);
                }
            }
            console.log('>>> last 30 call/revert events:');
            events.slice(-30).forEach((e) => console.log(e));
            throw err;
        }
        console.log('>>> STEP 3 done');

        const ratioAfter = await getSparkPositionRatio(proxy.address, null, marketAddr);
        console.log('>>> ratioAfter', ratioAfter.toString());
        expect(ratioAfter).to.be.gt(ratioBefore);
    });
});
