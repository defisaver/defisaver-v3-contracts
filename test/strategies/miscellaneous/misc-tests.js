const hre = require('hardhat');
const { expect } = require('chai');

const { getAssetInfo, set } = require('@defisaver/tokens');
const automationSdk = require('@defisaver/automation-sdk');

const {
    getProxy,
    redeploy,
    approve,
    balanceOf,
    openStrategyAndBundleStorage,
    redeployCore,
    timeTravel,
    getAddrFromRegistry,
    sendEther,
    getOwnerAddr,
    setBalance,
    addrs,
    chainIds,
    setNewExchangeWrapper,
    network,
} = require('../../utils/utils');

const { callDcaStrategy } = require('../utils/strategy-calls');
const { subDcaStrategy } = require('../utils/strategy-subs');
const { createLimitOrderL2Strategy } = require('../../../strategies-spec/l2');

const { createStrategy, addBotCaller, getUpdatedStrategySub } = require('../utils/utils-strategies');

const { callLimitOrderStrategy } = require('../utils/strategy-calls');
const { subLimitOrderStrategy } = require('../utils/strategy-subs');
const { createLimitOrderStrategy } = require('../../../strategies-spec/mainnet');

const DAY = 1 * 24 * 60 * 60;
const TWO_DAYS = 2 * 24 * 60 * 60;

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
        let strategyId;
        let sellAmountWei;
        let tokenAddrSell;
        let tokenAddrBuy;
        const goodUntilDuration = 24 * 60 * 60;

        before(async () => {
            // await resetForkToBlock(19000000);

            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            set('network', chainIds[network]);

            // Send eth to owner acc, needed for l2s who don't hold eth
            await sendEther(senderAcc, getOwnerAddr(), '1');

            strategyExecutor = await redeployCore(network !== 'mainnet');

            // eslint-disable-next-line no-unused-expressions
            network === 'mainnet' ? (await redeploy('LimitSell')) : (await redeploy('LimitSellL2'));
            await redeploy('OffchainPriceTrigger');

            uniV3Wrapper = await hre.ethers.getContractAt('UniswapWrapperV3', addrs[network].UNISWAP_V3_WRAPPER);

            await setNewExchangeWrapper(senderAcc, addrs[network].UNISWAP_V3_WRAPPER);

            await addBotCaller(botAcc.address);
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);

            const strategyData = network === 'mainnet' ? createLimitOrderStrategy() : createLimitOrderL2Strategy();
            await openStrategyAndBundleStorage();

            strategyId = await createStrategy(...strategyData, false);

            await redeploy('LimitOrderSubProxy', false, strategyId);
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
                    automationSdk.enums.OrderType.TAKE_PROFIT,
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
                    automationSdk.enums.OrderType.STOP_LOSS,
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
        let tokenAddrSell;
        let tokenAddrBuy;
        let sellAmountWei;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            set('network', chainIds[network]);

            // Send eth to owner acc, needed for l2s who don't hold eth
            await sendEther(senderAcc, getOwnerAddr(), '1');

            strategyExecutor = await redeployCore(network !== 'mainnet');

            await redeploy('GasFeeTaker');
            await redeploy('DFSSell');
            await redeploy('TimestampTrigger');
            await redeploy('SendTokenAndUnwrap');

            subStorageAddr = getAddrFromRegistry('SubStorage');
            subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

            await addBotCaller(botAcc.address);

            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);

            await setNewExchangeWrapper(senderAcc, addrs[network].UNISWAP_V3_WRAPPER);
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
