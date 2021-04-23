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

describe('Reflexer-Supply', function() {
    let senderAcc; let proxy; let reflexerView;

    before(async () => {
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        reflexerView = await redeploy('RaiLoanInfo');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    })

    it('... should supply standard amount of WETH to safe', async () => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);

        amountWETH = hre.ethers.utils.parseUnits(standardAmounts['WETH'], 18);
        await depositToWeth(amountWETH.toString());

        const safeID = await lastSafeID(proxy.address);
        const from = senderAcc.address;
        await reflexerSupply(proxy, safeID, amountWETH, ADAPTER_ADDRESS, from);
        
        const info = await getSafeInfo(reflexerView, safeID); 
        expect(info.coll.toString()).to.be.equal(amountWETH);
    }).timeout(40000);

    it('... should supply all WETH to safe', async () => {
        await reflexerOpen(proxy, ADAPTER_ADDRESS);

        amountWETH = hre.ethers.utils.parseUnits(standardAmounts['WETH'], 18);
        await depositToWeth(amountWETH.toString());
        await send(WETH_ADDRESS, proxy.address, amountWETH);

        const safeID = await lastSafeID(proxy.address);
        const from = senderAcc.address;
        await reflexerSupply(proxy, safeID, MAX_UINT, ADAPTER_ADDRESS, from);
        
        const info = await getSafeInfo(reflexerView, safeID); 
        expect(info.coll.toString()).to.be.equal(amountWETH);
    }).timeout(40000);
})