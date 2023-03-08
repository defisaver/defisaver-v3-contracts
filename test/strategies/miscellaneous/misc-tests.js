const hre = require('hardhat');
const { expect } = require('chai');

const { getAssetInfo, set } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    approve,
    balanceOf,
    openStrategyAndBundleStorage,
    redeployCore,
    timeTravel,
    getAddrFromRegistry,
    getNetwork,
    sendEther,
    getOwnerAddr,
    setBalance,
    resetForkToBlock,
    addrs,
    chainIds,
} = require('../../utils');

const { callDcaStrategy } = require('../../strategy-calls');
const { subDcaStrategy } = require('../../strategy-subs');
const { createDCAStrategy } = require('../../strategies');
const { createDCAL2Strategy, createLimitOrderL2Strategy } = require('../../l2-strategies');

const { createStrategy, addBotCaller, getUpdatedStrategySub } = require('../../utils-strategies');

const { callLimitOrderStrategy } = require('../../strategy-calls');
const { subLimitOrderStrategy } = require('../../strategy-subs');
const { createLimitOrderStrategy } = require('../../strategies');

const DAY = 1 * 24 * 60 * 60;
const TWO_DAYS = 2 * 24 * 60 * 60;

const OrderType = {
    TAKE_PROFIT: 0,
    STOP_LOSS: 1,
};

const limitOrderStrategyTest = async () => {
    const tokenPairs = [
        {
            srcTokenSymbol: 'WETH', destTokenSymbol: 'DAI', amount: '1', uniV3Fee: '3000',
        },
        {
            srcTokenSymbol: 'WETH', destTokenSymbol: 'USDC', amount: '2', uniV3Fee: '3000',
        },
        {
            srcTokenSymbol: 'DAI', destTokenSymbol: 'WETH', amount: '1000', uniV3Fee: '3000',
        },
        {
            srcTokenSymbol: 'WBTC', destTokenSymbol: 'WETH', amount: '1', uniV3Fee: '3000',
        },
        {
            srcTokenSymbol: 'USDC', destTokenSymbol: 'WBTC', amount: '3400', uniV3Fee: '3000',
        },
    ];

    describe('Limit-Order-Strategy', function () {
        this.timeout(120000);

        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subId;
        let strategySub;
        let currPrice;
        let minPrice;
        let uniV3Wrapper;
        let network;
        let strategyId;
        let sellAmountWei;
        let tokenAddrSell;
        let tokenAddrBuy;
        const goodUntilDuration = 24 * 60 * 60;

        before(async () => {
            await resetForkToBlock(16728856);

            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            network = getNetwork();

            set('network', chainIds[network]);

            // Send eth to owner acc, needed for l2s who don't hold eth
            await sendEther(senderAcc, getOwnerAddr(), '1');

            strategyExecutor = await redeployCore(network !== 'mainnet');

            // eslint-disable-next-line no-unused-expressions
            network === 'mainnet' ? (await redeploy('LimitSell')) : (await redeploy('LimitSellL2'));
            await redeploy('OffchainPriceTrigger');

            uniV3Wrapper = await hre.ethers.getContractAt('UniswapWrapperV3', addrs[network].UNISWAP_V3_WRAPPER);

            await addBotCaller(botAcc.address);
            proxy = await getProxy(senderAcc.address);

            const strategyData = network === 'mainnet' ? createLimitOrderStrategy() : createLimitOrderL2Strategy();
            await openStrategyAndBundleStorage();

            strategyId = await createStrategy(proxy, ...strategyData, false);

            await redeploy('LimitOrderSubProxy', addrs[getNetwork()].REGISTRY_ADDR, false, false, strategyId);
        });

        for (let i = 0; i < tokenPairs.length; i++) {
            const {
                srcTokenSymbol, destTokenSymbol, amount, uniV3Fee,
            } = tokenPairs[i];

            it('... should make a new Limit order [Take profit] strategy', async () => {
                const srcToken = getAssetInfo(srcTokenSymbol);
                const destToken = getAssetInfo(destTokenSymbol);

                tokenAddrSell = srcToken.address;
                tokenAddrBuy = destToken.address;

                sellAmountWei = hre.ethers.utils.parseUnits(amount, srcToken.decimals);

                const path = hre.ethers.utils.solidityPack(['address', 'uint24', 'address'], [tokenAddrSell, uniV3Fee, tokenAddrBuy]);

                // eslint-disable-next-line max-len
                currPrice = await uniV3Wrapper.getSellRate(tokenAddrSell, tokenAddrBuy, sellAmountWei, path);

                // Set target price to 10% below current price to trigger the strategy
                const targetPrice = currPrice.sub(currPrice.div('10'));

                minPrice = currPrice.sub(currPrice.div('200')); // 0.5% slippage in the minPrice

                await approve(tokenAddrSell, proxy.address);

                ({ subId, strategySub } = await subLimitOrderStrategy(
                    proxy,
                    tokenAddrSell,
                    tokenAddrBuy,
                    sellAmountWei,
                    targetPrice,
                    goodUntilDuration,
                    OrderType.TAKE_PROFIT,
                    addrs[getNetwork()].REGISTRY_ADDR,
                ));
            });

            it('... should trigger a limit order [Take profit] strategy', async () => {
                await setBalance(tokenAddrSell, senderAcc.address, sellAmountWei);

                let destAddrTransformed = tokenAddrBuy;

                if (destTokenSymbol === 'WETH') {
                    destAddrTransformed = addrs[network].ETH_ADDR;
                }

                const buyBalanceBefore = await balanceOf(destAddrTransformed, senderAcc.address);
                const sellBalanceBefore = await balanceOf(tokenAddrSell, senderAcc.address);

                // eslint-disable-next-line max-len
                await callLimitOrderStrategy(
                    botAcc,
                    minPrice,
                    strategyExecutor,
                    subId,
                    strategySub,
                    tokenAddrSell,
                    tokenAddrBuy,
                    uniV3Fee,
                );

                const buyBalanceAfter = await balanceOf(destAddrTransformed, senderAcc.address);
                const sellBalanceAfter = await balanceOf(tokenAddrSell, senderAcc.address);

                expect(buyBalanceAfter).to.be.gt(buyBalanceBefore);
                expect(sellBalanceBefore).to.be.gt(sellBalanceAfter);
            });

            it('... should fail to trigger the same strategy again as its one time', async () => {
                try {
                    await setBalance(tokenAddrSell, senderAcc.address, sellAmountWei);

                    await callLimitOrderStrategy(
                        botAcc,
                        minPrice,
                        strategyExecutor,
                        subId,
                        strategySub,
                        tokenAddrSell,
                        tokenAddrBuy,
                        uniV3Fee,
                    );
                } catch (err) {
                    expect(err.toString()).to.have.string('SubNotEnabled');
                }
            });

            it('... should make a new Limit order [Stop loss] strategy', async () => {
                const srcToken = getAssetInfo(srcTokenSymbol);
                const destToken = getAssetInfo(destTokenSymbol);

                tokenAddrSell = srcToken.address;
                tokenAddrBuy = destToken.address;

                sellAmountWei = hre.ethers.utils.parseUnits(amount, srcToken.decimals);

                const path = hre.ethers.utils.solidityPack(['address', 'uint24', 'address'], [tokenAddrSell, uniV3Fee, tokenAddrBuy]);

                // eslint-disable-next-line max-len
                currPrice = await uniV3Wrapper.getSellRate(tokenAddrSell, tokenAddrBuy, sellAmountWei, path);

                // Set target price to 10% above current price to trigger the strategy
                const targetPrice = currPrice.add(currPrice.div('10'));

                minPrice = currPrice.sub(currPrice.div('200')); // 0.5% slippage in the minPrice

                await approve(tokenAddrSell, proxy.address);

                ({ subId, strategySub } = await subLimitOrderStrategy(
                    proxy,
                    tokenAddrSell,
                    tokenAddrBuy,
                    sellAmountWei,
                    targetPrice,
                    goodUntilDuration,
                    OrderType.STOP_LOSS,
                    addrs[getNetwork()].REGISTRY_ADDR,
                ));
            });

            it('... should trigger a limit order [Stop loss] strategy', async () => {
                await setBalance(tokenAddrSell, senderAcc.address, sellAmountWei);

                let destAddrTransformed = tokenAddrBuy;

                if (destTokenSymbol === 'WETH') {
                    destAddrTransformed = addrs[network].ETH_ADDR;
                }

                const buyBalanceBefore = await balanceOf(destAddrTransformed, senderAcc.address);
                const sellBalanceBefore = await balanceOf(tokenAddrSell, senderAcc.address);

                // eslint-disable-next-line max-len
                await callLimitOrderStrategy(
                    botAcc,
                    minPrice,
                    strategyExecutor,
                    subId,
                    strategySub,
                    tokenAddrSell,
                    tokenAddrBuy,
                    uniV3Fee,
                );

                const buyBalanceAfter = await balanceOf(destAddrTransformed, senderAcc.address);
                const sellBalanceAfter = await balanceOf(tokenAddrSell, senderAcc.address);

                expect(buyBalanceAfter).to.be.gt(buyBalanceBefore);
                expect(sellBalanceBefore).to.be.gt(sellBalanceAfter);
            });
        }
    });
};

const dcaStrategyTest = async () => {
    const tokenPairs = [
        {
            srcTokenSymbol: 'WETH', destTokenSymbol: 'DAI', amount: '1', uniV3Fee: '3000',
        },
        {
            srcTokenSymbol: 'WETH', destTokenSymbol: 'USDC', amount: '2', uniV3Fee: '3000',
        },
        {
            srcTokenSymbol: 'DAI', destTokenSymbol: 'WETH', amount: '1000', uniV3Fee: '3000',
        },
        {
            srcTokenSymbol: 'WBTC', destTokenSymbol: 'WETH', amount: '1', uniV3Fee: '3000',
        },
        {
            srcTokenSymbol: 'USDC', destTokenSymbol: 'WBTC', amount: '3400', uniV3Fee: '3000',
        },
    ];

    describe('DCA Strategy', function () {
        this.timeout(120000);

        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subId;
        let strategySub;
        let subStorage;
        let lastTimestamp;
        let subStorageAddr;
        let network;
        let tokenAddrSell;
        let tokenAddrBuy;
        let sellAmountWei;
        let strategyId;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            network = getNetwork();

            set('network', chainIds[network]);

            // Send eth to owner acc, needed for l2s who don't hold eth
            await sendEther(senderAcc, getOwnerAddr(), '1');

            strategyExecutor = await redeployCore(network !== 'mainnet');

            await redeploy('GasFeeTaker');
            await redeploy('DFSSell');
            await redeploy('TimestampTrigger');

            subStorageAddr = getAddrFromRegistry('SubStorage');
            subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

            await addBotCaller(botAcc.address);

            proxy = await getProxy(senderAcc.address);

            const strategyData = network === 'mainnet' ? createDCAStrategy() : createDCAL2Strategy();
            await openStrategyAndBundleStorage();

            strategyId = await createStrategy(proxy, ...strategyData, true);
        });

        for (let i = 0; i < tokenPairs.length; i++) {
            const {
                srcTokenSymbol, destTokenSymbol, amount, uniV3Fee,
            } = tokenPairs[i];

            it(`... should make a new DCA Strategy for selling ${srcTokenSymbol} into ${destTokenSymbol}`, async () => {
                const srcToken = getAssetInfo(srcTokenSymbol);
                const destToken = getAssetInfo(destTokenSymbol);

                const interval = TWO_DAYS;
                const latestBlock = await hre.ethers.provider.getBlock('latest');

                lastTimestamp = latestBlock.timestamp + interval;

                sellAmountWei = hre.ethers.utils.parseUnits(amount, srcToken.decimals);

                await approve(srcToken.address, proxy.address);

                tokenAddrSell = srcToken.address;
                tokenAddrBuy = destToken.address;

                ({ subId, strategySub } = await subDcaStrategy(
                    proxy,
                    tokenAddrSell,
                    tokenAddrBuy,
                    sellAmountWei,
                    interval,
                    lastTimestamp,
                    strategyId,
                ));
            });

            it('... should trigger DCA strategy', async () => {
                await timeTravel(TWO_DAYS);

                await setBalance(tokenAddrSell, senderAcc.address, sellAmountWei);

                let destAddrTransformed = tokenAddrBuy;

                if (destTokenSymbol === 'WETH') {
                    destAddrTransformed = addrs[network].ETH_ADDR;
                }

                const buyBalanceBefore = await balanceOf(destAddrTransformed, senderAcc.address);
                const sellBalanceBefore = await balanceOf(tokenAddrSell, senderAcc.address);

                await callDcaStrategy(
                    botAcc,
                    strategyExecutor,
                    subId,
                    strategySub,
                    tokenAddrSell,
                    tokenAddrBuy,
                    uniV3Fee,

                );

                strategySub = await getUpdatedStrategySub(subStorage, subStorageAddr);

                const buyBalanceAfter = await balanceOf(destAddrTransformed, senderAcc.address);
                const sellBalanceAfter = await balanceOf(tokenAddrSell, senderAcc.address);

                expect(buyBalanceAfter).to.be.gt(buyBalanceBefore);
                expect(sellBalanceBefore).to.be.gt(sellBalanceAfter);
            });

            it('... should trigger DCA strategy again after 2 days', async () => {
                await timeTravel(TWO_DAYS);

                await setBalance(tokenAddrSell, senderAcc.address, sellAmountWei);

                let destAddrTransformed = tokenAddrBuy;

                if (destTokenSymbol === 'WETH') {
                    destAddrTransformed = addrs[network].ETH_ADDR;
                }

                const buyBalanceBefore = await balanceOf(destAddrTransformed, senderAcc.address);
                const sellBalanceBefore = await balanceOf(tokenAddrSell, senderAcc.address);

                await callDcaStrategy(
                    botAcc,
                    strategyExecutor,
                    subId,
                    strategySub,
                    tokenAddrSell,
                    tokenAddrBuy,
                    uniV3Fee,
                );

                strategySub = await getUpdatedStrategySub(subStorage, subStorageAddr);

                const buyBalanceAfter = await balanceOf(destAddrTransformed, senderAcc.address);
                const sellBalanceAfter = await balanceOf(tokenAddrSell, senderAcc.address);

                expect(buyBalanceAfter).to.be.gt(buyBalanceBefore);
                expect(sellBalanceBefore).to.be.gt(sellBalanceAfter);
            });

            it('... should fail to trigger DCA strategy again after 1 day', async () => {
                await timeTravel(DAY);
                await setBalance(tokenAddrSell, senderAcc.address, sellAmountWei);

                try {
                    await callDcaStrategy(
                        botAcc,
                        strategyExecutor,
                        subId,
                        strategySub,
                        tokenAddrSell,
                        tokenAddrBuy,
                        uniV3Fee,
                    );
                    expect(true).to.be.equal(false);
                } catch (err) {
                    expect(true).to.be.equal(true);
                }
            });
        }
    });
};

const miscStrategiesTest = async () => {
    await limitOrderStrategyTest();
    await dcaStrategyTest();
};
module.exports = {
    miscStrategiesTest,
    limitOrderStrategyTest,
    dcaStrategyTest,
};
