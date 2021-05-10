const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    redeploy,
    WETH_ADDRESS,
    standardAmounts,
    balanceOf,
    send,
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
} = require('../actions.js');

describe('Reflexer-Supply', () => {
    let senderAcc; let proxy; let reflexerView; let weth; let logger;

    before(async () => {
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        reflexerView = await redeploy('RaiLoanInfo');
        weth = await hre.ethers.getContractAt('IWETH', WETH_ADDRESS);
        logger = await hre.ethers.getContractAt('DefisaverLogger', '0x5c55B921f590a89C1Ebe84dF170E655a82b62126');
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should supply standard amount of WETH to safe', async () => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);

        const amountWETH = hre.ethers.utils.parseUnits(standardAmounts.WETH, 18);
        await depositToWeth(amountWETH.toString());

        const safeID = await lastSafeID(proxy.address);
        const from = senderAcc.address;
        await expect(() => reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from))
            .to.changeTokenBalance(weth, senderAcc, amountWETH.mul(-1));

        const info = await getSafeInfo(reflexerView, safeID);
        expect(info.coll.toString()).to.be.equal(amountWETH);
    }).timeout(40000);

    it('... should supply all WETH to safe from proxy', async () => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);

        const amountWETH = hre.ethers.utils.parseUnits(standardAmounts.WETH, 18);
        await depositToWeth(amountWETH.toString());
        await send(WETH_ADDRESS, proxy.address, amountWETH);

        const safeID = await lastSafeID(proxy.address);
        const from = proxy.address;
        const proxyStartingBalance = await balanceOf(WETH_ADDRESS, proxy.address);
        await expect(() => reflexerSupply(proxy, safeID, hre.ethers.constants.MaxUint256, ADAPTER_ADDRESS, from))
            .to.changeTokenBalance(weth, proxy, proxyStartingBalance.mul(-1));

        const info = await getSafeInfo(reflexerView, safeID);
        expect(info.coll.toString()).to.be.equal(proxyStartingBalance);
    }).timeout(40000);

    it('... should supply all WETH to safe from EOA', async () => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);

        const amountWETH = hre.ethers.utils.parseUnits(standardAmounts.WETH, 18);
        await depositToWeth(amountWETH.toString());

        const safeID = await lastSafeID(proxy.address);
        const from = senderAcc.address;
        const startingBalance = await balanceOf(WETH_ADDRESS, from);
        await expect(() => reflexerSupply(proxy, safeID, hre.ethers.constants.MaxUint256, ADAPTER_ADDRESS, from))
            .to.changeTokenBalance(weth, senderAcc, startingBalance.mul(-1));

        const info = await getSafeInfo(reflexerView, safeID);
        expect(info.coll.toString()).to.be.equal(startingBalance);
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
    }).timeout(40000);
});
