const { expect } = require('chai');

const hre = require('hardhat');

const { configure } = require('@defisaver/sdk');
const {
    getProxy,
    balanceOf, setBalance, redeploy,
    takeSnapshot, revertToSnapshot, AAVE_MARKET_OPTIMISM, addrs, approve,
} = require('../utils');
const {
    aaveV3Supply, aaveV3SupplyCalldataOptimised, aaveV3Borrow, aaveV3Withdraw,
    aaveV3WithdrawCalldataOptimised, aaveV3Payback, aaveV3PaybackCalldataOptimised,
    aaveV3SwapBorrowRateCalldataOptimised, aaveV3SwapBorrowRate, aaveV3SetEModeCalldataOptimised,
    aaveV3SetEMode, aaveV3SwitchCollateral, aaveV3SwitchCollateralCallDataOptimised,
    aaveV3ATokenPaybackCalldataOptimised, aaveV3ATokenPayback, aaveV3BorrowCalldataOptimised,
} = require('../actions');

const aaveV3SupplyTest = async () => {
    describe('Aave-Supply-L2', function () {
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
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', AAVE_MARKET_OPTIMISM);
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

        it('... should supply WETH to Aave V3 optimism', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        it('... should supply WETH to Aave V3 optimism using optimised calldata', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);

            await aaveV3SupplyCalldataOptimised(
                proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });
    });
};

const aaveV3BorrowTest = async () => {
    describe('Aave-Borrow-L2', function () {
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
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', AAVE_MARKET_OPTIMISM);
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

        it('... should supply WETH and borrow DAI on Aave V3 Optimism', async () => {
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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        });
        it('... should supply WETH and borrow DAI on Aave V3 Optimism using optimised calldata', async () => {
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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3BorrowCalldataOptimised(
                proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 2, reserveDataDAI.id,
            );

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        });
    });
};

const aaveV3WithdrawTest = async () => {
    describe('Aave-Withdraw-L2', function () {
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
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', AAVE_MARKET_OPTIMISM);
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

        it('... should supply WETH and then withdraw it on Aave V3 optimism', async () => {
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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
            // ----------------------------------------------------------------

            const wethBalanceBeforeWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA before withdraw:${wethBalanceBeforeWithdraw.toString()}`);
            await aaveV3Withdraw(proxy, AAVE_MARKET_OPTIMISM, assetId, amount, to);

            const awethEOAbalanceAfterWithdraw = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const wethBalanceAfterWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA after withdraw:${wethBalanceAfterWithdraw.toString()}`);
            expect(wethBalanceAfterWithdraw).to.be.gt(wethBalanceBeforeWithdraw);
            expect(awethEOAbalanceAfterWithdraw).to.be.lt(balanceAfter);
        });
        it('... should supply WETH and then withdraw it on Aave V3 optimism using optimised calldata', async () => {
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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
            // ----------------------------------------------------------------

            const wethBalanceBeforeWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA before withdraw:${wethBalanceBeforeWithdraw.toString()}`);
            await aaveV3WithdrawCalldataOptimised(proxy, AAVE_MARKET_OPTIMISM, assetId, amount, to);

            const awethEOAbalanceAfterWithdraw = await balanceOf(aWETH, proxy.address);

            const wethBalanceAfterWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA after withdraw:${wethBalanceAfterWithdraw.toString()}`);

            expect(wethBalanceAfterWithdraw).to.be.gt(wethBalanceBeforeWithdraw);
            expect(awethEOAbalanceAfterWithdraw).to.be.lt(balanceAfter);
        });
    });
};

const aaveV3PaybackTest = async () => {
    describe('AaveV3-Payback-L2', function () {
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
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', AAVE_MARKET_OPTIMISM);
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

        it('... should supply WETH and borrow DAI then repay the debt to Aave V3 on optimism', async () => {
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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            await approve(DAI_ADDRESS, proxy.address);

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            await aaveV3Payback(
                proxy, AAVE_MARKET_OPTIMISM, amountDai, from, 2, reserveDataDAI.id, DAI_ADDRESS,
            );

            const daiBalanceAfterPayback = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after payback:${daiBalanceAfterPayback.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);
            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });
        it('... should supply WETH and borrow DAI then repay the debt to Aave V3 on optimism using optimised calldata', async () => {
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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            await approve(DAI_ADDRESS, proxy.address);

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            await aaveV3Payback(
                proxy, AAVE_MARKET_OPTIMISM, amountDai, from, 2, reserveDataDAI.id, DAI_ADDRESS,
            );

            const daiBalanceAfterPayback = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after payback:${daiBalanceAfterPayback.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);

            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });
        it('... should supply WETH and borrow DAI then repay uint(-1) ALL debt to Aave V3 on optimism using optimised calldata', async () => {
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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 2, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            await setBalance(DAI_ADDRESS, senderAcc.address, amountDai.mul(2));
            await approve(DAI_ADDRESS, proxy.address);

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            await aaveV3PaybackCalldataOptimised(
                proxy,
                AAVE_MARKET_OPTIMISM,
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

const aaveV3SwapBorrowRateTest = async () => {
    describe('Aave-Swap-Borrow-Rate-L2', function () {
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
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', AAVE_MARKET_OPTIMISM);
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

        it('... should supply WETH and borrow variable rate DAI then change it to stable on Aave V3 Optimism', async () => {
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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 1, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);

            const variableRateDai = reserveDataDAI.variableDebtTokenAddress;
            const stableRateDai = reserveDataDAI.stableDebtTokenAddress;

            const variableDaiDebtBefore = await balanceOf(variableRateDai, proxy.address);
            const stableDaiDebtBefore = await balanceOf(stableRateDai, proxy.address);
            console.log(`Variable debt before rate swap ${variableDaiDebtBefore.toString()}`);
            console.log(`Stable debt before rate swap ${stableDaiDebtBefore.toString()}`);

            await aaveV3SwapBorrowRate(proxy, reserveDataDAI.id, 1);

            const variableDaiDebtAfter = await balanceOf(variableRateDai, proxy.address);
            const stableDaiDebtAfter = await balanceOf(stableRateDai, proxy.address);
            console.log(`Variable debt after rate swap ${variableDaiDebtAfter.toString()}`);
            console.log(`Stable debt after rate swap ${stableDaiDebtAfter.toString()}`);
        });

        it('... should supply WETH and borrow variable rate DAI then change it to stable on Aave V3 Optimism using optimised calldata', async () => {
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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 1, reserveDataDAI.id);

            const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);

            const variableRateDai = reserveDataDAI.variableDebtTokenAddress;
            const stableRateDai = reserveDataDAI.stableDebtTokenAddress;

            const variableDaiDebtBefore = await balanceOf(variableRateDai, proxy.address);
            const stableDaiDebtBefore = await balanceOf(stableRateDai, proxy.address);
            console.log(`Variable debt before rate swap ${variableDaiDebtBefore.toString()}`);
            console.log(`Stable debt before rate swap ${stableDaiDebtBefore.toString()}`);

            await aaveV3SwapBorrowRateCalldataOptimised(
                proxy, reserveDataDAI.id, 1,
            );

            const variableDaiDebtAfter = await balanceOf(variableRateDai, proxy.address);
            const stableDaiDebtAfter = await balanceOf(stableRateDai, proxy.address);
            console.log(`Variable debt after rate swap ${variableDaiDebtAfter.toString()}`);
            console.log(`Stable debt after rate swap ${stableDaiDebtAfter.toString()}`);
        });
    });
};
const aaveV3SetEModeTest = async () => {
    describe('Aave-Set-EMode-L2', function () {
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
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', AAVE_MARKET_OPTIMISM);
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

        it('... should change EMode on Aave V3 optimism', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            let userEmode = await pool.getUserEMode(proxy.address);
            console.log(`Users emode before changing: ${userEmode}`);
            expect(userEmode).to.be.eq(0);

            await aaveV3SetEMode(proxy, AAVE_MARKET_OPTIMISM, 1);

            userEmode = await pool.getUserEMode(proxy.address);

            expect(userEmode).to.be.eq(1);
            console.log(`Users emode before changing: ${userEmode}`);
        });
        it('... should supply WETH to Aave V3 optimism with calldata optimised', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            let userEmode = await pool.getUserEMode(proxy.address);
            console.log(`Users emode before changing: ${userEmode}`);
            expect(userEmode).to.be.eq(0);

            await aaveV3SetEModeCalldataOptimised(proxy, AAVE_MARKET_OPTIMISM, 1);

            userEmode = await pool.getUserEMode(proxy.address);
            console.log(`Users emode before changing: ${userEmode}`);
            expect(userEmode).to.be.eq(1);
        });
    });
};
const aaveV3CollSwitchTest = async () => {
    describe('Aave-Coll-Switch-L2', function () {
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
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', AAVE_MARKET_OPTIMISM);
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

        it('... should supply WETH and DAI to Aave V3 optimism then turn off collateral for them', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, DAI_ADDRESS, daiAssetId, from);

            const balanceAfterADAI = await balanceOf(aDAI, proxy.address);
            console.log(`aDAI on proxy after: ${balanceAfterADAI.toString()}`);

            //-----------------------------------------------------
            await aaveV3SwitchCollateral(
                proxy, AAVE_MARKET_OPTIMISM, 2, [assetId, daiAssetId], [false, false],
            );
        });
        it('... should supply WETH and DAI to Aave V3 optimism then turn off collateral for them', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, DAI_ADDRESS, daiAssetId, from);

            const balanceAfterADAI = await balanceOf(aDAI, proxy.address);
            console.log(`aDAI on proxy after: ${balanceAfterADAI.toString()}`);

            //-----------------------------------------------------
            await aaveV3SwitchCollateralCallDataOptimised(
                proxy, AAVE_MARKET_OPTIMISM, 2, [assetId, daiAssetId], [false, false],
            );
        });
    });
};
const aaveV3ATokenPaybackTest = async () => {
    describe('AaveV3-ATokenPayback-L2', function () {
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
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', AAVE_MARKET_OPTIMISM);
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

        it('... should supply WETH and borrow DAI then repay part of debt using aDAI on Aave V3 on optimism', async () => {
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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 2, reserveDataDAI.id);

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
            await aaveV3ATokenPayback(
                proxy, AAVE_MARKET_OPTIMISM, paybackAmount, from, 2, reserveDataDAI.id, aDAI,
            );

            const aDaiBalanceAfter = await balanceOf(aDAI, senderAcc.address);
            console.log(`aDAI on EOA after ATokenPayback: ${aDaiBalanceAfter.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);
            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });

        it('... should supply WETH and borrow DAI then repay part of debt using aDAI on Aave V3 on optimism using optimised calldata', async () => {
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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 2, reserveDataDAI.id);

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
            await aaveV3ATokenPaybackCalldataOptimised(
                proxy, AAVE_MARKET_OPTIMISM, paybackAmount, from, 2, reserveDataDAI.id, aDAI,
            );

            const aDaiBalanceAfter = await balanceOf(aDAI, senderAcc.address);
            console.log(`aDAI on EOA after ATokenPayback: ${aDaiBalanceAfter.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);

            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });
        it('... should supply WETH and borrow DAI then repay ALL debt using aDAI on Aave V3 on optimism using optimised calldata', async () => {
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
            await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 2, reserveDataDAI.id);

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
            await aaveV3ATokenPaybackCalldataOptimised(
                proxy, AAVE_MARKET_OPTIMISM, paybackAmount, from, 2, reserveDataDAI.id,
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

const aaveV3DeployContracts = async () => {
    await redeploy('AaveV3Supply');
    await redeploy('AaveV3Borrow');
    await redeploy('AaveV3ATokenPayback');
    await redeploy('AaveV3CollateralSwitch');
    await redeploy('AaveV3Payback');
    await redeploy('AaveV3SetEMode');
    await redeploy('AaveV3SwapBorrowRateMode');
    await redeploy('AaveV3Withdraw');
};

const aaveV3FullTest = async () => {
    await aaveV3DeployContracts();

    await aaveV3SupplyTest();
    await aaveV3BorrowTest();
    await aaveV3WithdrawTest();
    await aaveV3SwapBorrowRateTest();
    await aaveV3SetEModeTest();
    await aaveV3PaybackTest();
    await aaveV3CollSwitchTest();
    await aaveV3ATokenPaybackTest();
};
module.exports = {
    aaveV3FullTest,
    aaveV3SupplyTest,
    aaveV3BorrowTest,
    aaveV3WithdrawTest,
    aaveV3SwapBorrowRateTest,
    aaveV3SetEModeTest,
    aaveV3PaybackTest,
    aaveV3CollSwitchTest,
    aaveV3ATokenPaybackTest,
};
