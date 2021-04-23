const { expect } = require('chai');
const hre = require('hardhat');
const {
    getProxy,
    redeploy,
    WETH_ADDRESS,
    standardAmounts,
    balanceOf,
    MAX_UINT,
    send,
    depositToWeth,
    MIN_VAULT_RAI_AMOUNT,
    RAI_ADDR,
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

describe('Reflexer-Payback', function() {
    let senderAcc; let proxy; let reflexerView;

    before(async () => {
        this.timeout(40000);
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        await redeploy('ReflexerGenerate');
        await redeploy('ReflexerPayback');
        reflexerView = await redeploy('RaiLoanInfo');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should payback half of RAI debt for safe', async() => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);

        let amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
        let amountWETH = hre.ethers.utils.parseUnits(standardAmounts['WETH'], 18);
        amountWETH = amountWETH.mul(5); //20 eth
        amountRai = amountRai.mul(10); //10k rai
        await depositToWeth(amountWETH.toString());

        const from = senderAcc.address;
        const raiBalanceBefore = await balanceOf(RAI_ADDR, from);
        const safeID = await lastSafeID(proxy.address);
        await reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from);

        const to = senderAcc.address;
        await reflexerGenerate(proxy, safeID, amountRai, to);

        const raiBalanceAfterGenerate = await balanceOf(RAI_ADDR, from);
        expect(raiBalanceBefore.add(amountRai)).to.be.eq(raiBalanceAfterGenerate);
        
        const amountToPayback = amountRai.div(2); //5k rai
        await reflexerPayback(proxy, safeID, amountToPayback, from, RAI_ADDR);

        const raiBalanceAfterPayback = await balanceOf(RAI_ADDR, from);
        expect(raiBalanceAfterPayback).to.be.equal(raiBalanceAfterGenerate.sub(amountToPayback));
    }).timeout(50000);

    it('... should payback all of RAI debt for safe', async() => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);

        let amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
        let amountWETH = hre.ethers.utils.parseUnits(standardAmounts['WETH'], 18);
        amountWETH = amountWETH.mul(5); //20 eth
        amountRai = amountRai.mul(10); //10k rai
        await depositToWeth(amountWETH.toString());

        const from = senderAcc.address;
        const raiBalanceBefore = await balanceOf(RAI_ADDR, from);
        const safeID = await lastSafeID(proxy.address);
        await reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from);

        const to = senderAcc.address;
        await reflexerGenerate(proxy, safeID, amountRai, to);

        const raiBalanceAfterGenerate = await balanceOf(RAI_ADDR, from);
        expect(raiBalanceBefore.add(amountRai)).to.be.eq(raiBalanceAfterGenerate);
        
        await reflexerPayback(proxy, safeID, MAX_UINT, from, RAI_ADDR);

        const info = await getSafeInfo(reflexerView, safeID); 
        expect(info.debt).to.be.equal(0);
    }).timeout(50000);
})