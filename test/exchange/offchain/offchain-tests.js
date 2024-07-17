/* eslint-disable max-len */
const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const hre = require('hardhat');
require('dotenv-safe').config();
const dfs = require('@defisaver/sdk');
const { default: axios } = require('axios');
const {
    getProxy,
    redeploy,
    balanceOf,
    setNewExchangeWrapper,
    setBalance,
    addrs,
    approve,
    formatExchangeObjForOffchain,
    addToExchangeAggregatorRegistry,
    chainIds,
    takeSnapshot,
    revertToSnapshot,
    getNetwork,
} = require('../../utils');

const { executeAction } = require('../../actions');

const trades = [
    {
        sellToken: 'WETH', buyToken: 'DAI', amount: '1', fee: 3000,
    },
    {
        sellToken: 'DAI', buyToken: 'WBTC', amount: '30000', fee: 3000,
    },
];
const getKyberApiUrlByChainId = (chainId) => {
    if (chainId === 10) {
        return 'https://aggregator-api.kyberswap.com/optimism/api/v1/';
    }
    if (chainId === 42161) {
        return 'https://aggregator-api.kyberswap.com/arbitrum/api/v1/';
    }
    if (chainId === 8453) {
        return 'https://aggregator-api.kyberswap.com/base/api/v1/';
    }
    return 'https://aggregator-api.kyberswap.com/ethereum/api/v1/';
};

const kyberTest = async () => {
    /// @dev works on mainnet and kyber
    describe('Dfs-Sell-via-Kyber-Aggregator', function () {
        this.timeout(400000);

        let senderAcc;
        let proxy;
        let kyberAggregatorWrapper;
        let snapshot;

        before(async () => {
            await redeploy('KyberInputScalingHelperL2');
            await redeploy('DFSSell');
            await redeploy('RecipeExecutor');
            await redeploy('PullToken');
            kyberAggregatorWrapper = await redeploy('KyberAggregatorWrapper');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await setNewExchangeWrapper(senderAcc, kyberAggregatorWrapper.address);
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        for (let i = 0; i < 1; ++i) {
            const trade = trades[i];
            it(`... should try to sell ${trade.sellToken} for ${trade.buyToken} with offchain calldata (Kyber) in a single DFSSell action`, async () => {
                const network = hre.network.config.name;
                const chainId = chainIds[network];
                const sellAssetInfo = getAssetInfo(trade.sellToken, chainId);
                const buyAssetInfo = getAssetInfo(trade.buyToken, chainId);

                const buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);
                const amount = hre.ethers.utils.parseUnits('1', sellAssetInfo.decimals);

                await setBalance(sellAssetInfo.address, senderAcc.address, amount);
                await approve(sellAssetInfo.address, proxy.address);
                const baseUrl = getKyberApiUrlByChainId(chainId);
                const clientId = 'partner-staging';
                const headers = {
                    'x-client-id': clientId,
                };
                const options = {
                    method: 'GET',
                    baseURL: baseUrl,
                    url: `routes?tokenIn=${sellAssetInfo.address}&tokenOut=${buyAssetInfo.address}&amountIn=${amount.toString()}&saveGas=false&gasInclude=true&x-client-id=${clientId}`,
                    headers,
                };
                const priceObject = await axios(options).then((response) => response.data.data);
                const secondOptions = {
                    method: 'POST',
                    baseURL: baseUrl,
                    url: 'route/build',
                    headers,
                    data: {
                        routeSummary: priceObject.routeSummary,
                        sender: kyberAggregatorWrapper.address,
                        recipient: kyberAggregatorWrapper.address,
                        slippageTolerance: 1000,
                        deadline: 1776079017,
                        source: clientId,
                    },
                };
                const resultObject = await axios(secondOptions).then((response) => response.data);
                // THIS IS CHANGEABLE WITH API INFORMATION
                const allowanceTarget = priceObject.routerAddress;
                const price = 1; // just for testing, anything bigger than 0 triggers offchain if
                const protocolFee = 0;
                const callData = resultObject.data.data;

                const exchangeObject = formatExchangeObjForOffchain(
                    sellAssetInfo.address,
                    buyAssetInfo.address,
                    amount,
                    kyberAggregatorWrapper.address,
                    priceObject.routerAddress,
                    allowanceTarget,
                    price,
                    protocolFee,
                    callData,
                );

                await addToExchangeAggregatorRegistry(senderAcc, priceObject.routerAddress);
                // test single action so no changing of amount

                const sellAction = new dfs.actions.basic.SellAction(
                    exchangeObject, senderAcc.address, senderAcc.address,
                );
                const functionData = sellAction.encodeForDsProxyCall()[1];
                await executeAction('DFSSell', functionData, proxy);
                const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);
                expect(buyBalanceBefore).is.lt(buyBalanceAfter);
                await revertToSnapshot(snapshot);
            });
            it(`... should try to sell ${trade.sellToken} for ${trade.buyToken} with offchain calldata (Kyber) in a recipe`, async () => {
                const network = hre.network.config.name;
                const chainId = chainIds[network];
                const sellAssetInfo = getAssetInfo(trade.sellToken, chainId);
                const buyAssetInfo = getAssetInfo(trade.buyToken, chainId);

                const buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);
                const amount = hre.ethers.utils.parseUnits('1', sellAssetInfo.decimals);

                await setBalance(sellAssetInfo.address, senderAcc.address, amount);
                await approve(sellAssetInfo.address, proxy.address);
                const baseUrl = getKyberApiUrlByChainId(chainId);
                const clientId = 'partner-staging';
                const headers = {
                    'x-client-id': clientId,
                };
                const options = {
                    method: 'GET',
                    baseURL: baseUrl,
                    url: `routes?tokenIn=${sellAssetInfo.address}&tokenOut=${buyAssetInfo.address}&amountIn=${amount.toString()}&saveGas=false&gasInclude=true&x-client-id=${clientId}`,
                    headers,
                };
                const priceObject = await axios(options).then((response) => response.data.data);
                const secondOptions = {
                    method: 'POST',
                    baseURL: baseUrl,
                    url: 'route/build',
                    headers,
                    data: {
                        routeSummary: priceObject.routeSummary,
                        sender: kyberAggregatorWrapper.address,
                        recipient: kyberAggregatorWrapper.address,
                        slippageTolerance: 1000,
                        deadline: 1776079017,
                        source: clientId,
                    },
                };
                const resultObject = await axios(secondOptions).then((response) => response.data);

                // THIS IS CHANGEABLE WITH API INFORMATION
                const allowanceTarget = priceObject.routerAddress;
                const price = 1; // just for testing, anything bigger than 0 triggers offchain if
                const protocolFee = 0;
                const callData = resultObject.data.data;

                const exchangeObject = formatExchangeObjForOffchain(
                    sellAssetInfo.address,
                    buyAssetInfo.address,
                    amount,
                    kyberAggregatorWrapper.address,
                    priceObject.routerAddress,
                    allowanceTarget,
                    price,
                    protocolFee,
                    callData,
                );

                await addToExchangeAggregatorRegistry(senderAcc, priceObject.routerAddress);
                // test recipe
                const sellRecipe = new dfs.Recipe('SellRecipe', [
                    new dfs.actions.basic.PullTokenAction(sellAssetInfo.address, senderAcc.address, amount),
                    new dfs.actions.basic.SellAction(
                        exchangeObject, proxy.address, senderAcc.address,
                    ),
                ]);
                const functionData = sellRecipe.encodeForDsProxyCall()[1];
                await executeAction('RecipeExecutor', functionData, proxy);
                const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);
                expect(buyBalanceBefore).is.lt(buyBalanceAfter);
            });
        }
    });
};

const paraswapTest = async () => {
    // @dev Works only on mainnet forks
    describe('Dfs-Sell-via-Paraswap-Aggregator', function () {
        this.timeout(400000);

        let senderAcc;
        let paraswapWrapper;
        let proxy;
        let snapshot;
        let exchangeObject;
        let amount;
        let buyBalanceBefore;
        let buyAssetInfo;
        let sellAssetInfo;

        before(async () => {
            await redeploy('DFSSell');
            await redeploy('WrapEth');
            await redeploy('RecipeExecutor');
            paraswapWrapper = await redeploy('ParaswapWrapper');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await setNewExchangeWrapper(senderAcc, paraswapWrapper.address);

            sellAssetInfo = getAssetInfo('WETH');
            buyAssetInfo = getAssetInfo('USDC');

            buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);
            amount = hre.ethers.utils.parseUnits('1', 18);
            await setBalance(sellAssetInfo.address, senderAcc.address, amount);
            await approve(sellAssetInfo.address, proxy.address);

            const networkId = '1';
            const options = {
                method: 'GET',
                baseURL: 'https://apiv5.paraswap.io',
                url: `/prices?srcToken=${sellAssetInfo.address}&srcDecimals=${sellAssetInfo.decimals}&destToken=${buyAssetInfo.address}&destDecimals=${buyAssetInfo.decimals}&amount=${amount}&side=SELL&network=${networkId}`,
            };
            const priceObject = await axios(options).then((response) => response.data.priceRoute);

            const secondOptions = {
                method: 'POST',
                baseURL: 'https://apiv5.paraswap.io/transactions/1?ignoreChecks=true',
                data: {
                    priceRoute: priceObject,
                    srcToken: priceObject.srcToken,
                    destToken: priceObject.destToken,
                    srcAmount: priceObject.srcAmount,
                    userAddress: paraswapWrapper.address,
                    partner: 'paraswap.io',
                    srcDecimals: priceObject.srcDecimals,
                    destDecimals: priceObject.destDecimals,
                    slippage: 1000,
                    txOrigin: senderAcc.address,
                },
            };
            const resultObject = await axios(secondOptions).then((response) => response.data);

            // THIS IS CHANGEABLE WITH API INFORMATION
            const allowanceTarget = priceObject.tokenTransferProxy;
            const price = 1; // just for testing, anything bigger than 0 triggers offchain if
            const protocolFee = 0;
            const callData = resultObject.data;

            let amountInHex = hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [priceObject.srcAmount]);
            amountInHex = amountInHex.slice(2);

            let offset = callData.toString().indexOf(amountInHex);
            offset = offset / 2 - 1;

            const paraswapSpecialCalldata = hre.ethers.utils.defaultAbiCoder.encode(['(bytes,uint256)'], [[callData, offset]]);

            exchangeObject = formatExchangeObjForOffchain(
                sellAssetInfo.address,
                buyAssetInfo.address,
                amount,
                paraswapWrapper.address,
                priceObject.contractAddress,
                allowanceTarget,
                price,
                protocolFee,
                paraswapSpecialCalldata,
            );

            await addToExchangeAggregatorRegistry(senderAcc, priceObject.contractAddress);
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        it('... should try to sell WETH for DAI with offchain calldata (Paraswap)', async () => {
            const sellAction = new dfs.actions.basic.SellAction(
                exchangeObject, senderAcc.address, senderAcc.address,
            );

            const functionData = sellAction.encodeForDsProxyCall()[1];

            await executeAction('DFSSell', functionData, proxy);

            const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });
        it('... should try to sell WETH for DAI with offchain calldata (Paraswap) in a recipe', async () => {
            // test recipe
            const sellRecipe = new dfs.Recipe('SellRecipe', [
                new dfs.actions.basic.PullTokenAction(sellAssetInfo.address, senderAcc.address, amount.toString()),
                new dfs.actions.basic.SellAction(
                    exchangeObject, proxy.address, senderAcc.address,
                ),
            ]);
            const functionData = sellRecipe.encodeForDsProxyCall()[1];

            await executeAction('RecipeExecutor', functionData, proxy, addrs[getNetwork()].REGISTRY_ADDR, amount);

            const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });
    });
};

const oneInchTest = async () => {
    describe('Dfs-Sell-via-1inch-Aggregator', function () {
        this.timeout(400000);

        let senderAcc;
        let oneInchWrapper;
        let proxy;
        let snapshot;
        let exchangeObject;
        let amount;
        let buyBalanceBefore;
        let buyAssetInfo;
        let sellAssetInfo;

        before(async () => {
            const chainId = chainIds[getNetwork()];

            await redeploy('DFSSell');
            await redeploy('PullToken');
            await redeploy('RecipeExecutor');
            oneInchWrapper = await redeploy('OneInchWrapper');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await setNewExchangeWrapper(senderAcc, oneInchWrapper.address);

            sellAssetInfo = getAssetInfo('WETH', chainId);
            buyAssetInfo = getAssetInfo('USDC', chainId);

            buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);
            amount = hre.ethers.utils.parseUnits('1', 18);
            await setBalance(sellAssetInfo.address, senderAcc.address, amount);
            await approve(sellAssetInfo.address, proxy.address);
            const options = {
                method: 'GET',
                baseURL: 'https://api.1inch.dev/swap',
                url: `/v5.2/${chainId}/swap?src=${sellAssetInfo.address}&dst=${buyAssetInfo.address}&amount=${amount}&from=${oneInchWrapper.address}`
                + '&slippage=1'
                + '&usePatching=true'
                + '&disableEstimate=true'
                + '&allowPartialFill=false'
                + '&includeProtocols=true',

                headers: {
                    Authorization: `Bearer ${process.env.ONE_INCH_KEY}`,
                },
            };
            // set slippage to user slippage + fee%
            // add all protocols and remove one by one

            const priceObject = await axios(options).then((response) => response.data);

            // THIS IS CHANGEABLE WITH API INFORMATION
            const allowanceTarget = priceObject.tx.to;
            const price = 1; // just for testing, anything bigger than 0 triggers offchain if
            const protocolFee = 0;
            const callData = priceObject.tx.data;

            let amountInHex = hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [amount]);
            amountInHex = amountInHex.slice(2);

            const sourceStr = callData;
            const searchStr = amountInHex.toString();
            const indexes = [...sourceStr.matchAll(new RegExp(searchStr, 'gi'))].map((a) => a.index);

            const offsets = [];

            for (let i = 0; i < indexes.length; i++) {
                offsets[i] = indexes[i] / 2 - 1;
            }

            const specialCalldata = hre.ethers.utils.defaultAbiCoder.encode(['(bytes,uint256[])'], [[callData, offsets]]);

            exchangeObject = formatExchangeObjForOffchain(
                sellAssetInfo.address,
                buyAssetInfo.address,
                amount,
                oneInchWrapper.address,
                allowanceTarget,
                allowanceTarget,
                price,
                protocolFee,
                specialCalldata,
            );

            await addToExchangeAggregatorRegistry(senderAcc, allowanceTarget);
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        it('... should try to sell WETH for DAI with offchain calldata (1inch)', async () => {
            const sellAction = new dfs.actions.basic.SellAction(
                exchangeObject, senderAcc.address, senderAcc.address,
            );
            const functionData = sellAction.encodeForDsProxyCall()[1];

            await executeAction('DFSSell', functionData, proxy);

            const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });
        it('... should try to sell WETH for DAI with offchain calldata (1inch) in a recipe', async () => {
            // test recipe
            const sellRecipe = new dfs.Recipe('SellRecipe', [
                new dfs.actions.basic.PullTokenAction(sellAssetInfo.address, senderAcc.address, amount.toString()),
                new dfs.actions.basic.SellAction(
                    exchangeObject, proxy.address, senderAcc.address,
                ),
            ]);
            const functionData = sellRecipe.encodeForDsProxyCall()[1];

            await executeAction('RecipeExecutor', functionData, proxy, addrs[getNetwork()].REGISTRY_ADDR, amount);

            const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });
    });
};

const zeroxTest = async () => {
    describe('Dfs-Sell-0x', function () {
        this.timeout(140000);

        let senderAcc;
        let proxy;
        let zxWrapper;
        let snapshot;
        const network = hre.network.config.name;

        before(async () => {
            await redeploy('DFSSell');
            zxWrapper = await redeploy('ZeroxWrapper');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await setNewExchangeWrapper(senderAcc, zxWrapper.address);
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        it('... should try to sell WETH for USDC with offchain calldata (0x)', async () => {
            const chainId = chainIds[network];
            const sellAssetInfo = getAssetInfo('WETH', chainId);
            const buyAssetInfo = getAssetInfo('USDC', chainId);
            const sellAmount = hre.ethers.utils.parseUnits('10', 18);
            await setBalance(sellAssetInfo.address, senderAcc.address, sellAmount);
            await approve(sellAssetInfo.address, proxy.address);

            const options = {
                method: 'GET',
                baseURL: 'https://api.0x.org',
                url: `/swap/v1/quote?sellToken=${sellAssetInfo.address}&buyToken=${buyAssetInfo.address}&sellAmount=${sellAmount.toString()}`,
                headers: {
                    '0x-api-key': `${process.env.ZEROX_API_KEY}`,
                },
            };
            const priceObject = await axios(options).then((response) => response.data);

            // THIS IS CHANGEABLE WITH API INFORMATION
            const allowanceTarget = priceObject.allowanceTarget;
            const price = 1; // just for testing, anything bigger than 0 triggers offchain if
            const protocolFee = 0;
            const callData = priceObject.data;

            const exchangeObject = formatExchangeObjForOffchain(
                sellAssetInfo.address,
                buyAssetInfo.address,
                sellAmount,
                zxWrapper.address,
                priceObject.to,
                allowanceTarget,
                price,
                protocolFee,
                callData,
            );
            await addToExchangeAggregatorRegistry(senderAcc, priceObject.to);

            const sellAction = new dfs.actions.basic.SellAction(
                exchangeObject, senderAcc.address, senderAcc.address,
            );

            const functionData = sellAction.encodeForDsProxyCall()[1];

            const buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);
            await executeAction('DFSSell', functionData, proxy);
            const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

            console.log(`ETH SOLD ${sellAmount}`);
            console.log(`USDC BOUGHT ${buyBalanceAfter}`);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });
    });
};

const offchainExchangeFullTest = async () => {
    await paraswapTest();
    await oneInchTest();
    await kyberTest();
    await zeroxTest();
};

module.exports = {
    offchainExchangeFullTest,
    kyberTest,
    paraswapTest,
    oneInchTest,
    zeroxTest,
};
