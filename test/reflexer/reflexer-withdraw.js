const { expect } = require('chai');
const hre = require('hardhat');
const {
    getProxy,
    redeploy,
    WETH_ADDRESS,
    standardAmounts,
    MAX_UINT,
    balanceOf,
    depositToWeth,
} = require('../utils');

const {
    lastSafeID,
    getSafeInfo,
    ADAPTER_ADDRESS
} = require('../utils-reflexer.js');

const {
    reflexerOpen,
    reflexerSupply,
    reflexerWithdraw,
} = require('../actions.js');

describe('Reflexer-Withdraw', function() {
    
    let senderAcc; let proxy; let reflexerView;

    before(async () => {
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        await redeploy('ReflexerWithdraw')
        reflexerView = await redeploy('RaiLoanInfo');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    })

    it('... should withdraw 1/4 of coll WETH from safe', async() => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);

        amountWETH = hre.ethers.utils.parseUnits(standardAmounts['WETH'], 18);
        await depositToWeth(amountWETH.toString());

        const safeID = await lastSafeID(proxy.address);
        const from = senderAcc.address;
        await reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from);
        
        const infoBeforeWithdraw = await getSafeInfo(reflexerView, safeID);
        
        const to = senderAcc.address;
        firstWETHCheck = await balanceOf(WETH_ADDRESS, to);
        const amountToWithdraw = (infoBeforeWithdraw.coll/4).toString();
        await reflexerWithdraw(proxy, safeID, amountToWithdraw, ADAPTER_ADDRESS, to)
        
        const infoAfterWithdraw = await getSafeInfo(reflexerView, safeID);
        expect(infoAfterWithdraw.coll).to.be.equal(amountWETH.sub(amountToWithdraw));

        const secondWETHCheck = await balanceOf(WETH_ADDRESS, to);
        const amountWithdrawn = secondWETHCheck.sub(firstWETHCheck);
        expect(amountWithdrawn).to.be.equal(amountToWithdraw);
    }).timeout(40000);

    it('... should withdraw all coll WETH from safe', async() => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);
        
        amountWETH = hre.ethers.utils.parseUnits(standardAmounts['WETH'], 18);
        await depositToWeth(amountWETH.toString());

        const safeID = await lastSafeID(proxy.address);
        const from = senderAcc.address;
        await reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from);
        
        const to = senderAcc.address;
        firstWETHCheck = await balanceOf(WETH_ADDRESS, to);
        await reflexerWithdraw(proxy, safeID, MAX_UINT, ADAPTER_ADDRESS, to)

        const infoAfterWithdraw = await getSafeInfo(reflexerView, safeID);
        expect(infoAfterWithdraw.coll).to.be.equal(0);

        const secondWETHCheck = await balanceOf(WETH_ADDRESS, to);
        const amountWithdrawn =  (secondWETHCheck - firstWETHCheck).toString();
        expect(amountWithdrawn).to.be.equal(amountWETH);
    }).timeout(40000);
})