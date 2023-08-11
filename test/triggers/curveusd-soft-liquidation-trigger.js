const { ethers } = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const {
    redeploy, getProxy, fetchAmountinUSDPrice, Float2BN, setBalance, approve, BN2Float,
} = require('../utils');
const { curveUsdCreate } = require('../actions');

const softLiquidationTriggerTest = () => describe('CurveUsd-Soft-Liquidation-Trigger', () => {
    const WSTETH_MARKET = '0x100dAa78fC509Db39Ef7D04DE0c1ABD299f4C6CE';
    const N_BANDS = 5;
    const COLL_USD_OPEN = '50000';
    const DEBT_USD_OPEN = '35000';

    let trigger;
    let proxyAddr;

    before(async () => {
        trigger = await redeploy('CurveUsdSoftLiquidationTrigger');

        const [senderAcc] = await ethers.getSigners();
        const senderAddr = senderAcc.address;

        const proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        const collAmount = Float2BN(fetchAmountinUSDPrice('wstETH', COLL_USD_OPEN));
        const debtAmount = Float2BN(DEBT_USD_OPEN);

        const wstEthAddr = getAssetInfo('wstETH').address;

        await setBalance(wstEthAddr, senderAddr, collAmount);
        await approve(wstEthAddr, proxyAddr);
        await curveUsdCreate(
            proxy,
            WSTETH_MARKET,
            senderAddr,
            senderAddr,
            collAmount,
            debtAmount,
            N_BANDS,
        );
    });

    it('... should trigger correctly', async () => {
        const coder = ethers.utils.defaultAbiCoder;
        const percentage = await trigger.calcPercentage(WSTETH_MARKET, proxyAddr);
        console.log({ percentage: BN2Float(percentage, 16) });

        expect(await trigger.isTriggered(
            '0x',
            coder.encode(['(address,address,uint256)'], [[WSTETH_MARKET, proxyAddr, percentage.sub(1)]]),
        )).to.be.eq(false);

        expect(await trigger.isTriggered(
            '0x',
            coder.encode(['(address,address,uint256)'], [[WSTETH_MARKET, proxyAddr, percentage]]),
        )).to.be.eq(true);
    });
});

softLiquidationTriggerTest();
