const { expect } = require('chai');
const hre = require('hardhat');
const {
    getProxy,
    redeploy,
    depositToWeth,
    WETH_ADDRESS,
    MIN_VAULT_RAI_AMOUNT,
    RAI_ADDR,
    fetchAmountinUSDPrice,
    LOGGER_ADDR,
} = require('../utils');

const {
    lastSafeID,
    ADAPTER_ADDRESS,
} = require('../utils-reflexer.js');

const {
    reflexerOpen,
    reflexerSupply,
    reflexerGenerate,
} = require('../actions.js');

describe('Reflexer-Generate', () => {
    let senderAcc; let proxy; let rai; let weth; let logger;

    before(async () => {
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        await redeploy('ReflexerWithdraw');
        await redeploy('ReflexerGenerate');
        await redeploy('RaiLoanInfo');
        logger = await hre.ethers.getContractAt('DefisaverLogger', LOGGER_ADDR);

        rai = await hre.ethers.getContractAt('IERC20', RAI_ADDR);
        weth = await hre.ethers.getContractAt('IWETH', WETH_ADDRESS);
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should generate RAI for WETH safe', async () => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);
        const safeID = await lastSafeID(proxy.address);

        const amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
        const amountWETH = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), 18);
        await depositToWeth(amountWETH.toString());

        const from = senderAcc.address;
        await expect(() => reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
            .to.changeTokenBalance(weth, senderAcc, amountWETH.mul(-1));

        const to = senderAcc.address;
        await expect(() => reflexerGenerate(proxy, safeID, amountRai, to))
            .to.changeTokenBalance(rai, senderAcc, amountRai);
    }).timeout(80000);

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
    }).timeout(80000);
});
