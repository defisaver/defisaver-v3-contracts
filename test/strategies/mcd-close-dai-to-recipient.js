const hre = require('hardhat');
const { expect } = require('chai');

const { ilks } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    getAddrFromRegistry,
    WETH_ADDRESS,
    ETH_ADDR,
    getChainLinkPrice,
    DAI_ADDR,
    balanceOf,
    openStrategyAndBundleStorage,
} = require('../utils');

const { createStrategy, addBotCaller } = require('../utils-strategies');

const { subMcdCloseStrategy } = require('../strategy-subs');
const { callMcdCloseStrategy } = require('../strategy-calls');
const { createMcdCloseStrategy } = require('../strategies');

const { openVault } = require('../actions');

describe('Mcd-Close Strategy (convert coll to DAI, payback debt, send DAI to recipient)', function () {
    this.timeout(120000);
    const ethJoin = ilks[0].join;
    let senderAcc;
    let proxy;
    let botAcc;
    let strategyExecutor;
    let vaultId;
    let makerFlAddr;
    let subStorage;
    let subId;
    let strategySub;
    let flAmount;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        await redeploy('SendToken');
        await redeploy('McdRatioTrigger');
        await redeploy('DFSSell');
        await redeploy('McdView');
        await redeploy('GasFeeTaker');
        await redeploy('McdRatioCheck');
        strategyExecutor = await redeploy('StrategyExecutor');

        const subStorageAddr = getAddrFromRegistry('SubStorage');
        subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

        await redeploy('McdSupply');
        await redeploy('McdWithdraw');
        await redeploy('McdGenerate');
        await redeploy('McdPayback');
        await redeploy('McdOpen');
        await redeploy('ChainLinkPriceTrigger');
        await addBotCaller(botAcc.address);
        makerFlAddr = await getAddrFromRegistry('FLMaker');
        proxy = await getProxy(senderAcc.address);
    });

    it('... should make a new strategy that closes CDP when price hits a point, transfers ETH to DAI, repays debt, transfers all remaining DAI to user', async () => {
        const vaultColl = fetchAmountinUSDPrice('WETH', '40000');
        const amountDai = fetchAmountinUSDPrice('DAI', '18000');
        vaultId = await openVault(
            proxy,
            'ETH-A',
            vaultColl,
            amountDai,
        );
        console.log(`VaultId: ${vaultId}`);
        console.log(`Vault collateral${vaultColl}`);
        console.log(`Vault debt${amountDai}`);
        flAmount = (parseFloat(amountDai) + 1).toString();
        flAmount = hre.ethers.utils.parseUnits(flAmount, 18);

        await openStrategyAndBundleStorage();

        const strategyData = createMcdCloseStrategy();

        console.log(strategyData);
        const strategyId = await createStrategy(proxy, ...strategyData, false);

        const currPrice = await getChainLinkPrice(ETH_ADDR);

        const targetPrice = currPrice - 100; // Target is smaller so we can execute it
        ({ subId, strategySub } = await subMcdCloseStrategy(
            vaultId,
            proxy,
            targetPrice,
            WETH_ADDRESS,
            strategyId,
        ));
        console.log(subId);
        console.log(await subStorage.getSub(subId));
    });

    it('... should trigger a mcd close strategy', async () => {
        const daiBalanceBefore = await balanceOf(DAI_ADDR, senderAcc.address);
        console.log(`Dai before closing : ${daiBalanceBefore.toString()}`);
        await callMcdCloseStrategy(
            proxy, botAcc, strategyExecutor, subId, strategySub, flAmount, ethJoin, makerFlAddr,
        );
        const daiBalanceAfter = await balanceOf(DAI_ADDR, senderAcc.address);
        console.log(`Dai after closing : ${daiBalanceAfter.toString()}`);
        expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
    });
    it('... should fail to trigger the same strategy again as its one time', async () => {
        try {
            await callMcdCloseStrategy(
                proxy, botAcc, strategyExecutor, subId, strategySub, flAmount, ethJoin, makerFlAddr,
            );
        } catch (err) {
            expect(err.toString()).to.have.string('SubNotEnabled');
        }
    });
});
