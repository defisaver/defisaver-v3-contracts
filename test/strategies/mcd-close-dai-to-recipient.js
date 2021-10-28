const hre = require('hardhat');
const { expect } = require('chai');

const dfs = require('@defisaver/sdk');

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    formatExchangeObj,
    nullAddress,
    getAddrFromRegistry,
    WETH_ADDRESS,
    ETH_ADDR,
    getChainLinkPrice,
    DAI_ADDR,
    balanceOf,
} = require('../utils');

const { createStrategy, addBotCaller } = require('../utils-strategies');

const { subMcdCloseStrategy, callMcdCloseStrategy } = require('../strategies');

const { openVault } = require('../actions');

const { fetchMakerAddresses } = require('../utils-mcd');

describe('Mcd-Close Strategy (convert coll to DAI, payback debt, send DAI to recipient)', function () {
    this.timeout(120000);
    const ethJoin = ilks[0].join;
    let senderAcc;
    let proxy;
    let makerAddresses;
    let botAcc;
    let strategyExecutor;
    let vaultId;
    let dydxFlAddr;
    let subStorage;
    let subId;
    let flAmount;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        await redeploy('FLDyDx');
        await redeploy('SendToken');
        await redeploy('BotAuth');
        await redeploy('ProxyAuth');
        await redeploy('McdRatioTrigger');
        await redeploy('McdWithdraw');
        await redeploy('DFSSell');
        await redeploy('McdPayback');
        await redeploy('StrategyStorage');
        subStorage = await redeploy('SubStorage');
        await redeploy('McdView');
        await redeploy('SubProxy');
        await redeploy('StrategyProxy');
        await redeploy('RecipeExecutor');
        await redeploy('GasFeeTaker');
        await redeploy('McdRatioCheck');
        strategyExecutor = await redeploy('StrategyExecutor');
        await redeploy('FLDyDx');
        await redeploy('McdSupply');
        await redeploy('McdWithdraw');
        await redeploy('McdGenerate');
        await redeploy('McdPayback');
        await redeploy('McdOpen');
        await redeploy('ChainLinkPriceTrigger');
        await addBotCaller(botAcc.address);
        dydxFlAddr = await getAddrFromRegistry('FLDyDx');
        proxy = await getProxy(senderAcc.address);

        makerAddresses = await fetchMakerAddresses();
    });

    it('... should make a new strategy that closes CDP when price hits a point, transfers ETH to DAI, repays debt, transfers all remaining DAI to user', async () => {
        const tokenData = getAssetInfo('WETH');
        const vaultColl = fetchAmountinUSDPrice('WETH', '30000');
        const amountDai = fetchAmountinUSDPrice('DAI', '12000');
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

        const mcdCloseStrategy = new dfs.Strategy('MakerCloseStrategy');
        mcdCloseStrategy.addSubSlot('&vaultId', 'uint256');
        mcdCloseStrategy.addSubSlot('&recipient', 'address');

        const chainLinkPriceTrigger = new dfs.triggers.ChainLinkPriceTrigger(nullAddress, '0', '0');
        mcdCloseStrategy.addTrigger(chainLinkPriceTrigger);
        console.log(flAmount.toString());
        mcdCloseStrategy.addAction(
            new dfs.actions.flashloan.DyDxFlashLoanAction(
                '%loanAmount',
                '%daiAddr',
                nullAddress,
                [],
            ),
        );
        mcdCloseStrategy.addAction(
            new dfs.actions.maker.MakerPaybackAction(
                '&vaultId',
                '%daiAmountToPayback(maxUint)',
                '&proxy',
                '%mcdManager',
            ),
        );
        mcdCloseStrategy.addAction(
            new dfs.actions.maker.MakerWithdrawAction(
                '&vaultId',
                '%ethAmountToWithdraw(maxUint)',
                '%ethJoin',
                '&proxy',
                '%mcdManager',
            ),
        );
        mcdCloseStrategy.addAction(
            new dfs.actions.basic.SellAction(
                formatExchangeObj(
                    '%wethAddr',
                    '%daiAddr',
                    '%amountToSell(maxUint)',
                    '%exchangeWrapper',
                ),
                '&proxy',
                '&proxy',
            ),
        );
        mcdCloseStrategy.addAction(
            new dfs.actions.basic.SendTokenAction(
                '%daiAddr',
                '%dydxFlAddr',
                '%amountToPayback',
            ),
        );
        mcdCloseStrategy.addAction(
            new dfs.actions.basic.SendTokenAction(
                '%daiAddr',
                '&recipient',
                '%amountToRecipient(maxUint)',
            ),
        );
        const callData = mcdCloseStrategy.encodeForDsProxyCall();
        await createStrategy(proxy, ...callData, false);

        const currPrice = await getChainLinkPrice(ETH_ADDR);

        const targetPrice = currPrice - 100; // Target is smaller so we can execute it
        subId = await subMcdCloseStrategy(
            vaultId,
            proxy,
            senderAcc.address,
            targetPrice,
            WETH_ADDRESS,
        );
        console.log(subId);
        console.log(await subStorage.getSub(subId));
    });

    it('... should trigger a mcd close strategy', async () => {
        const daiBalanceBefore = await balanceOf(DAI_ADDR, senderAcc.address);
        console.log(`Dai before closing : ${daiBalanceBefore.toString()}`);
        await callMcdCloseStrategy(
            proxy, botAcc, strategyExecutor, subId, flAmount, ethJoin, dydxFlAddr,
        );
        const daiBalanceAfter = await balanceOf(DAI_ADDR, senderAcc.address);
        console.log(`Dai after closing : ${daiBalanceAfter.toString()}`);
        expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
    });
    it('... should fail to trigger the same strategy again as its one time', async () => {
        try {
            await callMcdCloseStrategy(
                proxy, botAcc, strategyExecutor, subId, flAmount, ethJoin, dydxFlAddr,
            );
        } catch (err) {
            expect(err.toString()).to.have.string('SubNotActiveError');
        }
    });
});
