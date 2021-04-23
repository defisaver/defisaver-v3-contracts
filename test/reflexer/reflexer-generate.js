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
} = require('../actions.js');

describe('Reflexer-Generate', function() {
    
    let senderAcc; let proxy; let reflexerView;

    before(async () => {
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        await redeploy('ReflexerWithdraw')
        await redeploy('ReflexerGenerate')
        reflexerView = await redeploy('RaiLoanInfo');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should generate ${MIN_VAULT_RAI_AMOUNT} for WETH safe', async () => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);

        const amountRai = hre.ethers.utils.parseUnits(MIN_VAULT_RAI_AMOUNT, 18);
        const amountWETH = hre.ethers.utils.parseUnits(standardAmounts['WETH'], 18);
        await depositToWeth(amountWETH.toString());
        
        const from = senderAcc.address;
        const raiBalanceBefore = await balanceOf(RAI_ADDR, from);
        const safeID = await lastSafeID(proxy.address);
        await reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from);
        
        const to = senderAcc.address;
        await reflexerGenerate(proxy, safeID, amountRai, to);

        const raiBalanceAfter = await balanceOf(RAI_ADDR, from);
        
        expect(raiBalanceBefore.add(amountRai)).to.be.eq(raiBalanceAfter);

    }).timeout(40000);
})