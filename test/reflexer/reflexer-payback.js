const { expect } = require('chai');
const hre = require('hardhat');
const {
    getProxy,
    redeploy,
    depositToWeth,
    MIN_VAULT_RAI_AMOUNT,
    RAI_ADDR,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
    LOGGER_ADDR,
} = require('../utils');

const {
    lastSafeID,
    getSafeInfo,
    ADAPTER_ADDRESS,
} = require('../utils-reflexer.js');

const {
    reflexerOpen,
    reflexerSupply,
    reflexerGenerate,
    reflexerPayback,
} = require('../actions.js');

describe('Reflexer-Payback', function () {
    let senderAcc; let proxy; let reflexerView; let rai; let weth; let logger;

    before(async () => {
        this.timeout(40000);
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        await redeploy('ReflexerGenerate');
        await redeploy('ReflexerPayback');
        reflexerView = await redeploy('RaiLoanInfo');
        rai = await hre.ethers.getContractAt('IERC20', RAI_ADDR);
        weth = await hre.ethers.getContractAt('IWETH', WETH_ADDRESS);
        logger = await hre.ethers.getContractAt('DefisaverLogger', LOGGER_ADDR);

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should payback half of RAI debt for safe', async () => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);
        const safeID = await lastSafeID(proxy.address);

        let amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
        let amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), 18);
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
    }).timeout(50000);

    it('... should payback all of RAI debt for safe', async () => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);
        const safeID = await lastSafeID(proxy.address);

        let amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
        let amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), 18);
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
    }).timeout(50000);

    it('... should log every event', async () => {
        await expect(reflexerOpen(proxy, ADAPTER_ADDRESS))
            .to.emit(logger, 'LogEvent');

        const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), 18);
        const amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
        await depositToWeth(amountWETH.toString());

        const safeID = await lastSafeID(proxy.address);
        const from = senderAcc.address;
        await expect(reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
            .to.emit(logger, 'LogEvent');

        const to = senderAcc.address;
        await expect(reflexerGenerate(proxy, safeID, amountRai, to))
            .to.emit(logger, 'LogEvent');

        await expect(reflexerPayback(proxy, safeID,
            hre.ethers.constants.MaxUint256, from, RAI_ADDR))
            .to.emit(logger, 'LogEvent');
    }).timeout(40000);
});
