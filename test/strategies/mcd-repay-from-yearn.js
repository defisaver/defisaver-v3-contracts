const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    approve,
    YEARN_REGISTRY_ADDRESS,
    balanceOf,
    DAI_ADDR,
    setBalance,
    depositToWeth,
    WETH_ADDRESS,
    getAddrFromRegistry,
} = require('../utils');

const {
    addBotCaller,
    setMCDPriceVerifier,
} = require('../utils-strategies');

const { getRatio } = require('../utils-mcd');

const { callMcdRepayFromYearnStrategy, callMcdRepayFromYearnWithExchangeStrategy } = require('../strategy-calls');
const { subRepayFromSavingsStrategy } = require('../strategy-subs');

const { openVault, yearnSupply } = require('../actions');

describe('Mcd-Repay-Yearn-Strategy', function () {
    this.timeout(1200000);

    let senderAcc;
    let proxy;
    let botAcc;
    let strategyExecutor;
    let subId;
    let vaultId;
    let mcdView;
    let mcdRatioTriggerAddr;
    let yearnRegistry;
    let strategySub;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        mcdRatioTriggerAddr = getAddrFromRegistry('McdRatioTrigger');
        mcdView = await redeploy('McdView');
        const strategyExecutorAddr = getAddrFromRegistry('StrategyExecutor');
        strategyExecutor = await hre.ethers.getContractAt('StrategyExecutor', strategyExecutorAddr);

        await addBotCaller(botAcc.address);

        await setMCDPriceVerifier(mcdRatioTriggerAddr);
        yearnRegistry = await hre.ethers.getContractAt('IYearnRegistry', YEARN_REGISTRY_ADDRESS);

        proxy = await getProxy(senderAcc.address);
    });

    it('... should sub the user to a repay bundle ', async () => {
        // create vault
        vaultId = await openVault(
            proxy,
            'ETH-A',
            fetchAmountinUSDPrice('WETH', '60000'),
            fetchAmountinUSDPrice('DAI', '30000'),
        );

        console.log('Vault id: ', vaultId);

        // Deposit money to yearn
        const daiAmount = hre.ethers.utils.parseUnits('100000', 18);

        await setBalance(DAI_ADDR, senderAcc.address, daiAmount);
        await approve(DAI_ADDR, proxy.address);

        await yearnSupply(
            DAI_ADDR,
            daiAmount,
            senderAcc.address,
            proxy.address,
            proxy,
        );

        // Deposit some weth in yearn
        const wethAmount = hre.ethers.utils.parseUnits('10', 18);

        await depositToWeth(wethAmount);
        await approve(WETH_ADDRESS, proxy.address);

        await yearnSupply(
            WETH_ADDRESS,
            wethAmount,
            senderAcc.address,
            proxy.address,
            proxy,
        );

        const ratioUnder = hre.ethers.utils.parseUnits('3', '18');
        const targetRatio = hre.ethers.utils.parseUnits('3.2', '18');

        const bundleId = 0;
        ({ subId, strategySub } = await subRepayFromSavingsStrategy(
            proxy, bundleId, vaultId, ratioUnder, targetRatio, true,
        ));
    });

    it('... should trigger a maker repay strategy from yearn', async () => {
        const yToken = await yearnRegistry.latestVault(DAI_ADDR);

        console.log(yToken);
        const yTokenBalanceBefore = await balanceOf(yToken, senderAcc.address);
        console.log(yTokenBalanceBefore.toString());

        await approve(yToken, proxy.address);

        const ratioBefore = await getRatio(mcdView, vaultId);
        const repayAmount = hre.ethers.utils.parseUnits('5000', 18);

        await callMcdRepayFromYearnStrategy(
            botAcc, strategyExecutor, 0, subId, strategySub, yToken, repayAmount,
        );

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioAfter).to.be.gt(ratioBefore);
    });

    it('... should trigger a maker repay strategy from yearn with exchange', async () => {
        const yToken = await yearnRegistry.latestVault(WETH_ADDRESS);
        const yTokenBalanceBefore = await balanceOf(yToken, senderAcc.address);
        console.log(yTokenBalanceBefore.toString());

        await approve(yToken, proxy.address);

        const ratioBefore = await getRatio(mcdView, vaultId);
        const repayAmount = hre.ethers.utils.parseUnits('1', 18);

        await callMcdRepayFromYearnWithExchangeStrategy(
            botAcc, strategyExecutor, 1, subId, strategySub, yToken, repayAmount,
        );

        const ratioAfter = await getRatio(mcdView, vaultId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioAfter).to.be.gt(ratioBefore);
    });
});
