const hre = require('hardhat');
const { expect } = require('chai');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    UNIV3POSITIONMANAGER_ADDR,
    balanceOf,
    DAI_ADDR,
    getAddrFromRegistry,
    openStrategyAndBundleStorage,
} = require('../utils');

const { createStrategy, addBotCaller } = require('../utils-strategies');

const { callUniV3RangeOrderStrategy } = require('../strategy-calls');
const { subUniV3RangeOrderStrategy } = require('../strategy-subs');
const { createUniV3RangeOrderStrategy } = require('../strategies');

const { uniV3Mint } = require('../actions');

describe('Uni-v3-range-order strat', function () {
    this.timeout(120000);

    let senderAcc;
    let proxy;
    let botAcc;
    let strategyExecutor;
    let subId;
    let strategySub;
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

        await redeploy('UniV3CurrentTickTrigger');
        await redeploy('DFSSell');

        const subStorageAddr = getAddrFromRegistry('SubStorage');
        subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

        await redeploy('GasFeeTaker');
        await redeploy('UniMintV3');
        await redeploy('UniWithdrawV3');

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

        await openStrategyAndBundleStorage();

        const strategyData = createUniV3RangeOrderStrategy();
        const strategyId = await createStrategy(proxy, ...strategyData, false);
        // Created strategy with three slots for user input when they subscribe
        // One trigger and recipe consisting of one action

        positionManager.approve(proxy.address, tokenId);
        // eslint-disable-next-line max-len
        ({ subId, strategySub } = await subUniV3RangeOrderStrategy(proxy, tokenId, 0, senderAcc.address, strategyId));
        // user subscribes to strategy and fills three slots
        console.log(await subStorage.getSub(subId));
    });

    it('... should trigger and execute uniswap v3 range order strategy', async () => {
        const daiBalanceBefore = await balanceOf(DAI_ADDR, senderAcc.address);
        const numberOfPositions = await positionManager.balanceOf(senderAcc.address);
        const tokenId = await positionManager.tokenOfOwnerByIndex(senderAcc.address, numberOfPositions.sub('1').toString());
        const position = await positionManager.positions(tokenId);
        const liquidity = position.liquidity;
        await callUniV3RangeOrderStrategy(
            botAcc,
            strategyExecutor,
            subId,
            strategySub,
            liquidity,
            senderAcc.address,
            senderAcc.address,
        );
        const daiBalanceAfter = await balanceOf(DAI_ADDR, senderAcc.address);
        const liquidityAfter = (await positionManager.positions(tokenId)).liquidity;
        expect(liquidityAfter).to.be.eq(0);
        expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        console.log((await positionManager.positions(tokenId)).liquidity.toString());
    });
});
