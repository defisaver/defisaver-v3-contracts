const { expect } = require('chai');

const hre = require('hardhat');

const { configure } = require('@defisaver/sdk');
const {
    getProxy,
    balanceOf, setBalance, redeploy,
    takeSnapshot, revertToSnapshot, addrs, approve, impersonateAccount, getNetwork,
} = require('../utils');

const sparkMarket = addrs[getNetwork()].SPARK_MARKET;

const {
    sparkSupply, sparkSupplyCalldataOptimised, sparkBorrow, sparkWithdraw,
    sparkWithdrawCalldataOptimised, sparkPayback, sparkPaybackCalldataOptimised,
    sparkSwapBorrowRateCalldataOptimised, sparkSwapBorrowRate, sparkSetEModeCalldataOptimised,
    sparkSetEMode, sparkSwitchCollateral, sparkSwitchCollateralCallDataOptimised,
    sparkATokenPaybackCalldataOptimised, sparkATokenPayback,
    sparkBorrowCalldataOptimised, sparkClaimRewards,
} = require('../actions');

const sparkSupplyTest = async () => {
    describe('Spark-Supply-L2', function () {
        configure({
            chainId: 10,
        });
        this.timeout(150000);

        let senderAcc; let proxy; let pool; let snapshotId;
        let WETH_ADDRESS; let aWETH;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;

            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it('... should supply WETH to Spark', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        it('... should supply WETH to Sparkusing optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);

            await sparkSupplyCalldataOptimised(
                proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });
    });
};

const sparkBorrowTest = async () => {
    describe('Spark-Borrow-L2', function () {
        configure({
            chainId: 10,
        });
        this.timeout(150000);

        let senderAcc; let proxy; let pool; let snapshotId;

        let WETH_ADDRESS; let aWETH; let DAI_ADDRESS;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            DAI_ADDRESS = addrs[network].DAI_ADDRESS;

            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it('... should supply WETH and borrow DAI on Spark Optimism', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrow(proxy, sparkMarket, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        });
        it('... should supply WETH and borrow DAI on Spark Optimism using optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrowCalldataOptimised(
                proxy, sparkMarket, amountDai, to, 2, reserveDataDAI.id,
            );

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        });
    });
};

const sparkWithdrawTest = async () => {
    describe('Spark-Withdraw-L2', function () {
        this.timeout(150000);

        configure({
            chainId: 10,
        });
        let senderAcc; let proxy; let pool; let snapshotId;
        let WETH_ADDRESS; let aWETH;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;

            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it('... should supply WETH and then withdraw it on Spark', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
            // ----------------------------------------------------------------

            const wethBalanceBeforeWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA before withdraw:${wethBalanceBeforeWithdraw.toString()}`);
            await sparkWithdraw(proxy, sparkMarket, assetId, amount, to);

            const awethEOAbalanceAfterWithdraw = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const wethBalanceAfterWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA after withdraw:${wethBalanceAfterWithdraw.toString()}`);
            expect(wethBalanceAfterWithdraw).to.be.gt(wethBalanceBeforeWithdraw);
            expect(awethEOAbalanceAfterWithdraw).to.be.lt(balanceAfter);
        });
        it('... should supply WETH and then withdraw it on Sparkusing optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
            // ----------------------------------------------------------------

            const wethBalanceBeforeWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA before withdraw:${wethBalanceBeforeWithdraw.toString()}`);
            await sparkWithdrawCalldataOptimised(proxy, sparkMarket, assetId, amount, to);

            const awethEOAbalanceAfterWithdraw = await balanceOf(aWETH, proxy.address);

            const wethBalanceAfterWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA after withdraw:${wethBalanceAfterWithdraw.toString()}`);

            expect(wethBalanceAfterWithdraw).to.be.gt(wethBalanceBeforeWithdraw);
            expect(awethEOAbalanceAfterWithdraw).to.be.lt(balanceAfter);
        });
    });
};

const sparkPaybackTest = async () => {
    describe('Spark-Payback-L2', function () {
        this.timeout(150000);

        configure({
            chainId: 10,
        });
        let senderAcc; let proxy; let pool; let snapshotId;

        let WETH_ADDRESS; let aWETH; let DAI_ADDRESS;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            DAI_ADDRESS = addrs[network].DAI_ADDRESS;

            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it('... should supply WETH and borrow DAI then repay the debt to Spark', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrow(proxy, sparkMarket, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            await approve(DAI_ADDRESS, proxy.address);

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            await sparkPayback(
                proxy, sparkMarket, amountDai, from, 2, reserveDataDAI.id, DAI_ADDRESS,
            );

            const daiBalanceAfterPayback = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after payback:${daiBalanceAfterPayback.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);
            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });
        it('... should supply WETH and borrow DAI then repay the debt to Spark using optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrow(proxy, sparkMarket, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            await approve(DAI_ADDRESS, proxy.address);

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            await sparkPayback(
                proxy, sparkMarket, amountDai, from, 2, reserveDataDAI.id, DAI_ADDRESS,
            );

            const daiBalanceAfterPayback = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after payback:${daiBalanceAfterPayback.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);

            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });
        it('... should supply WETH and borrow DAI then repay uint(-1) ALL debt to Spark using optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrow(proxy, sparkMarket, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            await setBalance(DAI_ADDRESS, senderAcc.address, amountDai.mul(2));
            await approve(DAI_ADDRESS, proxy.address);

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            await sparkPaybackCalldataOptimised(
                proxy,
                sparkMarket,
                hre.ethers.constants.MaxUint256,
                from,
                2,
                reserveDataDAI.id,
                DAI_ADDRESS,
            );

            const daiBalanceAfterPayback = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after payback:${daiBalanceAfterPayback.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);

            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
            expect(debtAmountAfter).to.be.eq(0);
        });
    });
};

const sparkSwapBorrowRateTest = async () => {
    describe('Spark-Swap-Borrow-Rate-L2', function () {
        this.timeout(150000);

        configure({
            chainId: 10,
        });
        let senderAcc; let proxy; let pool; let snapshotId;

        let WETH_ADDRESS; let aWETH; let DAI_ADDRESS;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            DAI_ADDRESS = addrs[network].DAI_ADDRESS;

            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        // TODO - find assets that can be stable borrowed at test runtime
        // at the time of this commit no asset can be stable borrowed
        it.skip('... should supply WETH and borrow variable rate DAI then change it to stable on Spark Optimism', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrow(proxy, sparkMarket, amountDai, to, 1, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);

            const variableRateDai = reserveDataDAI.variableDebtTokenAddress;
            const stableRateDai = reserveDataDAI.stableDebtTokenAddress;

            const variableDaiDebtBefore = await balanceOf(variableRateDai, proxy.address);
            const stableDaiDebtBefore = await balanceOf(stableRateDai, proxy.address);
            console.log(`Variable debt before rate swap ${variableDaiDebtBefore.toString()}`);
            console.log(`Stable debt before rate swap ${stableDaiDebtBefore.toString()}`);

            await sparkSwapBorrowRate(proxy, reserveDataDAI.id, 1);

            const variableDaiDebtAfter = await balanceOf(variableRateDai, proxy.address);
            const stableDaiDebtAfter = await balanceOf(stableRateDai, proxy.address);
            console.log(`Variable debt after rate swap ${variableDaiDebtAfter.toString()}`);
            console.log(`Stable debt after rate swap ${stableDaiDebtAfter.toString()}`);
        });

        // TODO - find assets that can be stable borrowed at test runtime
        // at the time of this commit no asset can be stable borrowed
        it.skip('... should supply WETH and borrow variable rate DAI then change it to stable on Spark Optimism using optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrow(proxy, sparkMarket, amountDai, to, 1, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);

            const variableRateDai = reserveDataDAI.variableDebtTokenAddress;
            const stableRateDai = reserveDataDAI.stableDebtTokenAddress;

            const variableDaiDebtBefore = await balanceOf(variableRateDai, proxy.address);
            const stableDaiDebtBefore = await balanceOf(stableRateDai, proxy.address);
            console.log(`Variable debt before rate swap ${variableDaiDebtBefore.toString()}`);
            console.log(`Stable debt before rate swap ${stableDaiDebtBefore.toString()}`);

            await sparkSwapBorrowRateCalldataOptimised(
                proxy, reserveDataDAI.id, 1,
            );

            const variableDaiDebtAfter = await balanceOf(variableRateDai, proxy.address);
            const stableDaiDebtAfter = await balanceOf(stableRateDai, proxy.address);
            console.log(`Variable debt after rate swap ${variableDaiDebtAfter.toString()}`);
            console.log(`Stable debt after rate swap ${stableDaiDebtAfter.toString()}`);
        });
    });
};
const sparkSetEModeTest = async () => {
    describe('Spark-Set-EMode-L2', function () {
        this.timeout(150000);

        configure({
            chainId: 10,
        });
        let senderAcc; let proxy; let snapshotId; let pool;
        let WETH_ADDRESS; let aWETH;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;

            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it('... should change EMode on Spark', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            let userEmode = await pool.getUserEMode(proxy.address);
            console.log(`Users emode before changing: ${userEmode}`);
            expect(userEmode).to.be.eq(0);

            await sparkSetEMode(proxy, sparkMarket, 1);

            userEmode = await pool.getUserEMode(proxy.address);

            expect(userEmode).to.be.eq(1);
            console.log(`Users emode before changing: ${userEmode}`);
        });
        it('... should supply WETH to Sparkwith calldata optimised', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            let userEmode = await pool.getUserEMode(proxy.address);
            console.log(`Users emode before changing: ${userEmode}`);
            expect(userEmode).to.be.eq(0);

            await sparkSetEModeCalldataOptimised(proxy, sparkMarket, 1);

            userEmode = await pool.getUserEMode(proxy.address);
            console.log(`Users emode before changing: ${userEmode}`);
            expect(userEmode).to.be.eq(1);
        });
    });
};
const sparkCollSwitchTest = async () => {
    describe('Spark-Coll-Switch-L2', function () {
        this.timeout(150000);

        configure({
            chainId: 10,
        });
        let senderAcc; let proxy; let pool; let snapshotId;

        let WETH_ADDRESS; let aWETH; let DAI_ADDRESS; let aDAI;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            DAI_ADDRESS = addrs[network].DAI_ADDRESS;

            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
            aDAI = (await pool.getReserveData(DAI_ADDRESS)).aTokenAddress;
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it('... should supply WETH and DAI to Sparkthen turn off collateral for them', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const amountDai = hre.ethers.utils.parseUnits('1000', 18);
            await setBalance(DAI_ADDRESS, senderAcc.address, amountDai);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on eoa: ${daiBalanceBefore.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const daiAssetId = reserveDataDAI.id;

            const balanceBeforeADAI = await balanceOf(aDAI, proxy.address);
            console.log(`aDAI on proxy before: ${balanceBeforeADAI.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, DAI_ADDRESS, daiAssetId, from);

            const balanceAfterADAI = await balanceOf(aDAI, proxy.address);
            console.log(`aDAI on proxy after: ${balanceAfterADAI.toString()}`);

            //-----------------------------------------------------
            await sparkSwitchCollateral(
                proxy, sparkMarket, 2, [assetId, daiAssetId], [false, false],
            );
        });
        it('... should supply WETH and DAI to Sparkthen turn off collateral for them', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const amountDai = hre.ethers.utils.parseUnits('1000', 18);
            await setBalance(DAI_ADDRESS, senderAcc.address, amountDai);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on eoa: ${daiBalanceBefore.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const daiAssetId = reserveDataDAI.id;

            const balanceBeforeADAI = await balanceOf(aDAI, proxy.address);
            console.log(`aDAI on proxy before: ${balanceBeforeADAI.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, DAI_ADDRESS, daiAssetId, from);

            const balanceAfterADAI = await balanceOf(aDAI, proxy.address);
            console.log(`aDAI on proxy after: ${balanceAfterADAI.toString()}`);

            //-----------------------------------------------------
            await sparkSwitchCollateralCallDataOptimised(
                proxy, sparkMarket, 2, [assetId, daiAssetId], [false, false],
            );
        });
    });
};
const sparkATokenPaybackTest = async () => {
    describe('Spark-ATokenPayback-L2', function () {
        this.timeout(150000);

        configure({
            chainId: 10,
        });
        let senderAcc; let proxy; let pool; let snapshotId;

        let WETH_ADDRESS; let aWETH; let DAI_ADDRESS;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            DAI_ADDRESS = addrs[network].DAI_ADDRESS;

            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it('... should supply WETH and borrow DAI then repay part of debt using aDAI on Spark', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrow(proxy, sparkMarket, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);

            const aDAI = reserveDataDAI.aTokenAddress;

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            const paybackAmount = hre.ethers.utils.parseUnits('500', 18);

            await setBalance(aDAI, from, paybackAmount);

            await approve(aDAI, proxy.address);
            const aDaiBalanceBefore = await balanceOf(aDAI, senderAcc.address);
            console.log(`aDAI on EOA before ATokenPayback: ${aDaiBalanceBefore.toString()}`);
            await sparkATokenPayback(
                proxy, sparkMarket, paybackAmount, from, 2, reserveDataDAI.id, aDAI,
            );

            const aDaiBalanceAfter = await balanceOf(aDAI, senderAcc.address);
            console.log(`aDAI on EOA after ATokenPayback: ${aDaiBalanceAfter.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);
            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });

        it('... should supply WETH and borrow DAI then repay part of debt using aDAI on Spark using optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrow(proxy, sparkMarket, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);

            const aDAI = reserveDataDAI.aTokenAddress;

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            const paybackAmount = hre.ethers.utils.parseUnits('500', 18);

            await setBalance(aDAI, from, paybackAmount);

            await approve(aDAI, proxy.address);
            const aDaiBalanceBefore = await balanceOf(aDAI, senderAcc.address);
            console.log(`aDAI on EOA before ATokenPayback: ${aDaiBalanceBefore.toString()}`);
            await sparkATokenPaybackCalldataOptimised(
                proxy, sparkMarket, paybackAmount, from, 2, reserveDataDAI.id, aDAI,
            );

            const aDaiBalanceAfter = await balanceOf(aDAI, senderAcc.address);
            console.log(`aDAI on EOA after ATokenPayback: ${aDaiBalanceAfter.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);

            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });
        it('... should supply WETH and borrow DAI then repay ALL debt using aDAI on Spark using optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrow(proxy, sparkMarket, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);

            const aDAI = reserveDataDAI.aTokenAddress;

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            const paybackAmount = hre.ethers.utils.parseUnits('1500', 18);

            await setBalance(aDAI, from, paybackAmount);

            await approve(aDAI, proxy.address);
            const aDaiBalanceBefore = await balanceOf(aDAI, senderAcc.address);
            console.log(`aDAI on EOA before ATokenPayback: ${aDaiBalanceBefore.toString()}`);
            await sparkATokenPaybackCalldataOptimised(
                proxy, sparkMarket, paybackAmount, from, 2, reserveDataDAI.id,
            );

            const aDaiBalanceAfter = await balanceOf(aDAI, senderAcc.address);
            console.log(`aDAI on EOA after ATokenPayback: ${aDaiBalanceAfter.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);

            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
            expect(debtAmountAfter).to.be.eq(0);
        });
    });
};
const sparkClaimRewardsTest = async () => {
    describe('Spark-ClaimRewards-L2', function () {
        this.timeout(150000);

        configure({
            chainId: 10,
        });
        let snapshotId;

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });
        // TODO : hardcode block number on L2 chains? tested on 15281577
        it('... should claim OP rewards on Optimism DSProxy position', async () => {
            const ownerAcc = '0xEA57Dc30959eb17c506E4dA095fa9181f3E0Ac6D';
            let proxy = await getProxy(ownerAcc);
            await impersonateAccount(ownerAcc);
            proxy = proxy.connect(await hre.ethers.provider.getSigner(ownerAcc));
            const aWBTC = '0x078f358208685046a11C85e8ad32895DED33A249';
            const aWETH = '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8';
            const aVariableUSDC = '0xFCCf3cAbbe80101232d343252614b6A3eE81C989';

            const opAmount = '2168856438217507949';
            const opToken = '0x4200000000000000000000000000000000000042';

            const balanceBefore = await balanceOf(opToken, ownerAcc);
            console.log(balanceBefore.toString());

            await sparkClaimRewards(
                proxy, [aWBTC, aWETH, aVariableUSDC], opAmount, ownerAcc, opToken,
            );

            const balanceAfter = await balanceOf(opToken, ownerAcc);
            console.log(balanceAfter.toString());

            expect(balanceAfter.sub(balanceBefore)).to.be.eq(opAmount);
        });
    });
};

const sparkDeployContracts = async () => {
    await redeploy('SparkSupply');
    await redeploy('SparkBorrow');
    await redeploy('SparkATokenPayback');
    await redeploy('SparkCollateralSwitch');
    await redeploy('SparkPayback');
    await redeploy('SparkSetEMode');
    await redeploy('SparkSwapBorrowRateMode');
    await redeploy('SparkWithdraw');
};

const sparkFullTest = async () => {
    await sparkDeployContracts();

    await sparkSupplyTest();
    await sparkBorrowTest();
    await sparkWithdrawTest();
    await sparkSwapBorrowRateTest();
    await sparkSetEModeTest();
    await sparkPaybackTest();
    await sparkCollSwitchTest();
    await sparkATokenPaybackTest();
};
module.exports = {
    sparkFullTest,
    sparkSupplyTest,
    sparkBorrowTest,
    sparkWithdrawTest,
    sparkSwapBorrowRateTest,
    sparkSetEModeTest,
    sparkPaybackTest,
    sparkCollSwitchTest,
    sparkATokenPaybackTest,
    sparkClaimRewardsTest,
};
