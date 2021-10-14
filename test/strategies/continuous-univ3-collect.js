const hre = require('hardhat');
const { expect } = require('chai');

const dfs = require('@defisaver/sdk');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    UNIV3POSITIONMANAGER_ADDR,
} = require('../utils');

const { createStrategy, addBotCaller } = require('../utils-strategies');

const { subUniContinuousCollectStrategy, callUniV3CollectStrategy } = require('../strategies');

const { uniV3Mint } = require('../actions');

describe('Uni-v3-range-order strat', function () {
    this.timeout(120000);

    let senderAcc;
    let proxy;
    let botAcc;
    let strategyExecutor;
    let strategyId;
    let positionManager;
    let subStorage;
    const uniPair = {
        tokenA: 'DAI',
        tokenB: 'WETH',
        amount0: fetchAmountinUSDPrice('DAI', '1000'),
        amount1: '0',
        fee: '3000',
        tickLower: '-69120',
        tickUpper: '-69060',
    };

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        await redeploy('BotAuth');
        await redeploy('ProxyAuth');
        await redeploy('TimestampTrigger');
        await redeploy('GasPriceTrigger');
        await redeploy('DFSSell');
        await redeploy('StrategyStorage');
        subStorage = await redeploy('SubStorage');
        await redeploy('SubProxy');
        await redeploy('StrategyProxy');
        await redeploy('RecipeExecutor');
        await redeploy('GasFeeTaker');
        await redeploy('UniMintV3');
        await redeploy('UniCollectV3');
        strategyExecutor = await redeploy('StrategyExecutor');
        positionManager = await hre.ethers.getContractAt('IUniswapV3NonfungiblePositionManager', UNIV3POSITIONMANAGER_ADDR);

        await addBotCaller(botAcc.address);

        proxy = await getProxy(senderAcc.address);
    });

    it('... should make a new strategy for uniswap v3 range order', async () => {
        const tokenDataA = await getAssetInfo(uniPair.tokenA);
        const tokenDataB = await getAssetInfo(uniPair.tokenB);
        const amount0 = hre.ethers.utils.parseUnits(uniPair.amount0, tokenDataA.decimals);
        const amount1 = hre.ethers.utils.parseUnits(uniPair.amount1, tokenDataB.decimals);
        await uniV3Mint(proxy, tokenDataA.address, tokenDataB.address, uniPair.fee,
            uniPair.tickLower, uniPair.tickUpper,
            amount0, amount1, senderAcc.address, senderAcc.address);
        const numberOfPositions = await positionManager.balanceOf(senderAcc.address);
        const tokenId = await positionManager.tokenOfOwnerByIndex(senderAcc.address, numberOfPositions.sub('1').toString());
        const position = await positionManager.positions(tokenId);
        console.log(`Liquidity after minting : ${position.liquidity.toString()}`);
        // mint univ3 NFT - nftOwner is senderAcc.address

        const continuousUniV3Strat = new dfs.Strategy('Continuous-UniV3-Collect-Strategy');
        continuousUniV3Strat.addSubSlot('&tokenId', 'uint256');
        continuousUniV3Strat.addSubSlot('&recipient', 'address');

        const timestampTrigger = new dfs.triggers.TimestampTrigger('0');
        continuousUniV3Strat.addTrigger(timestampTrigger);

        const gasTrigger = new dfs.triggers.GasPriceTrigger('0');
        continuousUniV3Strat.addTrigger(gasTrigger);

        const collectAction = new dfs.actions.uniswapV3.UniswapV3CollectAction(
            '&tokenId',
            '&recipient',
            '%amount0Max',
            '%amount1Max',
            '%nftOwner',
        );
        continuousUniV3Strat.addAction(collectAction);
        const callData = continuousUniV3Strat.encodeForDsProxyCall();
        await createStrategy(proxy, ...callData, true);
        // Created strategy with three slots for user input when they subscribe
        // One trigger and recipe consisting of one action

        positionManager.approve(proxy.address, tokenId);
        const timestamp = '13352450';
        const maxGasPrice = '20000000000';
        const interval = '2';
        strategyId = await subUniContinuousCollectStrategy(
            proxy, tokenId, senderAcc.address, timestamp, maxGasPrice, interval,
        );
        // user subscribes to strategy and fills three slots
        expect(strategyId).to.be.eq('0');
        const subInfo = await subStorage.getSub(strategyId);
        console.log(subInfo);
    });

    it('... should trigger and execute uniswap v3 collect strategy', async () => {
        await callUniV3CollectStrategy(
            botAcc,
            strategyExecutor,
            strategyId,
            proxy.address,
            subStorage.address,
            '1630056291',
        );
    });
    it('... should trigger and execute uniswap v3 collect strategy again', async () => {
        await callUniV3CollectStrategy(
            botAcc,
            strategyExecutor,
            strategyId,
            proxy.address,
            subStorage.address,
            '1850056291',
        );
    });
    it('... should fail to trigger and execute uniswap v3 collect strategy', async () => {
        try {
            await callUniV3CollectStrategy(
                botAcc,
                strategyExecutor,
                strategyId,
                proxy.address,
                subStorage.address,
                '1850056291',
            );
        } catch (err) {
            expect(err.toString()).to.have.string('TriggerNotActiveError');
        }
    });
});
