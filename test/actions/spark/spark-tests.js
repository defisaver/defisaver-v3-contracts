const { expect } = require('chai');

const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');
const {
    getProxy,
    balanceOf, setBalance, redeploy,
    takeSnapshot, revertToSnapshot, addrs, approve, impersonateAccount,
    Float2BN, getAddrFromRegistry,
    network,
    sendEther,
    stopImpersonatingAccount,
} = require('../../utils/utils');

const sparkMarket = addrs[network].SPARK_MARKET;

const {
    sparkSupply, sparkSupplyCalldataOptimised, sparkBorrow, sparkWithdraw,
    sparkWithdrawCalldataOptimised, sparkPayback, sparkPaybackCalldataOptimised,
    sparkSwapBorrowRateCalldataOptimised, sparkSwapBorrowRate, sparkSetEModeCalldataOptimised,
    sparkSetEMode, sparkSwitchCollateral, sparkSwitchCollateralCallDataOptimised,
    sparkSpTokenPaybackCalldataOptimised, sparkSpTokenPayback,
    sparkBorrowCalldataOptimised, sparkClaimRewards, sDaiWrap, sDaiUnwrap, sparkDelegateCredit,
    sparkSPKClaim,
} = require('../../utils/actions');

const sparkSupplyTest = async () => {
    describe('Spark-Supply', function () {
        this.timeout(150000);

        let senderAcc; let proxy; let pool; let snapshotId;
        let WETH_ADDRESS; let spWETH;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);
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

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);
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

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);
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

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);
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

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);
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

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);
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
        it('... should supply WETH to Spark with calldata optimised', async () => {
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

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);
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

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', sparkMarket);
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);
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

const sparkClaimSPKTest = async () => {
    describe('Spark-SPK-Claim', function () {
        this.timeout(150000);
        let proxy;
        let SPK_TOKEN_ADDRESS;
        let owner;
        let sparkOwner;
        before(async () => {
            owner = '0x6C9C6Ea3Bc1d243017F5c7c2203343d958D3D7aE';
            sparkOwner = '0x6fe588fdcc6a34207485cc6e47673f59ccedf92b';
            await sendEther((await hre.ethers.getSigners())[0], owner, '10');
            await sendEther((await hre.ethers.getSigners())[0], sparkOwner, '10');
            proxy = await hre.ethers.getContractAt('ISafe', '0xa1695b38d463c7d53809c5f1899840b5ad02879e');
            SPK_TOKEN_ADDRESS = '0xc20059e0317de91738d13af027dfc4a50781b066';

            // Can be deleted later
            await impersonateAccount(sparkOwner);
            let spkToken = await hre.ethers.getContractAt('IERC20', SPK_TOKEN_ADDRESS);
            spkToken = spkToken.connect(await hre.ethers.provider.getSigner(sparkOwner));
            await spkToken.approve('0xCBA0C0a2a0B6Bb11233ec4EA85C5bFfea33e724d', hre.ethers.constants.MaxUint256);
            await spkToken.approve('0x7ac96180C4d6b2A328D3a19ac059D0E7Fc3C6d41', hre.ethers.constants.MaxUint256);
            await stopImpersonatingAccount(sparkOwner);
        });
        it('... should claim SPK tokens from Ignition Rewards', async () => {
            const rewardsContractAddress = '0xCBA0C0a2a0B6Bb11233ec4EA85C5bFfea33e724d';
            const root = '0x200133a6af5486f9c3ae64366f19a65b0d8524ed57d2645254dfc90fb3299d73';
            // needs to set root at rewards contract from 0x6fe588fdcc6a34207485cc6e47673f59ccedf92b
            // can be deleted later
            let rewardsContract = await hre.ethers.getContractAt('ISparkRewards', rewardsContractAddress);
            rewardsContract = rewardsContract.connect(
                await hre.ethers.provider.getSigner(sparkOwner),
            );
            await impersonateAccount(sparkOwner);
            await rewardsContract.setMerkleRoot(root);
            await stopImpersonatingAccount(sparkOwner);

            const epoch = 1;
            const amount = '5400000000000000000000';
            const proof = [
                '0xdcff939a31319f5fe26d36daa3f82b17dd271cd239ca38cb165313284d3eba35',
                '0x3061aeab57006d12aef6b532b372c82adc586d5f881cb6f4f53c0206781614ed',
                '0x96069db5ef65b69c3fd21489e99c92e4f7890d83849013a49bb9fc5fc6a2fc60',
                '0x26b6cdd562f48ce7efc502418915176d537a59be0bd748587acbb3e2a0385e91',
                '0x9090205a4998121ddaa0b30431d4a98feca4b8ad4a02c166912beb3779eb9c19',
                '0x5030a8e39b301bb961ffa2c65b42d7e664e114cc93096cb5cc62f201d7a7318a',
                '0x8e993533865c83fd6f64d852fec034257f4beec5ca1224cf534e1c8264bd2466',
                '0xfe1ee916d6fb6d16a544e4a0888d28b03340d5aad8c6e4d17055682aab245be7',
                '0x2f0569e35deaddd76eb8a9f0596fa40a0ed7f34c8ac5615657ee1ab0453dda5d',
                '0x94490776b528bf6dd18b5ad566f272fd33f27b08c6a055803d9272a597cd20af',
                '0x6573c1b93dcd64387590f2f57f7086fd3bf7bbba76dbfaaa47cbef9b8ee40fca',
                '0xca4c8b7887198b5f2ac03880655405f8ddd704783ec7d7ce559b6883fdcfd975',
                '0x161d5ae893608aba59035d7531e84f92c94026a3016be401d30ab5c6c2dd34fe',
                '0xfa708ab8972a4b60c2d0eada3cdd782849386ef6aca918e5f0edb0cd1e157fdb',
                '0x08146e9e13a234a0b58c3f10e5c62fe700b1d1e39c4167f5449d52f4d41c3a95',
            ];

            await impersonateAccount(owner);
            const ownerAcc = await hre.ethers.provider.getSigner(owner);
            const impersonatedSW = proxy.connect(ownerAcc);

            const eoaBalanceBefore = await balanceOf(SPK_TOKEN_ADDRESS, owner);
            const smartWalletBalanceBefore = await balanceOf(SPK_TOKEN_ADDRESS, proxy.address);
            await sparkSPKClaim(
                rewardsContractAddress, owner, epoch, proxy.address,
                SPK_TOKEN_ADDRESS, amount, root, proof, impersonatedSW,
            );
            const eoaBalanceAfter = await balanceOf(SPK_TOKEN_ADDRESS, owner);
            const smartWalletBalanceAfter = await balanceOf(SPK_TOKEN_ADDRESS, proxy.address);
            expect(smartWalletBalanceAfter).to.be.eq(smartWalletBalanceBefore);
            expect(eoaBalanceAfter.sub(eoaBalanceBefore))
                .to.be.eq(hre.ethers.utils.parseUnits(amount, 0));
        });
        it('... should claim SPK tokens from PLF Rewards', async () => {
            const rewardsContractAddress = '0x7ac96180C4d6b2A328D3a19ac059D0E7Fc3C6d41';
            const root = '0xf9b628043057186b867f8309d65b8eaa9bf79c8491ef1d3b407eddaab3be15c9';
            // needs to set root at rewards contract from 0x6fe588fdcc6a34207485cc6e47673f59ccedf92b
            // can be deleted later
            let rewardsContract = await hre.ethers.getContractAt('ISparkRewards', rewardsContractAddress);
            rewardsContract = rewardsContract.connect(
                await hre.ethers.provider.getSigner(sparkOwner),
            );
            await impersonateAccount(sparkOwner);
            await rewardsContract.setMerkleRoot(root);
            await stopImpersonatingAccount(sparkOwner);

            const epoch = 1;
            const amount = '11991543419766236000000';
            const proof = [
                '0x11a73e81fa5bba9c349da805a0099fb690e0b5835ad5246cae71d6493a8dc7c4',
                '0xbe77760b18423fe22a9946ee16d47004c74987e77958df5014a14768f1a1917d',
                '0x11cc3732d8c123cf4b60dcaaa296032845d0e708f4b3730d305f7ec3a9881c0b',
                '0xcd52511c037f9f90eca7adebb6913c18b775d4806256f8823094643d0cc0ebd1',
                '0xf52aff566fdf456ed5af1ec3168cfcde99a1e7cfe933e6a7bea453de2a32a930',
                '0x33f343e3a6b5fc084d6a32931dbfb6c558ea4eabc91b0bf7df9c29a306c2a604',
                '0x5cfc592241589541313ed84b3e9926fc2844dc53294b0acdd15df172456024b5',
                '0xa63646580dcfbb7618ffbe0ca73e7f930733f4861be2537903426f63f0536d55',
                '0x562cb9e377665a415e150f7e93da1946fdeba6a68b88fb24a2c78195df944cee',
                '0x85231cfc97928bbea5d1c47bd783ab579f880ea078f8d7f7873dcd4c1c5c1054',
                '0x6f5f6e5481ac7e0c1ae0ade01b33325199d949e43c48bd5fb0b97f526a7864a9',
                '0xc0af85e094e882ee8639a741751adef04d27447de8bad39c3c2c69f989a3671f',
                '0x32700f18d1adba3282273162fa300a2c85ba580fddd10f3401500e3cb95927b1',
                '0x4e26698f1aefb739a359060ab117b694297f15b80ed31c928863d569d9884e64',
                '0x69d513ad3f500dd8649f027b43a36e6438b2cc2983b7dda1564252cd8c353ad0',
            ];
            await impersonateAccount(owner);
            const ownerAcc = await hre.ethers.provider.getSigner(owner);
            const impersonatedSW = proxy.connect(ownerAcc);

            const eoaBalanceBefore = await balanceOf(SPK_TOKEN_ADDRESS, owner);
            const smartWalletBalanceBefore = await balanceOf(SPK_TOKEN_ADDRESS, proxy.address);
            await sparkSPKClaim(
                rewardsContractAddress, owner, epoch, proxy.address,
                SPK_TOKEN_ADDRESS, amount, root, proof, impersonatedSW,
            );
            const eoaBalanceAfter = await balanceOf(SPK_TOKEN_ADDRESS, owner);
            const smartWalletBalanceAfter = await balanceOf(SPK_TOKEN_ADDRESS, proxy.address);
            expect(smartWalletBalanceAfter).to.be.eq(smartWalletBalanceBefore);
            expect(eoaBalanceAfter.sub(eoaBalanceBefore))
                .to.be.eq(hre.ethers.utils.parseUnits(amount, 0));
        });
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
    await redeploy('SparkSPKClaim');
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
    await sparkClaimSPKTest();
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
    sparkClaimSPKTest,
};
