const { expect } = require('chai');

const hre = require('hardhat');

const {
    getProxy,
    balanceOf, setBalance, redeploy,
    takeSnapshot, revertToSnapshot, addrs, approve,
    impersonateAccount, getAddrFromRegistry,
    resetForkToBlock,
    sendEther,
    timeTravel,
} = require('../../utils/utils');
const { isAssetBorrowableV3 } = require('../../utils/aave');
const {
    aaveV3Supply, aaveV3SupplyCalldataOptimised, aaveV3Borrow, aaveV3Withdraw,
    aaveV3WithdrawCalldataOptimised, aaveV3Payback, aaveV3PaybackCalldataOptimised,
    aaveV3SetEModeCalldataOptimised,
    aaveV3SetEMode, aaveV3SwitchCollateral, aaveV3SwitchCollateralCallDataOptimised,
    aaveV3ATokenPaybackCalldataOptimised, aaveV3ATokenPayback, aaveV3BorrowCalldataOptimised,
    aaveV3ClaimRewards,
    aaveV3DelegateCredit,
    aaveV3DelegateCreditWithSig,
    claimAaveFromStkGho,
    startUnstakeGho,
    finalizeUnstakeGho,
} = require('../../utils/actions');

const aaveV3SupplyTest = async () => {
    describe('Aave-Supply', function () {
        const network = hre.network.config.name;
        this.timeout(150000);
        let senderAcc; let proxy; let pool; let snapshotId;
        let WETH_ADDRESS; let aWETH;

        before(async () => {
            console.log('NETWORK:', network);
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();
            const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
            pool = await hre.ethers.getContractAt(poolContractName, poolAddress);

            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it(`... should supply WETH to Aave V3 ${network}`, async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        it(`... should supply WETH to Aave V3 ${network} using optimised calldata`, async () => {
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
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });
    });
};

const aaveV3BorrowTest = async () => {
    describe('Aave-Borrow', function () {
        const network = hre.network.config.name;
        this.timeout(150000);
        let senderAcc; let proxy; let pool; let snapshotId;
        let WETH_ADDRESS; let aWETH; let BORROW_ASSET_ADDR;

        before(async function () {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
            pool = await hre.ethers.getContractAt(poolContractName, poolAddress);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            BORROW_ASSET_ADDR = addrs[network].DAI_ADDRESS;

            const isAssetBorrowable = await isAssetBorrowableV3(
                addrs[network].AAVE_V3_POOL_DATA_PROVIDER, BORROW_ASSET_ADDR,
            );
            if (!isAssetBorrowable) {
                console.log('Borrow asset is paused, inactive or frozen. Skipping aaveV3BorrowTest');
                this.skip();
            }

            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it(`... should supply WETH and borrow DAI on Aave V3 ${network}`, async () => {
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
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(BORROW_ASSET_ADDR);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(
                proxy, addrs[network].AAVE_MARKET, amountDai, to, 2, reserveDataDAI.id,
            );

            const daiBalanceAfter = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        });
        it(`... should supply WETH and borrow DAI on Aave V3 ${network} using optimised calldata`, async () => {
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
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(BORROW_ASSET_ADDR);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3BorrowCalldataOptimised(
                proxy, addrs[network].AAVE_MARKET, amountDai, to, 2, reserveDataDAI.id,
            );

            const daiBalanceAfter = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        });
    });
};

const aaveV3WithdrawTest = async () => {
    describe('Aave-Withdraw', function () {
        const network = hre.network.config.name;
        this.timeout(150000);
        let senderAcc; let proxy; let pool; let snapshotId;
        let WETH_ADDRESS; let aWETH;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
            pool = await hre.ethers.getContractAt(poolContractName, poolAddress);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;

            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it(`... should supply WETH and then withdraw it on Aave V3 ${network}`, async () => {
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
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
            // ----------------------------------------------------------------

            const wethBalanceBeforeWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA before withdraw:${wethBalanceBeforeWithdraw.toString()}`);
            await aaveV3Withdraw(proxy, addrs[network].AAVE_MARKET, assetId, amount, to);

            const awethEOAbalanceAfterWithdraw = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const wethBalanceAfterWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA after withdraw:${wethBalanceAfterWithdraw.toString()}`);
            expect(wethBalanceAfterWithdraw).to.be.gt(wethBalanceBeforeWithdraw);
            expect(awethEOAbalanceAfterWithdraw).to.be.lt(balanceAfter);
        });
        it(`... should supply WETH and then withdraw it on Aave V3 ${network} using optimised calldata`, async () => {
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
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
            // ----------------------------------------------------------------

            const wethBalanceBeforeWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA before withdraw:${wethBalanceBeforeWithdraw.toString()}`);
            await aaveV3WithdrawCalldataOptimised(
                proxy, addrs[network].AAVE_MARKET, assetId, amount, to,
            );

            const awethEOAbalanceAfterWithdraw = await balanceOf(aWETH, proxy.address);

            const wethBalanceAfterWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on EOA after withdraw:${wethBalanceAfterWithdraw.toString()}`);

            expect(wethBalanceAfterWithdraw).to.be.gt(wethBalanceBeforeWithdraw);
            expect(awethEOAbalanceAfterWithdraw).to.be.lt(balanceAfter);
        });
    });
};

const aaveV3PaybackTest = async () => {
    describe('AaveV3-Payback', function () {
        this.timeout(150000);
        const network = hre.network.config.name;
        let senderAcc; let proxy; let pool; let snapshotId;
        let WETH_ADDRESS; let aWETH; let BORROW_ASSET_ADDR;

        before(async function () {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
            pool = await hre.ethers.getContractAt(poolContractName, poolAddress);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            BORROW_ASSET_ADDR = addrs[network].DAI_ADDRESS;

            const isAssetBorrowable = await isAssetBorrowableV3(
                addrs[network].AAVE_V3_POOL_DATA_PROVIDER, BORROW_ASSET_ADDR,
            );
            if (!isAssetBorrowable) {
                console.log('Borrow asset is paused, inactive or frozen. Skipping aaveV3PaybackTest');
                this.skip();
            }

            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it(`... should supply WETH and borrow DAI then repay the debt to Aave V3 on ${network}`, async () => {
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
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(BORROW_ASSET_ADDR);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(
                proxy, addrs[network].AAVE_MARKET, amountDai, to, 2, reserveDataDAI.id,
            );

            const daiBalanceAfter = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            await approve(BORROW_ASSET_ADDR, proxy.address);

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            await aaveV3Payback(
                proxy, addrs[network].AAVE_MARKET, amountDai, from, 2, reserveDataDAI.id,
                BORROW_ASSET_ADDR,
            );

            const daiBalanceAfterPayback = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA after payback:${daiBalanceAfterPayback.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);
            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });
        it(`... should supply WETH and borrow DAI then repay the debt to Aave V3 on ${network} using optimised calldata`, async () => {
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
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(BORROW_ASSET_ADDR);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(
                proxy, addrs[network].AAVE_MARKET, amountDai, to, 2, reserveDataDAI.id,
            );

            const daiBalanceAfter = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            await approve(BORROW_ASSET_ADDR, proxy.address);

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            await aaveV3Payback(
                proxy, addrs[network].AAVE_MARKET, amountDai, from, 2, reserveDataDAI.id,
                BORROW_ASSET_ADDR,
            );

            const daiBalanceAfterPayback = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA after payback:${daiBalanceAfterPayback.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);

            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });
        it(`... should supply WETH and borrow DAI then repay uint(-1) ALL debt to Aave V3 on ${network} using optimised calldata`, async () => {
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
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(BORROW_ASSET_ADDR);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(
                proxy, addrs[network].AAVE_MARKET, amountDai, to, 2, reserveDataDAI.id,
            );

            const daiBalanceAfter = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
            await setBalance(BORROW_ASSET_ADDR, senderAcc.address, amountDai.mul(2));
            await approve(BORROW_ASSET_ADDR, proxy.address);

            const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
            const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt before payback ${debtAmountBefore.toString()}`);

            await aaveV3PaybackCalldataOptimised(
                proxy,
                addrs[network].AAVE_MARKET,
                hre.ethers.constants.MaxUint256,
                from,
                2,
                reserveDataDAI.id,
                BORROW_ASSET_ADDR,
            );

            const daiBalanceAfterPayback = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA after payback:${daiBalanceAfterPayback.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);

            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
            expect(debtAmountAfter).to.be.eq(0);
        });
    });
};

const aaveV3SetEModeTest = async () => {
    describe('Aave-Set-EMode', function () {
        this.timeout(150000);
        const network = hre.network.config.name;
        let senderAcc; let proxy; let snapshotId; let pool;
        let WETH_ADDRESS; let aWETH;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
            pool = await hre.ethers.getContractAt(poolContractName, poolAddress);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;

            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it(`... should change EMode on Aave V3 ${network}`, async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            let userEmode = await pool.getUserEMode(proxy.address);
            console.log(`Users emode before changing: ${userEmode}`);
            expect(userEmode).to.be.eq(0);

            await aaveV3SetEMode(proxy, addrs[network].AAVE_MARKET, 1);

            userEmode = await pool.getUserEMode(proxy.address);

            expect(userEmode).to.be.eq(1);
            console.log(`Users emode before changing: ${userEmode}`);
        });
        it(`... should supply WETH to Aave V3 ${network} with calldata optimised`, async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            let userEmode = await pool.getUserEMode(proxy.address);
            console.log(`Users emode before changing: ${userEmode}`);
            expect(userEmode).to.be.eq(0);

            await aaveV3SetEModeCalldataOptimised(proxy, addrs[network].AAVE_MARKET, 1);

            userEmode = await pool.getUserEMode(proxy.address);
            console.log(`Users emode before changing: ${userEmode}`);
            expect(userEmode).to.be.eq(1);
        });
    });
};

const aaveV3CollSwitchTest = async () => {
    describe('Aave-Coll-Switch', function () {
        this.timeout(150000);
        const network = hre.network.config.name;
        let senderAcc; let proxy; let pool; let snapshotId;
        let WETH_ADDRESS; let aWETH; let DAI_ADDRESS; let aDAI;

        before(async function () {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
            pool = await hre.ethers.getContractAt(poolContractName, poolAddress);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            DAI_ADDRESS = addrs[network].DAI_ADDRESS;

            const isAssetBorrowable = await isAssetBorrowableV3(
                addrs[network].AAVE_V3_POOL_DATA_PROVIDER, DAI_ADDRESS,
            );
            if (!isAssetBorrowable) {
                console.log('Borrow asset not borrowable. Skipping aaveV3CollSwitchTest');
                this.skip();
            }
            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
            aDAI = (await pool.getReserveData(DAI_ADDRESS)).aTokenAddress;
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it(`... should supply WETH and DAI to Aave V3 ${network} then turn off collateral for them`, async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

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
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, DAI_ADDRESS, daiAssetId, from,
            );

            const balanceAfterADAI = await balanceOf(aDAI, proxy.address);
            console.log(`aDAI on proxy after: ${balanceAfterADAI.toString()}`);

            //-----------------------------------------------------
            await aaveV3SwitchCollateral(
                proxy, addrs[network].AAVE_MARKET, 2, [assetId, daiAssetId], [false, false],
            );
        });
        it(`... should supply WETH and DAI to Aave V3 ${network} then turn off collateral for them`, async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(WETH_ADDRESS, senderAcc.address, amount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

            const reserveData = await pool.getReserveData(WETH_ADDRESS);
            const assetId = reserveData.id;
            const from = senderAcc.address;

            const balanceBefore = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

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
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, DAI_ADDRESS, daiAssetId, from,
            );

            const balanceAfterADAI = await balanceOf(aDAI, proxy.address);
            console.log(`aDAI on proxy after: ${balanceAfterADAI.toString()}`);

            //-----------------------------------------------------
            await aaveV3SwitchCollateralCallDataOptimised(
                proxy, addrs[network].AAVE_MARKET, 2, [assetId, daiAssetId], [false, false],
            );
        });
    });
};

const aaveV3ATokenPaybackTest = async () => {
    describe('AaveV3-ATokenPayback', function () {
        this.timeout(150000);
        const network = hre.network.config.name;
        let senderAcc; let proxy; let pool; let snapshotId;
        let WETH_ADDRESS; let aWETH; let BORROW_ASSET_ADDR;

        before(async function () {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
            pool = await hre.ethers.getContractAt(poolContractName, poolAddress);
            WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            BORROW_ASSET_ADDR = addrs[network].DAI_ADDRESS;

            const isAssetBorrowable = await isAssetBorrowableV3(
                addrs[network].AAVE_V3_POOL_DATA_PROVIDER, BORROW_ASSET_ADDR,
            );
            if (!isAssetBorrowable) {
                console.log('Borrow asset not borrowable. Skipping aaveV3ATokenPaybackTest');
                this.skip();
            }
            aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it(`... should supply WETH and borrow DAI then repay part of debt using aDAI on Aave V3 on ${network}`, async () => {
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
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(BORROW_ASSET_ADDR);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(
                proxy, addrs[network].AAVE_MARKET, amountDai, to, 2, reserveDataDAI.id,
            );

            const daiBalanceAfter = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
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
                proxy, addrs[network].AAVE_MARKET, paybackAmount, from, 2, reserveDataDAI.id, aDAI,
            );

            const aDaiBalanceAfter = await balanceOf(aDAI, senderAcc.address);
            console.log(`aDAI on EOA after ATokenPayback: ${aDaiBalanceAfter.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);
            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });

        it(`... should supply WETH and borrow DAI then repay part of debt using aDAI on Aave V3 on ${network} using optimised calldata`, async () => {
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
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(BORROW_ASSET_ADDR);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(
                proxy, addrs[network].AAVE_MARKET, amountDai, to, 2, reserveDataDAI.id,
            );

            const daiBalanceAfter = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
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
                proxy, addrs[network].AAVE_MARKET, paybackAmount, from, 2, reserveDataDAI.id, aDAI,
            );

            const aDaiBalanceAfter = await balanceOf(aDAI, senderAcc.address);
            console.log(`aDAI on EOA after ATokenPayback: ${aDaiBalanceAfter.toString()}`);

            const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
            console.log(`Debt after payback ${debtAmountAfter.toString()}`);

            expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        });
        it(`... should supply WETH and borrow DAI then repay ALL debt using aDAI on Aave V3 on ${network} using optimised calldata`, async () => {
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
            await aaveV3Supply(
                proxy, addrs[network].AAVE_MARKET, amount, WETH_ADDRESS, assetId, from,
            );

            const balanceAfter = await balanceOf(aWETH, proxy.address);
            console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

            const reserveDataDAI = await pool.getReserveData(BORROW_ASSET_ADDR);
            const amountDai = hre.ethers.utils.parseUnits('1000', 18);

            const daiBalanceBefore = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
            console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
            await aaveV3Borrow(
                proxy, addrs[network].AAVE_MARKET, amountDai, to, 2, reserveDataDAI.id,
            );

            const daiBalanceAfter = await balanceOf(BORROW_ASSET_ADDR, senderAcc.address);
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
                proxy, addrs[network].AAVE_MARKET, paybackAmount, from, 2, reserveDataDAI.id,
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

const aaveV3ClaimRewardsTest = async () => {
    describe('AaveV3-ClaimRewards', function () {
        this.timeout(150000);
        const network = hre.network.config.name;
        let snapshotId;

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        // Rewards only supported on Optimism. Tested on 15281577
        it('... should claim OP rewards on Optimism DSProxy position', async () => {
            if (network !== 'optimism') {
            // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
            }

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

            await aaveV3ClaimRewards(
                proxy, [aWBTC, aWETH, aVariableUSDC], opAmount, ownerAcc, opToken,
            );

            const balanceAfter = await balanceOf(opToken, ownerAcc);
            console.log(balanceAfter.toString());

            expect(balanceAfter.sub(balanceBefore)).to.be.eq(opAmount);
        });
    });
};

const aaveV3DelegateCreditTest = async () => {
    describe('AaveV3-DelegateCreditTest', function () {
        this.timeout(150000);
        const network = hre.network.config.name;
        let snapshotId;

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        let senderAcc; let proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... delegate credit on AaveV3', async () => {
            const delegatee = '0x000000000000000000000000000000000000dEaD';
            const assetId = 0;
            const rateMode = 2;
            const amount = hre.ethers.utils.parseUnits('100', 18);
            await aaveV3DelegateCredit(proxy, assetId, amount, rateMode, delegatee);
            const aaveV3DelegateAddr = await getAddrFromRegistry('AaveV3DelegateCredit');
            const aaveV3DelegateContract = await hre.ethers.getContractAt('AaveV3DelegateCredit', aaveV3DelegateAddr);
            const delegatedAmount = await aaveV3DelegateContract.getCreditDelegation(
                addrs[network].AAVE_MARKET, assetId, rateMode, proxy.address, delegatee,
            );
            console.log(delegatedAmount.toString());
            expect(delegatedAmount).to.be.eq(amount);
        }).timeout(50000);
    });
};
const aaveV3DelegateCreditWithSigTest = async () => {
    describe('AaveV3-DelegateCreditWithSigTest', function () {
        this.timeout(150000);
        let snapshotId;

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        let senderAcc; let proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... delegate credit on AaveV3', async () => {
            const debtToken = '0xeA51d7853EEFb32b6ee06b1C12E6dcCA88Be0fFE';
            const delegator = senderAcc.address;
            const delegatee = proxy.address;
            const value = hre.ethers.utils.parseUnits('100', 18);
            const debtTokenContract = await hre.ethers.getContractAt('IDebtToken', debtToken);
            const nonce = await debtTokenContract.nonces(delegator);
            const deadline = '1812843907';
            console.log(value);
            console.log(nonce);
            console.log(deadline);

            const signature = hre.ethers.utils.splitSignature(
                // @dev - _signTypedData will be renamed to signTypedData in future ethers versions
                // eslint-disable-next-line no-underscore-dangle
                await senderAcc._signTypedData(
                    {
                        name: 'Aave Ethereum Variable Debt WETH', // debtToken.name
                        version: '1', // debtToken.DEBT_TOKEN_REVISION
                        chainId: 1,
                        verifyingContract: debtToken,
                    },
                    {
                        DelegationWithSig: [
                            { name: 'delegatee', type: 'address' },
                            { name: 'value', type: 'uint256' },
                            { name: 'nonce', type: 'uint256' },
                            { name: 'deadline', type: 'uint256' },
                        ],
                    },
                    {
                        delegatee: proxy.address,
                        value,
                        nonce, // debtToken.nonces(owner)
                        deadline,
                    },
                ),
            );
            await aaveV3DelegateCreditWithSig(
                proxy, debtToken, senderAcc.address, proxy.address,
                value, deadline, signature.v, signature.r, signature.s,
            );
            const delegatedAmount = await debtTokenContract.borrowAllowance(delegator, delegatee);
            console.log(delegatedAmount.toString());
            expect(delegatedAmount).to.be.eq(value);
        }).timeout(50000);
    });
};

const ghoClaimAAVEtest = async () => {
    describe('Test claiming AAVE from stkGHO', function () {
        this.timeout(150000);

        let senderAcc; let proxy;
        const AAVE_ADDR = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9';
        const USER_ACC = '0x9c6a52c6F736BA3Cd9c21bd13eEBE08760f931E5';
        const SAFE_ACC = '0x43303C5B97D2858557610aCDb28992ab709C26b2';

        before(async () => {
            await resetForkToBlock(21176924);
            // at this block user can claim 0.04 AAVE on his proxy
            await redeploy('GhoClaimAAVE');
            senderAcc = await hre.ethers.provider.getSigner(USER_ACC);

            proxy = await hre.ethers.getContractAt('ISafe', SAFE_ACC);
            console.log(proxy.address);
            proxy = proxy.connect(senderAcc);
            proxy.signer.address = USER_ACC;
            const filledAcc = (await hre.ethers.getSigners())[0];
            await sendEther(filledAcc, USER_ACC, '10');
            await impersonateAccount(USER_ACC);
        });

        it('... should claim 0.01 AAVE (out of 0.04) for DSProxy from Staking Aave', async () => {
            const amountToClaim = hre.ethers.utils.parseUnits('0.01', 18);
            const aaveBalanceBefore = await balanceOf(AAVE_ADDR, USER_ACC);
            await claimAaveFromStkGho(proxy, amountToClaim, USER_ACC);
            const aaveBalanceAfter = await balanceOf(AAVE_ADDR, USER_ACC);
            console.log(aaveBalanceBefore.toString());
            console.log(aaveBalanceAfter.toString());
            expect(aaveBalanceAfter.sub(aaveBalanceBefore)).to.be.eq(amountToClaim);
        });

        it('... should claim all accrued rewards when amount > unclaimed rewards', async () => {
            const amountToClaim = hre.ethers.constants.MaxUint256;
            const aaveBalanceBefore = await balanceOf(AAVE_ADDR, USER_ACC);
            await claimAaveFromStkGho(proxy, amountToClaim, USER_ACC);
            const aaveBalanceAfter = await balanceOf(AAVE_ADDR, USER_ACC);
            console.log(aaveBalanceBefore.toString());
            console.log(aaveBalanceAfter.toString());
            expect(aaveBalanceAfter.sub(aaveBalanceBefore)).to.be.gt('0');
        });
    });
};
const ghoUnstakeTest = async () => {
    describe('GHO-stake on behalf of proxy and unstake test', function () {
        this.timeout(150000);
        const stkGHO = '0x1a88df1cfe15af22b3c4c783d4e6f7f9e0c1885d';
        const gho = '0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f';

        let senderAcc; let proxy; let stkGhoContract; let snapshot;
        before(async () => {
            await redeploy('GhoUnstake');
            stkGhoContract = await hre.ethers.getContractAt('IStkAave', stkGHO);
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            snapshot = await takeSnapshot();
        });

        it('... should stake 100 GHO on behalf of DSProxy', async () => {
            const amount = hre.ethers.utils.parseUnits('100', 18);
            await setBalance(gho, senderAcc.address, amount);
            await approve(gho, stkGHO, senderAcc);
            await stkGhoContract.stake(proxy.address, amount);
            console.log(await balanceOf(stkGHO, proxy.address));
        });

        it('... should start the process of unstaking', async () => {
            await startUnstakeGho(proxy);
            const aaveUnstakeCooldown = 1728001;
            await timeTravel(aaveUnstakeCooldown);
        });

        it('... should unstake all stkGHO', async () => {
            const amount = await balanceOf(stkGHO, proxy.address);
            await finalizeUnstakeGho(proxy, senderAcc.address, amount);
            const endingBalance = await balanceOf(gho, senderAcc.address);
            expect(endingBalance).to.be.eq(amount);
            await revertToSnapshot(snapshot);
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
    await redeploy('AaveV3Withdraw');
    await redeploy('AaveV3DelegateCredit');
};

const aaveV3FullTest = async () => {
    await aaveV3DeployContracts();

    await aaveV3SupplyTest();
    await aaveV3BorrowTest();
    await aaveV3WithdrawTest();
    await aaveV3SetEModeTest();
    await aaveV3PaybackTest();
    await aaveV3CollSwitchTest();
    await aaveV3ATokenPaybackTest();
    await aaveV3DelegateCreditTest();
};
module.exports = {
    aaveV3FullTest,
    aaveV3SupplyTest,
    aaveV3BorrowTest,
    aaveV3WithdrawTest,
    aaveV3SetEModeTest,
    aaveV3PaybackTest,
    aaveV3CollSwitchTest,
    aaveV3ATokenPaybackTest,
    aaveV3ClaimRewardsTest,
    aaveV3DelegateCreditTest,
    aaveV3DelegateCreditWithSigTest,
    ghoClaimAAVEtest,
    ghoUnstakeTest,
};
