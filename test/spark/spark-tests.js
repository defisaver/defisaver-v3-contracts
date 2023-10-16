const { expect } = require('chai');

const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');
const {
    getProxy,
    balanceOf, setBalance, redeploy,
    takeSnapshot, revertToSnapshot, addrs, approve, impersonateAccount,
    getNetwork, Float2BN, getAddrFromRegistry,
} = require('../utils');

const sparkMarket = addrs[getNetwork()].SPARK_MARKET;

const {
    sparkSupply, sparkSupplyCalldataOptimised, sparkBorrow, sparkWithdraw,
    sparkWithdrawCalldataOptimised, sparkPayback, sparkPaybackCalldataOptimised,
    sparkSwapBorrowRateCalldataOptimised, sparkSwapBorrowRate, sparkSetEModeCalldataOptimised,
    sparkSetEMode, sparkSwitchCollateral, sparkSwitchCollateralCallDataOptimised,
    sparkSpTokenPaybackCalldataOptimised, sparkSpTokenPayback,
    sparkBorrowCalldataOptimised, sparkClaimRewards, sDaiWrap, sDaiUnwrap, sparkDelegateCredit,
} = require('../actions');

const sparkSupplyTest = async () => {
    describe('Spark-Supply', function () {
        this.timeout(150000);

        let senderAcc; let proxy; let pool; let snapshotId;
        let WETH_ADDRESS; let spWETH;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;

            spWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
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

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        it('... should supply WETH to Spark using optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);

            await sparkSupplyCalldataOptimised(
                proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });
    });
};

const sparkBorrowTest = async () => {
    describe('Spark-Borrow', function () {
        this.timeout(150000);

        let senderAcc; let proxy; let pool; let snapshotId;

        let WETH_ADDRESS; let spWETH; let DAI_ADDRESS;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            DAI_ADDRESS = addrs[network].DAI_ADDRESS;

            spWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it('... should supply WETH and borrow DAI on Spark', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrow(proxy, sparkMarket, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        });
        it('... should supply WETH and borrow DAI on Spark using optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

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
    describe('Spark-Withdraw', function () {
        this.timeout(150000);

        let senderAcc; let proxy; let pool; let snapshotId;
        let WETH_ADDRESS; let spWETH;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;

            spWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
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

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);
            // ----------------------------------------------------------------

            const wethBalanceBeforeWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA before withdraw:${wethBalanceBeforeWithdraw.toString()}`);
            await sparkWithdraw(proxy, sparkMarket, assetId, amount, to);

            const spwethEOAbalanceAfterWithdraw = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

            const wethBalanceAfterWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA after withdraw:${wethBalanceAfterWithdraw.toString()}`);
            expect(wethBalanceAfterWithdraw).to.be.gt(wethBalanceBeforeWithdraw);
            expect(spwethEOAbalanceAfterWithdraw).to.be.lt(balanceAfter);
        });
        it('... should supply WETH and then withdraw it on Spark using optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);
            // ----------------------------------------------------------------

            const wethBalanceBeforeWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA before withdraw:${wethBalanceBeforeWithdraw.toString()}`);
            await sparkWithdrawCalldataOptimised(proxy, sparkMarket, assetId, amount, to);

            const spwethEOAbalanceAfterWithdraw = await balanceOf(spWETH, proxy.address);

            const wethBalanceAfterWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA after withdraw:${wethBalanceAfterWithdraw.toString()}`);

            expect(wethBalanceAfterWithdraw).to.be.gt(wethBalanceBeforeWithdraw);
            expect(spwethEOAbalanceAfterWithdraw).to.be.lt(balanceAfter);
        });
    });
};

const sparkPaybackTest = async () => {
    describe('Spark-Payback', function () {
        this.timeout(150000);

        let senderAcc; let proxy; let pool; let snapshotId;

        let WETH_ADDRESS; let spWETH; let DAI_ADDRESS;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            DAI_ADDRESS = addrs[network].DAI_ADDRESS;

            spWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
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

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

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

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

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

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

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
    describe('Spark-Swap-Borrow-Rate', function () {
        this.timeout(150000);

        let senderAcc; let proxy; let pool; let snapshotId;

        let WETH_ADDRESS; let spWETH; let DAI_ADDRESS;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            DAI_ADDRESS = addrs[network].DAI_ADDRESS;

            spWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        // TODO - find assets that can be stable borrowed at test runtime
        // at the time of this commit no asset can be stable borrowed
        it.skip('... should supply WETH and borrow variable rate DAI then change it to stable on Spark', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

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
        it.skip('... should supply WETH and borrow variable rate DAI then change it to stable on Spark using optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

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
    describe('Spark-Set-EMode', function () {
        this.timeout(150000);

        let senderAcc; let proxy; let snapshotId; let pool;
        let WETH_ADDRESS; let spWETH;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;

            spWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
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

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

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

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

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
    describe('Spark-Coll-Switch', function () {
        this.timeout(150000);

        let senderAcc; let proxy; let pool; let snapshotId;

        let WETH_ADDRESS; let spWETH; let DAI_ADDRESS; let spDai;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            DAI_ADDRESS = addrs[network].DAI_ADDRESS;

            spWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
            spDai = (await pool.getReserveData(DAI_ADDRESS)).aTokenAddress;
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it('... should supply WETH and DAI to Spark then turn off collateral for them', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

            const amountDai = hre.ethers.utils.parseUnits('1000', 18);
            await setBalance(DAI_ADDRESS, senderAcc.address, amountDai);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on eoa: ${daiBalanceBefore.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const daiAssetId = reserveDataDAI.id;

            const balanceBeforeADAI = await balanceOf(spDai, proxy.address);
            console.log(`aDAI on proxy before: ${balanceBeforeADAI.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, DAI_ADDRESS, daiAssetId, from);

            const balanceAfterADAI = await balanceOf(spDai, proxy.address);
            console.log(`aDAI on proxy after: ${balanceAfterADAI.toString()}`);

            //-----------------------------------------------------
            await sparkSwitchCollateral(
                proxy, sparkMarket, 2, [assetId, daiAssetId], [false, false],
            );
        });
        it('... should supply WETH and DAI to Spark then turn off collateral for them', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

            const amountDai = hre.ethers.utils.parseUnits('1000', 18);
            await setBalance(DAI_ADDRESS, senderAcc.address, amountDai);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on eoa: ${daiBalanceBefore.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const daiAssetId = reserveDataDAI.id;

            const balanceBeforeADAI = await balanceOf(spDai, proxy.address);
            console.log(`aDAI on proxy before: ${balanceBeforeADAI.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, DAI_ADDRESS, daiAssetId, from);

            const balanceAfterADAI = await balanceOf(spDai, proxy.address);
            console.log(`aDAI on proxy after: ${balanceAfterADAI.toString()}`);

            //-----------------------------------------------------
            await sparkSwitchCollateralCallDataOptimised(
                proxy, sparkMarket, 2, [assetId, daiAssetId], [false, false],
            );
        });
    });
};
const sparkSpTokenPaybackTest = async () => {
    describe('Spark-SpTokenPayback', function () {
        this.timeout(150000);

        let senderAcc; let proxy; let pool; let snapshotId;

        let WETH_ADDRESS; let spWETH; let DAI_ADDRESS;
        const network = hre.network.config.name;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddres = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            DAI_ADDRESS = addrs[network].DAI_ADDRESS;

            spWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it('... should supply WETH and borrow DAI then repay part of debt using spDai on Spark', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrow(proxy, sparkMarket, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);

            const spDai = reserveDataDAI.aTokenAddress;

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            const paybackAmount = hre.ethers.utils.parseUnits('500', 18);

            await setBalance(spDai, from, paybackAmount);

            await approve(spDai, proxy.address);
            const spDaiBalanceBefore = await balanceOf(spDai, senderAcc.address);
            console.log(`aDAI on EOA before SpTokenPayback: ${spDaiBalanceBefore.toString()}`);
            await sparkSpTokenPayback(
                proxy, sparkMarket, paybackAmount, from, 2, reserveDataDAI.id, spDai,
            );

            const spDaiBalanceAfter = await balanceOf(spDai, senderAcc.address);
            console.log(`aDAI on EOA after SpTokenPayback: ${spDaiBalanceAfter.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);
            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });

        it('... should supply WETH and borrow DAI then repay part of debt using spDai on Spark using optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrow(proxy, sparkMarket, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);

            const spDai = reserveDataDAI.aTokenAddress;

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            const paybackAmount = hre.ethers.utils.parseUnits('500', 18);

            await setBalance(spDai, from, paybackAmount);

            await approve(spDai, proxy.address);
            const spDaiBalanceBefore = await balanceOf(spDai, senderAcc.address);
            console.log(`aDAI on EOA before SpTokenPayback: ${spDaiBalanceBefore.toString()}`);
            await sparkSpTokenPaybackCalldataOptimised(
                proxy, sparkMarket, paybackAmount, from, 2, reserveDataDAI.id, spDai,
            );

            const spDaiBalanceAfter = await balanceOf(spDai, senderAcc.address);
            console.log(`aDAI on EOA after SpTokenPayback: ${spDaiBalanceAfter.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);

            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });
        it('... should supply WETH and borrow DAI then repay ALL debt using spDai on Spark using optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;
            const to = senderAcc.address;

            const balanceBefore = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy before: ${balanceBefore.toString()}`);
            await sparkSupply(proxy, sparkMarket, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(spWETH, proxy.address);
            console.log(`spWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await sparkBorrow(proxy, sparkMarket, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);

            const spDai = reserveDataDAI.aTokenAddress;

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            const paybackAmount = hre.ethers.utils.parseUnits('1500', 18);

            await setBalance(spDai, from, paybackAmount);

            await approve(spDai, proxy.address);
            const spDaiBalanceBefore = await balanceOf(spDai, senderAcc.address);
            console.log(`aDAI on EOA before SpTokenPayback: ${spDaiBalanceBefore.toString()}`);
            await sparkSpTokenPaybackCalldataOptimised(
                proxy, sparkMarket, paybackAmount, from, 2, reserveDataDAI.id,
            );

            const spDaiBalanceAfter = await balanceOf(spDai, senderAcc.address);
            console.log(`aDAI on EOA after SpTokenPayback: ${spDaiBalanceAfter.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);

            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
            expect(debtAmountAfter).to.be.eq(0);
        });
    });
};

// TODO : find owner to impersonate
const sparkClaimRewardsTest = async () => {
    describe('Spark-ClaimRewards', function () {
        this.timeout(150000);

        let snapshotId;

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });
        it('... should claim rewards', async () => {
            const ownerAcc = '0xEA57Dc30959eb17c506E4dA095fa9181f3E0Ac6D';
            let proxy = await getProxy(ownerAcc);
            await impersonateAccount(ownerAcc);
            proxy = proxy.connect(await hre.ethers.provider.getSigner(ownerAcc));
            const aWBTC = '0x078f358208685046a11C85e8ad32895DED33A249';
            const spWETH = '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8';
            const aVariableUSDC = '0xFCCf3cAbbe80101232d343252614b6A3eE81C989';

            const opAmount = '2168856438217507949';
            const opToken = '0x4200000000000000000000000000000000000042';

            const balanceBefore = await balanceOf(opToken, ownerAcc);
            console.log(balanceBefore.toString());

            await sparkClaimRewards(
                proxy, [aWBTC, spWETH, aVariableUSDC], opAmount, ownerAcc, opToken,
            );

            const balanceAfter = await balanceOf(opToken, ownerAcc);
            console.log(balanceAfter.toString());

            expect(balanceAfter.sub(balanceBefore)).to.be.eq(opAmount);
        });
    });
};

const sDaiWrapTest = async () => describe('sDai-Wrap', () => {
    const daiAddr = getAssetInfo('DAI').address;
    const sDaiAddr = getAssetInfo('sDAI').address;
    const depositAmount = Float2BN('5000');

    it('... should deposit dai and mint sDai', async () => {
        const [senderAcc] = await hre.ethers.getSigners();
        const proxy = await getProxy(senderAcc.address);

        await setBalance(sDaiAddr, senderAcc.address, Float2BN('0'));
        await setBalance(daiAddr, senderAcc.address, depositAmount);
        await approve(daiAddr, proxy.address);
        await sDaiWrap(
            proxy,
            depositAmount,
            senderAcc.address,
            senderAcc.address,
        );

        const sdaiPrice = await hre.ethers
            .getContractAt('IAggregatorV3', '0xb9E6DBFa4De19CCed908BcbFe1d015190678AB5f')
            .then((c) => c.latestAnswer());

        const expectedSDaiAmount = depositAmount.mul(1e8).div(sdaiPrice).mul(99).div(100);

        expect(await balanceOf(sDaiAddr, senderAcc.address)).to.be.gt(expectedSDaiAmount);
    });

    it('... should deposit maxUint dai and mint sDai', async () => {
        const [senderAcc] = await hre.ethers.getSigners();
        const proxy = await getProxy(senderAcc.address);

        await setBalance(sDaiAddr, senderAcc.address, Float2BN('0'));
        await setBalance(daiAddr, senderAcc.address, depositAmount);
        await approve(daiAddr, proxy.address);
        await sDaiWrap(
            proxy,
            hre.ethers.constants.MaxUint256,
            senderAcc.address,
            senderAcc.address,
        );

        const sdaiPrice = await hre.ethers
            .getContractAt('IAggregatorV3', '0xb9E6DBFa4De19CCed908BcbFe1d015190678AB5f')
            .then((c) => c.latestAnswer());

        const expectedSDaiAmount = depositAmount.mul(1e8).div(sdaiPrice).mul(99).div(100);

        expect(await balanceOf(sDaiAddr, senderAcc.address)).to.be.gt(expectedSDaiAmount);
    });
});

const sDaiUnwrapTest = async () => describe('sDai-Unwrap', () => {
    const daiAddr = getAssetInfo('DAI').address;
    const sDaiAddr = getAssetInfo('sDAI').address;
    const redeemAmount = Float2BN('5000');

    it('... should redeem sDai for dai', async () => {
        const [senderAcc] = await hre.ethers.getSigners();
        const proxy = await getProxy(senderAcc.address);

        await setBalance(daiAddr, senderAcc.address, Float2BN('0'));
        await setBalance(sDaiAddr, senderAcc.address, redeemAmount);
        await approve(sDaiAddr, proxy.address);
        await sDaiUnwrap(
            proxy,
            redeemAmount,
            senderAcc.address,
            senderAcc.address,
        );

        const sdaiPrice = await hre.ethers
            .getContractAt('IAggregatorV3', '0xb9E6DBFa4De19CCed908BcbFe1d015190678AB5f')
            .then((c) => c.latestAnswer());

        const expectedSDaiAmount = redeemAmount.mul(sdaiPrice).div(1e8).mul(99).div(100);
        expect(await balanceOf(daiAddr, senderAcc.address)).to.be.gt(expectedSDaiAmount);
    });

    it('... should redeem maxUint sDai for dai', async () => {
        const [senderAcc] = await hre.ethers.getSigners();
        const proxy = await getProxy(senderAcc.address);

        await setBalance(daiAddr, senderAcc.address, Float2BN('0'));
        await setBalance(sDaiAddr, senderAcc.address, redeemAmount);
        await approve(sDaiAddr, proxy.address);
        await sDaiUnwrap(
            proxy,
            hre.ethers.constants.MaxUint256,
            senderAcc.address,
            senderAcc.address,
        );

        const sdaiPrice = await hre.ethers
            .getContractAt('IAggregatorV3', '0xb9E6DBFa4De19CCed908BcbFe1d015190678AB5f')
            .then((c) => c.latestAnswer());

        const expectedSDaiAmount = redeemAmount.mul(sdaiPrice).div(1e8).mul(99).div(100);
        expect(await balanceOf(daiAddr, senderAcc.address)).to.be.gt(expectedSDaiAmount);
    });
});
const sparkDelegateCreditTest = async () => {
    describe('Spark-DelegateCreditTest', function () {
        this.timeout(150000);
        let senderAcc; let
            proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... delegate credit on Spark', async () => {
            const delegatee = '0x000000000000000000000000000000000000dEaD';
            const assetId = 0;
            const rateMode = 2;
            const amount = hre.ethers.utils.parseUnits('100', 18);
            await sparkDelegateCredit(proxy, assetId, amount, rateMode, delegatee);
            const sparkDelegateAddr = await getAddrFromRegistry('SparkDelegateCredit');
            const sparkDelegateContract = await hre.ethers.getContractAt('SparkDelegateCredit', sparkDelegateAddr);
            const delegatedAmount = await sparkDelegateContract.getCreditDelegation(
                sparkMarket, assetId, rateMode, proxy.address, delegatee,
            );
            console.log(delegatedAmount.toString());
            expect(delegatedAmount).to.be.eq(amount);
        }).timeout(50000);
    });
};

const sparkDeployContracts = async () => {
    await redeploy('SparkSupply');
    await redeploy('SparkBorrow');
    await redeploy('SparkSpTokenPayback');
    await redeploy('SparkCollateralSwitch');
    await redeploy('SparkPayback');
    await redeploy('SparkSetEMode');
    await redeploy('SparkSwapBorrowRateMode');
    await redeploy('SparkWithdraw');
    await redeploy('SparkDelegateCredit');

    await redeploy('SDaiWrap');
    await redeploy('SDaiUnwrap');
};

const sparkFullTest = async () => {
    await sparkDeployContracts();

    await sDaiWrapTest();
    await sDaiUnwrapTest();

    await sparkSupplyTest();
    await sparkBorrowTest();
    await sparkWithdrawTest();
    await sparkSwapBorrowRateTest();
    await sparkSetEModeTest();
    await sparkPaybackTest();
    await sparkCollSwitchTest();
    await sparkSpTokenPaybackTest();
    await sparkDelegateCreditTest();
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
    sparkSpTokenPaybackTest,
    sparkClaimRewardsTest,
    sDaiWrapTest,
    sDaiUnwrapTest,
    sparkDelegateCreditTest,
};
