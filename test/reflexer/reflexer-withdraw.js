const { expect } = require('chai');
const hre = require('hardhat');
const {
    getProxy,
    redeploy,
    WETH_ADDRESS,
    standardAmounts,
    MAX_UINT,
    depositToWeth,
} = require('../utils');

const {
    lastSafeID,
    getSafeInfo,
    ADAPTER_ADDRESS,
} = require('../utils-reflexer.js');

const {
    reflexerOpen,
    reflexerSupply,
    reflexerWithdraw,
} = require('../actions.js');

describe('Reflexer-Withdraw', () => {
    let senderAcc; let proxy; let reflexerView; let weth; let logger;

    before(async () => {
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        await redeploy('ReflexerWithdraw');
        reflexerView = await redeploy('RaiLoanInfo');
        weth = await hre.ethers.getContractAt('IWETH', WETH_ADDRESS);
        logger = await hre.ethers.getContractAt('DefisaverLogger', '0x5c55B921f590a89C1Ebe84dF170E655a82b62126');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should withdraw 1/4 of coll WETH from safe', async () => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);

        const amountWETH = hre.ethers.utils.parseUnits(standardAmounts.WETH, 18);
        await depositToWeth(amountWETH.toString());

        const safeID = await lastSafeID(proxy.address);
        const from = senderAcc.address;
        await reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from);

        const infoBeforeWithdraw = await getSafeInfo(reflexerView, safeID);

        const to = senderAcc.address;
        const amountToWithdraw = (infoBeforeWithdraw.coll / 4).toString();

        await expect(() => reflexerWithdraw(proxy, safeID, amountToWithdraw, ADAPTER_ADDRESS, to))
            .to.changeTokenBalance(weth, senderAcc, amountToWithdraw);

        const infoAfterWithdraw = await getSafeInfo(reflexerView, safeID);
        expect(infoAfterWithdraw.coll).to.be.equal(amountWETH.sub(amountToWithdraw));
    }).timeout(40000);

    it('... should withdraw all coll WETH from safe', async () => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);
        const safeID = await lastSafeID(proxy.address);

        const amountWETH = hre.ethers.utils.parseUnits(standardAmounts.WETH, 18);
        await depositToWeth(amountWETH.toString());

        const from = senderAcc.address;
        await expect(() => reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
            .to.changeTokenBalance(weth, senderAcc, amountWETH.mul(-1));

        const to = senderAcc.address;
        await expect(() => reflexerWithdraw(proxy, safeID, MAX_UINT, ADAPTER_ADDRESS, to))
            .to.changeTokenBalance(weth, senderAcc, amountWETH);

        const infoAfterWithdraw = await getSafeInfo(reflexerView, safeID);
        expect(infoAfterWithdraw.coll).to.be.equal(0);
    }).timeout(40000);

    it('... should log every event', async () => {
        await expect(reflexerOpen(proxy, ADAPTER_ADDRESS))
            .to.emit(logger, 'LogEvent');

        const amountWETH = hre.ethers.utils.parseUnits(standardAmounts.WETH, 18);
        await depositToWeth(amountWETH.toString());

        const safeID = await lastSafeID(proxy.address);
        const from = senderAcc.address;
        await expect(reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
            .to.emit(logger, 'LogEvent');
        const to = senderAcc.address;
        await expect(reflexerWithdraw(proxy, safeID, MAX_UINT, ADAPTER_ADDRESS, to))
            .to.emit(logger, 'LogEvent');
    }).timeout(40000);
});
