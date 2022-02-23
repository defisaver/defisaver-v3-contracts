const hre = require('hardhat');
const { expect } = require('chai');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    openStrategyAndBundleStorage,
    getAddrFromRegistry,
    UNIV3POSITIONMANAGER_ADDR,
    Float2BN,
} = require('../utils');

const { createStrategy, addBotCaller } = require('../utils-strategies');

const { callUniV3CollectStrategy } = require('../strategy-calls');
const { subUniContinuousCollectStrategy } = require('../strategy-subs');
const { createContinuousUniV3CollectStrategy } = require('../strategies');

const { uniV3Mint } = require('../actions');

describe('Uni-v3-range-order strategy', function () {
    this.timeout(120000);

    let senderAcc;
    let proxy;
    let botAcc;
    let strategyExecutor;
    let subId;
    let strategySub;
    let positionManager;
    let subStorage;
    let strategyTriggerView;
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

        await redeploy('TimestampTrigger');
        await redeploy('GasPriceTrigger');
        await redeploy('DFSSell');

        await redeploy('GasFeeTaker');
        await redeploy('UniMintV3');
        await redeploy('UniCollectV3');

        const subStorageAddr = getAddrFromRegistry('SubStorage');
        subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

        const strategyExecutorAddr = getAddrFromRegistry('StrategyExecutor');
        strategyExecutor = await hre.ethers.getContractAt('StrategyExecutor', strategyExecutorAddr);

        positionManager = await hre.ethers.getContractAt('IUniswapV3NonfungiblePositionManager', UNIV3POSITIONMANAGER_ADDR);
        strategyTriggerView = await redeploy('StrategyTriggerView');
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

        const strategyData = createContinuousUniV3CollectStrategy();
        await openStrategyAndBundleStorage();

        await createStrategy(proxy, ...strategyData, true);
        // Created strategy with three slots for user input when they subscribe
        // One trigger and recipe consisting of one action

        positionManager.approve(proxy.address, tokenId);
        let timestamp = (await hre.ethers.provider.getBlock()).timestamp;
        console.log(timestamp);
        timestamp -= 2;
        const maxGasPrice = '20000000000';
        const interval = '4';

        ({ subId, strategySub } = await subUniContinuousCollectStrategy(
            proxy, tokenId, senderAcc.address, timestamp, maxGasPrice, interval,
        ));
        // user subscribes to strategy and fills three slots
        const subInfo = await subStorage.getSub(subId);
        console.log(subInfo);
    });

    it('... should trigger and execute uniswap v3 collect strategy', async () => {
        const abiCoder = hre.ethers.utils.defaultAbiCoder;
        const triggerCallData = [];
        // triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
        // triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
        // console.log(await strategyTriggerView.callStatic.checkTriggers(
        //     strategySub, triggerCallData,
        // ));
        await callUniV3CollectStrategy(
            botAcc,
            strategyExecutor,
            subId,
            strategySub,
            proxy.address,
            subStorage.address,
            '1630056291',
        );
        // const eventFilter = subStorage.filters.UpdateData(Float2BN(subId));
        // const eventArray = await subStorage.queryFilter(eventFilter);
        // const event = eventArray[eventArray.length - 1];
        // strategySub = abiCoder.decode(['(uint64,bool,bytes[],bytes32[])'], event.data)[0];
    });
    it('... should trigger and execute uniswap v3 collect strategy again', async () => {
        const abiCoder = hre.ethers.utils.defaultAbiCoder;
        const triggerCallData = [];
        triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
        triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
        console.log(await strategyTriggerView.callStatic.checkTriggers(
            strategySub, triggerCallData,
        ));
        await callUniV3CollectStrategy(
            botAcc,
            strategyExecutor,
            subId,
            strategySub,
            proxy.address,
            subStorage.address,
            '1850056291',
        );

        const eventFilter = subStorage.filters.UpdateData(Float2BN(subId));
        const eventArray = await subStorage.queryFilter(eventFilter);
        const event = eventArray[eventArray.length - 1];

        strategySub = abiCoder.decode(['(uint64,bool,bytes[],bytes32[])'], event.data)[0];
    });
    it('... should fail to trigger and execute uniswap v3 collect strategy', async () => {
        const abiCoder = hre.ethers.utils.defaultAbiCoder;
        const triggerCallData = [];
        triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
        triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
        console.log(await strategyTriggerView.callStatic.checkTriggers(
            strategySub, 0, triggerCallData,
        ));

        try {
            await callUniV3CollectStrategy(
                botAcc,
                strategyExecutor,
                subId,
                strategySub,
                proxy.address,
                subStorage.address,
                '1850056291',
            );
        } catch (err) {
            console.log(err);
            expect(err.toString()).to.have.string('reverted');
        }
    });
});
