/* eslint-disable no-await-in-loop */
const { expect } = require('chai');
const hre = require('hardhat');
const {
    reflexerOpen,
    reflexerSupply,
    reflexerGenerate,
    reflexerPayback,
    reflexerWithdraw,
    reflexerSaviourDeposit,
    reflexerSaviourWithdraw,
} = require('../actions');
const {
    redeploy,
    getProxy,
    LOGGER_ADDR,
    takeSnapshot,
    revertToSnapshot,
    getAddrFromRegistry,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
    depositToWeth,
    send,
    balanceOf,
    MIN_VAULT_RAI_AMOUNT,
    RAI_ADDR,
    approve,
    UNIV2_ROUTER_ADDRESS,
} = require('../utils');
const {
    safeCount,
    lastSafeID,
    getSafeInfo,
    ADAPTER_ADDRESS,
    RAI_WETH_LP_TOKEN_ADDRESS,
    NATIVE_UNDERLYING_UNI_V_TWO_SAVIOUR_ADDRESS,
    REFLEXER_SAFE_MANAGER_ADDR,
} = require('../utils-reflexer');

const WETH_SUPPLY_AMOUNT_IN_USD = '100000';

const reflexerOpenTest = async () => {
    describe('Reflexer-Open', () => {
        let senderAcc; let proxy; let reflexerView; let logger; let reflexerViewAddr;

        before(async () => {
            reflexerViewAddr = await getAddrFromRegistry('ReflexerView');
            reflexerView = await hre.ethers.getContractAt('ReflexerView', reflexerViewAddr);
            logger = await hre.ethers.getContractAt('DefisaverLogger', LOGGER_ADDR);
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should open 5 empty Reflexer Safes', async () => {
            const snapshot = await takeSnapshot();
            let safeCountBefore = await safeCount(proxy.address);
            for (let i = 0; i < 5; i++) {
                await reflexerOpen(proxy, ADAPTER_ADDRESS);
                const safeCountAfter = await safeCount(proxy.address);
                expect(safeCountAfter - 1).to.be.equal(safeCountBefore);
                safeCountBefore = safeCountAfter;

                const safeID = await lastSafeID(proxy.address);
                const info = await getSafeInfo(reflexerView, safeID);
                expect(info.coll.toNumber()).to.be.equal(0);
                expect(info.debt.toNumber()).to.be.equal(0);
            }
            revertToSnapshot(snapshot);
        }).timeout(50000);

        it('... should log every event', async () => {
            const snapshot = await takeSnapshot();
            await expect(reflexerOpen(proxy, ADAPTER_ADDRESS))
                .to.emit(logger, 'ActionDirectEvent');
            revertToSnapshot(snapshot);
        }).timeout(10000);
    });
};

const reflexerSupplyTest = async () => {
    describe('Reflexer-Supply', () => {
        let senderAcc; let proxy; let reflexerView; let weth; let logger;
        let reflexerViewAddr;

        before(async () => {
            reflexerViewAddr = await getAddrFromRegistry('ReflexerView');
            reflexerView = await hre.ethers.getContractAt('ReflexerView', reflexerViewAddr);
            weth = await hre.ethers.getContractAt('IWETH', WETH_ADDRESS);
            logger = await hre.ethers.getContractAt('DefisaverLogger', LOGGER_ADDR);
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should supply standard amount of WETH to safe', async () => {
            const snapshot = await takeSnapshot();
            await reflexerOpen(proxy, ADAPTER_ADDRESS);

            const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', WETH_SUPPLY_AMOUNT_IN_USD), 18);
            await depositToWeth(amountWETH.toString());

            const safeID = await lastSafeID(proxy.address);
            const from = senderAcc.address;
            await expect(() => reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
                .to.changeTokenBalance(weth, senderAcc, amountWETH.mul(-1));

            const info = await getSafeInfo(reflexerView, safeID);
            expect(info.coll.toString()).to.be.equal(amountWETH);
            revertToSnapshot(snapshot);
        }).timeout(40000);

        it('... should supply all WETH to safe from proxy', async () => {
            const snapshot = await takeSnapshot();
            await reflexerOpen(proxy, ADAPTER_ADDRESS);

            const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', WETH_SUPPLY_AMOUNT_IN_USD), 18);
            await depositToWeth(amountWETH.toString());
            await send(WETH_ADDRESS, proxy.address, amountWETH);

            const safeID = await lastSafeID(proxy.address);
            const from = proxy.address;
            const proxyStartingBalance = await balanceOf(WETH_ADDRESS, proxy.address);
            await expect(() => reflexerSupply(proxy, safeID,
                hre.ethers.constants.MaxUint256, ADAPTER_ADDRESS, from))
                .to.changeTokenBalance(weth, proxy, proxyStartingBalance.mul(-1));

            const info = await getSafeInfo(reflexerView, safeID);
            expect(info.coll.toString()).to.be.equal(proxyStartingBalance);
            revertToSnapshot(snapshot);
        }).timeout(40000);

        it('... should supply all WETH to safe from EOA', async () => {
            const snapshot = await takeSnapshot();
            await reflexerOpen(proxy, ADAPTER_ADDRESS);

            const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', WETH_SUPPLY_AMOUNT_IN_USD), 18);
            await depositToWeth(amountWETH.toString());

            const safeID = await lastSafeID(proxy.address);
            const from = senderAcc.address;
            const startingBalance = await balanceOf(WETH_ADDRESS, from);
            await expect(() => reflexerSupply(proxy, safeID,
                hre.ethers.constants.MaxUint256, ADAPTER_ADDRESS, from))
                .to.changeTokenBalance(weth, senderAcc, startingBalance.mul(-1));

            const info = await getSafeInfo(reflexerView, safeID);
            expect(info.coll.toString()).to.be.equal(startingBalance);
            revertToSnapshot(snapshot);
        }).timeout(40000);

        it('... should log every event', async () => {
            const snapshot = await takeSnapshot();
            await expect(reflexerOpen(proxy, ADAPTER_ADDRESS))
                .to.emit(logger, 'ActionDirectEvent');

            const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', WETH_SUPPLY_AMOUNT_IN_USD), 18);
            await depositToWeth(amountWETH.toString());

            const safeID = await lastSafeID(proxy.address);
            const from = senderAcc.address;
            await expect(reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
                .to.emit(logger, 'ActionDirectEvent');
            revertToSnapshot(snapshot);
        }).timeout(40000);
    });
};
const reflexerGenerateTest = async () => {
    describe('Reflexer-Generate', () => {
        let senderAcc; let proxy; let rai; let weth; let logger;

        before(async () => {
            logger = await hre.ethers.getContractAt('DefisaverLogger', LOGGER_ADDR);

            rai = await hre.ethers.getContractAt('IERC20', RAI_ADDR);
            weth = await hre.ethers.getContractAt('IWETH', WETH_ADDRESS);
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should generate RAI for WETH safe', async () => {
            const snapshot = await takeSnapshot();
            await reflexerOpen(proxy, ADAPTER_ADDRESS);
            const safeID = await lastSafeID(proxy.address);

            const amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
            const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', WETH_SUPPLY_AMOUNT_IN_USD), 18);
            await depositToWeth(amountWETH.toString());

            const from = senderAcc.address;
            await expect(() => reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
                .to.changeTokenBalance(weth, senderAcc, amountWETH.mul(-1));

            const to = senderAcc.address;
            await expect(() => reflexerGenerate(proxy, safeID, amountRai, to))
                .to.changeTokenBalance(rai, senderAcc, amountRai);
            revertToSnapshot(snapshot);
        }).timeout(40000);

        it('... should log every event', async () => {
            const snapshot = await takeSnapshot();
            await expect(reflexerOpen(proxy, ADAPTER_ADDRESS))
                .to.emit(logger, 'ActionDirectEvent');

            const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', WETH_SUPPLY_AMOUNT_IN_USD), 18);
            const amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
            await depositToWeth(amountWETH.toString());

            const safeID = await lastSafeID(proxy.address);
            const from = senderAcc.address;
            await expect(reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
                .to.emit(logger, 'ActionDirectEvent');

            const to = senderAcc.address;
            await expect(reflexerGenerate(proxy, safeID, amountRai, to))
                .to.emit(logger, 'ActionDirectEvent');
            revertToSnapshot(snapshot);
        }).timeout(40000);
    });
};
const reflexerPaybackTest = async () => {
    describe('Reflexer-Payback', function () {
        let senderAcc; let proxy; let reflexerView; let rai; let weth; let logger;
        let reflexerViewAddr;
        before(async () => {
            this.timeout(40000);
            reflexerViewAddr = await getAddrFromRegistry('ReflexerView');
            reflexerView = await hre.ethers.getContractAt('ReflexerView', reflexerViewAddr);
            rai = await hre.ethers.getContractAt('IERC20', RAI_ADDR);
            weth = await hre.ethers.getContractAt('IWETH', WETH_ADDRESS);
            logger = await hre.ethers.getContractAt('DefisaverLogger', LOGGER_ADDR);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should payback half of RAI debt for safe', async () => {
            const snapshot = await takeSnapshot();
            await reflexerOpen(proxy, ADAPTER_ADDRESS);
            const safeID = await lastSafeID(proxy.address);

            let amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
            let amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', WETH_SUPPLY_AMOUNT_IN_USD), 18);
            amountWETH = amountWETH.mul(5); // 20 eth
            amountRai = amountRai.mul(10); // 10k rai
            await depositToWeth(amountWETH.toString());

            const from = senderAcc.address;
            await expect(() => reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
                .to.changeTokenBalance(weth, senderAcc, amountWETH.mul(-1));

            const to = senderAcc.address;
            await expect(() => reflexerGenerate(proxy, safeID, amountRai, to))
                .to.changeTokenBalance(rai, senderAcc, amountRai);

            const amountToPayback = amountRai.div(2); // 5k rai

            await expect(() => reflexerPayback(proxy, safeID, amountToPayback, from, RAI_ADDR))
                .to.changeTokenBalance(rai, senderAcc, amountToPayback.mul(-1));
            revertToSnapshot(snapshot);
        }).timeout(50000);

        it('... should payback all of RAI debt for safe', async () => {
            const snapshot = await takeSnapshot();
            await reflexerOpen(proxy, ADAPTER_ADDRESS);
            const safeID = await lastSafeID(proxy.address);

            let amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
            let amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', WETH_SUPPLY_AMOUNT_IN_USD), 18);
            amountWETH = amountWETH.mul(5); // 20 eth
            amountRai = amountRai.mul(10); // 10k rai
            await depositToWeth(amountWETH.toString());

            const from = senderAcc.address;
            await expect(() => reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
                .to.changeTokenBalance(weth, senderAcc, amountWETH.mul(-1));

            const to = senderAcc.address;
            await expect(() => reflexerGenerate(proxy, safeID, amountRai, to))
                .to.changeTokenBalance(rai, senderAcc, amountRai);

            await reflexerPayback(proxy, safeID, hre.ethers.constants.MaxUint256, from, RAI_ADDR);

            const info = await getSafeInfo(reflexerView, safeID);
            expect(info.debt).to.be.equal(0);
            revertToSnapshot(snapshot);
        }).timeout(50000);

        it('... should log every event', async () => {
            const snapshot = await takeSnapshot();
            await expect(reflexerOpen(proxy, ADAPTER_ADDRESS))
                .to.emit(logger, 'ActionDirectEvent');

            const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', WETH_SUPPLY_AMOUNT_IN_USD), 18);
            const amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
            await depositToWeth(amountWETH.toString());

            const safeID = await lastSafeID(proxy.address);
            const from = senderAcc.address;
            await expect(reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
                .to.emit(logger, 'ActionDirectEvent');

            const to = senderAcc.address;
            await expect(reflexerGenerate(proxy, safeID, amountRai, to))
                .to.emit(logger, 'ActionDirectEvent');

            await expect(reflexerPayback(proxy, safeID,
                hre.ethers.constants.MaxUint256, from, RAI_ADDR))
                .to.emit(logger, 'ActionDirectEvent');
            revertToSnapshot(snapshot);
        }).timeout(40000);
    });
};

const reflexerWithdrawTest = async () => {
    describe('Reflexer-Withdraw', () => {
        let senderAcc; let proxy; let reflexerView; let weth; let logger;
        let reflexerViewAddr;

        before(async () => {
            reflexerViewAddr = await getAddrFromRegistry('ReflexerView');
            reflexerView = await hre.ethers.getContractAt('ReflexerView', reflexerViewAddr);
            weth = await hre.ethers.getContractAt('IWETH', WETH_ADDRESS);
            logger = await hre.ethers.getContractAt('DefisaverLogger', LOGGER_ADDR);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should withdraw 1/4 of coll WETH from safe', async () => {
            const snapshot = await takeSnapshot();
            await reflexerOpen(proxy, ADAPTER_ADDRESS);

            const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', WETH_SUPPLY_AMOUNT_IN_USD), 18);
            await depositToWeth(amountWETH.toString());

            const safeID = await lastSafeID(proxy.address);
            const from = senderAcc.address;
            await reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from);

            const infoBeforeWithdraw = await getSafeInfo(reflexerView, safeID);

            const to = senderAcc.address;
            const withdrawAmount = (infoBeforeWithdraw.coll / 4).toString();

            await expect(() => reflexerWithdraw(proxy, safeID, withdrawAmount, ADAPTER_ADDRESS, to))
                .to.changeTokenBalance(weth, senderAcc, withdrawAmount);

            const infoAfterWithdraw = await getSafeInfo(reflexerView, safeID);
            expect(infoAfterWithdraw.coll).to.be.equal(amountWETH.sub(withdrawAmount));
            revertToSnapshot(snapshot);
        }).timeout(40000);

        it('... should withdraw all coll WETH from safe', async () => {
            const snapshot = await takeSnapshot();
            await reflexerOpen(proxy, ADAPTER_ADDRESS);
            const safeID = await lastSafeID(proxy.address);

            const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', WETH_SUPPLY_AMOUNT_IN_USD), 18);
            await depositToWeth(amountWETH.toString());

            const from = senderAcc.address;
            await expect(() => reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
                .to.changeTokenBalance(weth, senderAcc, amountWETH.mul(-1));

            const to = senderAcc.address;
            await expect(() => reflexerWithdraw(proxy, safeID,
                hre.ethers.constants.MaxUint256, ADAPTER_ADDRESS, to))
                .to.changeTokenBalance(weth, senderAcc, amountWETH);

            const infoAfterWithdraw = await getSafeInfo(reflexerView, safeID);
            expect(infoAfterWithdraw.coll).to.be.equal(0);
            revertToSnapshot(snapshot);
        }).timeout(40000);

        it('... should log every event', async () => {
            const snapshot = await takeSnapshot();
            await expect(reflexerOpen(proxy, ADAPTER_ADDRESS))
                .to.emit(logger, 'ActionDirectEvent');

            const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', WETH_SUPPLY_AMOUNT_IN_USD), 18);
            await depositToWeth(amountWETH.toString());

            const safeID = await lastSafeID(proxy.address);
            const from = senderAcc.address;
            await expect(reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
                .to.emit(logger, 'ActionDirectEvent');
            const to = senderAcc.address;
            await expect(reflexerWithdraw(proxy, safeID,
                hre.ethers.constants.MaxUint256, ADAPTER_ADDRESS, to))
                .to.emit(logger, 'ActionDirectEvent');
            revertToSnapshot(snapshot);
        }).timeout(40000);
    });
};

const reflexerSaviourTest = async () => {
    describe('Reflexer-Saviour', () => {
        let senderAcc;
        let proxy;
        let saviour;
        let uniRouter;
        let safeManager;
        before(async () => {
            saviour = await hre.ethers.getContractAt(
                'ISAFESaviour',
                NATIVE_UNDERLYING_UNI_V_TWO_SAVIOUR_ADDRESS,
            );
            safeManager = await hre.ethers.getContractAt('ISAFEManager', REFLEXER_SAFE_MANAGER_ADDR);
            uniRouter = await hre.ethers.getContractAt('IUniswapRouter', UNIV2_ROUTER_ADDRESS);
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... deposit LP tokens to reflexer saviour and then withdraw them', async () => {
            const snapshot = await takeSnapshot();
            await reflexerOpen(proxy, ADAPTER_ADDRESS);
            const safeID = await lastSafeID(proxy.address);
            const safeHandler = await safeManager.safes(safeID);

            const amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
            const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', WETH_SUPPLY_AMOUNT_IN_USD), 18);
            await depositToWeth(amountWETH.toString());

            const from = senderAcc.address;
            await reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from);

            const to = senderAcc.address;
            await reflexerGenerate(proxy, safeID, amountRai, to);

            // exchange RAI and WETH for RAI-WETH LP tokens
            await depositToWeth(amountWETH.toString());
            await approve(RAI_ADDR, UNIV2_ROUTER_ADDRESS);
            await approve(WETH_ADDRESS, UNIV2_ROUTER_ADDRESS);
            await uniRouter.addLiquidity(
                RAI_ADDR,
                WETH_ADDRESS,
                amountRai,
                amountWETH,
                0,
                0,
                to,
                hre.ethers.constants.MaxUint256,
            );
            const lpTokenAmount = await balanceOf(RAI_WETH_LP_TOKEN_ADDRESS, to);

            await approve(RAI_WETH_LP_TOKEN_ADDRESS, proxy.address);
            // deposit half
            await reflexerSaviourDeposit(
                proxy,
                from,
                safeID,
                lpTokenAmount.div(2),
            );
            let saviourBalance = await saviour.lpTokenCover(safeHandler);
            expect(saviourBalance).to.be.eq(lpTokenAmount.div(2));

            // deposit uint max
            await reflexerSaviourDeposit(
                proxy,
                from,
                safeID,
                hre.ethers.constants.MaxUint256,
            );
            saviourBalance = await saviour.lpTokenCover(safeHandler);
            expect(saviourBalance).to.be.eq(lpTokenAmount);

            expect(await balanceOf(RAI_WETH_LP_TOKEN_ADDRESS, to)).to.be.eq(0);
            // withdraw tokens
            await reflexerSaviourWithdraw(proxy, to, safeID, saviourBalance);
            const lpTokenAmountAfterWithdraw = await balanceOf(RAI_WETH_LP_TOKEN_ADDRESS, to);
            expect(lpTokenAmount).to.be.eq(lpTokenAmountAfterWithdraw);
            revertToSnapshot(snapshot);
        }).timeout(1000000);
    });
};

const reflexerDeployContracts = async () => {
    await redeploy('ReflexerOpen');
    await redeploy('ReflexerView');
    await redeploy('ReflexerSupply');
    await redeploy('ReflexerGenerate');
    await redeploy('ReflexerPayback');
    await redeploy('ReflexerWithdraw');
    await redeploy('ReflexerNativeUniV2SaviourGetReserves');
    await redeploy('ReflexerNativeUniV2SaviourDeposit');
    await redeploy('ReflexerNativeUniV2SaviourWithdraw');
};

const reflexerFullTest = async () => {
    await reflexerDeployContracts();
    await reflexerOpenTest();
    await reflexerSupplyTest();
    await reflexerWithdrawTest();
    await reflexerGenerateTest();
    await reflexerPaybackTest();
    await reflexerSaviourTest();
};

module.exports = {
    reflexerSupplyTest,
    reflexerOpenTest,
    reflexerFullTest,
    reflexerDeployContracts,
    reflexerPaybackTest,
    reflexerGenerateTest,
    reflexerWithdrawTest,
    reflexerSaviourTest,
};
