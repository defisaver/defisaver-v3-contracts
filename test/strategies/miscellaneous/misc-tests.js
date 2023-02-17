const hre = require('hardhat');
const { expect } = require('chai');

const { getAssetInfo, set } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    getChainLinkPrice,
    depositToWeth,
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
    ETH_ADDR,
    WETH_ADDRESS,
    DAI_ADDR,
    addrs,
    chainIds,
} = require('../../utils');

const { callDcaStrategy } = require('../../strategy-calls');
const { subDcaStrategy } = require('../../strategy-subs');
const { createDCAStrategy } = require('../../strategies');
const { createDCAL2Strategy } = require('../../l2-strategies');

const { createStrategy, addBotCaller, getUpdatedStrategySub } = require('../../utils-strategies');

const { callLimitOrderStrategy } = require('../../strategy-calls');
const { subLimitOrderStrategy } = require('../../strategy-subs');
const { createLimitOrderStrategy } = require('../../strategies');

const DAY = 1 * 24 * 60 * 60;
const TWO_DAYS = 2 * 24 * 60 * 60;

const limitOrderStrategyTest = async () => {
    describe('Limit-Order-Strategy', function () {
        this.timeout(120000);

        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subId;
        let strategySub;
        let amount;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            strategyExecutor = await redeployCore();

            await redeploy('GasFeeTaker');
            await redeploy('DFSSell');
            await redeploy('ChainLinkPriceTrigger');
            await redeploy('PullToken');

            await addBotCaller(botAcc.address);

            proxy = await getProxy(senderAcc.address);
        });

        it('... should make a new Limit order strategy', async () => {
            const strategyData = createLimitOrderStrategy();
            await openStrategyAndBundleStorage();

            const strategyId = await createStrategy(proxy, ...strategyData, false);

            const currPrice = await getChainLinkPrice(ETH_ADDR);

            const targetPrice = currPrice - 100; // Target is smaller so we can execute it

            const tokenAddrSell = WETH_ADDRESS;
            const tokenAddrBuy = DAI_ADDR;

            amount = hre.ethers.utils.parseUnits('1', 18); // Sell 1 eth

            ({ subId, strategySub } = await subLimitOrderStrategy(
                proxy,
                senderAcc,
                tokenAddrSell,
                tokenAddrBuy,
                amount,
                targetPrice,
                strategyId,
            ));
        });

        it('... should trigger a limit order strategy', async () => {
            // get weth and approve dsproxy to pull
            await depositToWeth(amount.toString());
            await approve(WETH_ADDRESS, proxy.address);

            const daiBalanceBefore = await balanceOf(DAI_ADDR, senderAcc.address);
            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);

            await callLimitOrderStrategy(botAcc, senderAcc, strategyExecutor, subId, strategySub);

            const daiBalanceAfter = await balanceOf(DAI_ADDR, senderAcc.address);
            const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
            expect(wethBalanceBefore).to.be.gt(wethBalanceAfter);
        });

        it('... should fail to trigger the same strategy again as its one time', async () => {
            try {
                await depositToWeth(amount.toString());
                await callLimitOrderStrategy(
                    botAcc,
                    senderAcc,
                    strategyExecutor,
                    subId,
                    strategySub,
                );
            } catch (err) {
                expect(err.toString()).to.have.string('SubNotEnabled');
            }
        });
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
