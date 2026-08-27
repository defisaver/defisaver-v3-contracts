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
    network,
    addToRegistry,
    DAI_ADDR,
    isNetworkFork,
    getOwnerAddr,
} = require('../../utils/utils');

const { executeAction } = require('../../utils/actions');
const { topUp } = require('../../../scripts/utils/fork');

const trades = [
    {
        sellToken: 'WETH',
        buyToken: 'DAI',
        amount: '1',
        fee: 3000,
    },
    {
        sellToken: 'DAI',
        buyToken: 'WBTC',
        amount: '30000',
        fee: 3000,
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
    if (chainId === 59144) {
        return 'https://aggregator-api.kyberswap.com/linea/api/v1/';
    }
    return 'https://aggregator-api.kyberswap.com/ethereum/api/v1/';
};

const bebopTestData = [
    { sellToken: 'WETH', buyToken: 'USDC', rawAmount: '1' },
    { sellToken: 'WETH', buyToken: 'USDC', rawAmount: '111' },
    { sellToken: 'USDC', buyToken: 'WBTC', rawAmount: '30000' },
    { sellToken: 'USDC', buyToken: 'WETH', rawAmount: '30000' },
];

const getNetworkNameByChainId = (chainId) => {
    if (chainId === 10) return 'optimism';
    if (chainId === 42161) return 'arbitrum';
    if (chainId === 8453) return 'base';
    if (chainId === 59144) return 'linea';
    if (chainId === 9745) return 'plasma';
    return 'ethereum';
};

const getBebopQuote = async (
    sellAssetInfo,
    buyAssetInfo,
    amount,
    bebopWrapper,
    chainId,
    originAddress,
) => {
    const options = {
        method: 'GET',
        baseURL: `https://api.bebop.xyz/pmm/${getNetworkNameByChainId(chainId)}/v3/quote`,
        params: {
            buy_tokens: [buyAssetInfo.address].toString(),
            sell_tokens: [sellAssetInfo.address].toString(),
            sell_amounts: amount.toString(),
            taker_address: bebopWrapper.address,
            origin_address: originAddress,
            skip_validation: true,
            gasless: false,
            source: `${process.env.BEBOP_SOURCE}`,
        },
        headers: {
            'source-auth': `${process.env.BEBOP_SOURCE_AUTH}`,
        },
    };
    console.log('Bebop quote request:', JSON.stringify(options, null, 2));
    const response = await axios(options);
    console.log('Bebop quote response:', JSON.stringify(response.data, null, 2));
    return response.data;
};

const bebopTest = async () => {
    describe('Dfs-Sell-via-Bebop-Aggregator (Parametrized)', function () {
        this.timeout(400000);

        let senderAcc;
        let bebopWrapper;
        let proxy;
        let snapshot;
        const chainId = chainIds[network];

        before(async () => {
            bebopWrapper = await redeploy('BebopWrapper');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await setNewExchangeWrapper(senderAcc, bebopWrapper.address);
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        bebopTestData.forEach(({ sellToken, buyToken, rawAmount }) => {
            describe(`${sellToken} -> ${buyToken} | Amount: ${rawAmount}`, () => {
                let exchangeObject;
                let amount;
                let sellAssetInfo;
                let buyAssetInfo;
                let buyBalanceBefore;
                let sellBalanceBefore;

                beforeEach(async () => {
                    sellAssetInfo = getAssetInfo(sellToken, chainId);
                    buyAssetInfo = getAssetInfo(buyToken, chainId);
                    amount = hre.ethers.utils.parseUnits(rawAmount, sellAssetInfo.decimals);

                    await setBalance(sellAssetInfo.address, senderAcc.address, amount);
                    await approve(sellAssetInfo.address, proxy.address);

                    buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);
                    sellBalanceBefore = await balanceOf(sellAssetInfo.address, senderAcc.address);

                    const priceObject = await getBebopQuote(
                        sellAssetInfo,
                        buyAssetInfo,
                        amount,
                        bebopWrapper,
                        chainId,
                        senderAcc.address,
                    );
                    const exchangeAddr = priceObject.tx.to;
                    const allowanceTarget = priceObject.approvalTarget || priceObject.tx.to;
                    const price = 1; // just for testing, anything bigger than 0 triggers offchain if
                    const protocolFee = 0;
                    const callData = priceObject.tx.data;

                    const partialFillOffset = (10 + priceObject.partialFillOffset * 64) / 2 - 1; //  https://docs.bebop.xyz/bebop/bebop-api-pmm-rfq/rfq-api-endpoints/trade/self-execute-order#partial-fills
                    const specialCalldata = hre.ethers.utils.defaultAbiCoder.encode(
                        ['(bytes,uint256)'],
                        [[callData, partialFillOffset]],
                    );

                    exchangeObject = formatExchangeObjForOffchain(
                        sellAssetInfo.address,
                        buyAssetInfo.address,
                        amount,
                        bebopWrapper.address,
                        exchangeAddr,
                        allowanceTarget,
                        price,
                        protocolFee,
                        specialCalldata,
                    );

                    await addToExchangeAggregatorRegistry(senderAcc, exchangeAddr);
                });

                it(`should sell ${sellToken} for ${buyToken} (single action)`, async () => {
                    const sellAction = new dfs.actions.basic.SellAction(
                        exchangeObject,
                        senderAcc.address,
                        senderAcc.address,
                    );
                    const functionData = sellAction.encodeForDsProxyCall()[1];
                    await executeAction('DFSSell', functionData, proxy);

                    const buyBalanceAfter = await balanceOf(
                        buyAssetInfo.address,
                        senderAcc.address,
                    );
                    const sellBalanceAfter = await balanceOf(
                        sellAssetInfo.address,
                        senderAcc.address,
                    );
                    expect(buyBalanceAfter).to.be.gt(buyBalanceBefore);
                    expect(sellBalanceAfter).to.be.lt(sellBalanceBefore);
                });

                it(`should sell ${sellToken} for ${buyToken} (recipe)`, async () => {
                    const sellRecipe = new dfs.Recipe('SellRecipe', [
                        new dfs.actions.basic.PullTokenAction(
                            sellAssetInfo.address,
                            senderAcc.address,
                            amount.toString(),
                        ),
                        new dfs.actions.basic.SellAction(
                            exchangeObject,
                            proxy.address,
                            senderAcc.address,
                        ),
                    ]);
                    const functionData = sellRecipe.encodeForDsProxyCall()[1];
                    await executeAction('RecipeExecutor', functionData, proxy, amount);

                    const buyBalanceAfter = await balanceOf(
                        buyAssetInfo.address,
                        senderAcc.address,
                    );
                    const sellBalanceAfter = await balanceOf(
                        sellAssetInfo.address,
                        senderAcc.address,
                    );
                    expect(buyBalanceAfter).to.be.gt(buyBalanceBefore);
                    expect(sellBalanceAfter).to.be.lt(sellBalanceBefore);
                });
            });
        });
    });
};

const flyTestData = [
    { sellToken: 'WETH', buyToken: 'USDC', rawAmount: '100' },
    { sellToken: 'USDC', buyToken: 'WETH', rawAmount: '500000' },
    { sellToken: 'DAI', buyToken: 'WBTC', rawAmount: '1000000' },
    { sellToken: 'WBTC', buyToken: 'USDT', rawAmount: '10' },
];

const getFlyQuote = async (sellAssetInfo, buyAssetInfo, amount, flyWrapper) => {
    const options = {
        method: 'GET',
        baseURL: 'https://api.magpiefi.xyz/aggregator/quote/transaction',
        params: {
            network: 'ethereum',
            fromTokenAddress: sellAssetInfo.address,
            toTokenAddress: buyAssetInfo.address,
            sellAmount: amount.toString(),
            slippage: 0.005,
            fromAddress: flyWrapper.address,
            toAddress: flyWrapper.address,
            gasless: false,
        },
        headers: { apikey: `${process.env.FLY_API_KEY}` },
    };
    const response = await axios(options);
    return response.data;
};

const flyTest = async () => {
    describe('Dfs-Sell-via-Fly-Aggregator', function () {
        this.timeout(400000);

        let senderAcc;
        let flyWrapper;
        let proxy;
        let feeReceiverAddr;
        let tokenGroupRegistry;
        let snapshot;
        const chainId = chainIds[network];

        const isFork = isNetworkFork();

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];

            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
            }

            flyWrapper = await redeploy('FlyWrapper', isFork);

            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await setNewExchangeWrapper(senderAcc, flyWrapper.address, isFork);

            /// @dev the dfs fee is taken off srcAmount and paid in the sell token, so both the
            /// receiver and the per pair divider are needed to say exactly how much should move
            const feeRecipient = await hre.ethers.getContractAt(
                'FeeRecipient',
                addrs[network].FEE_RECIPIENT_ADDR,
            );
            feeReceiverAddr = await feeRecipient.getFeeAddr();
            tokenGroupRegistry = await hre.ethers.getContractAt(
                'TokenGroupRegistry',
                addrs[network].TOKEN_GROUP_REGISTRY,
            );
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        flyTestData.forEach(({ sellToken, buyToken, rawAmount }) => {
            describe(`${sellToken} -> ${buyToken} | Amount: ${rawAmount}`, () => {
                let exchangeObject;
                let amount;
                let sellAssetInfo;
                let buyAssetInfo;
                let buyBalanceBefore;
                let amountOutMin;
                let feeBalanceBefore;

                /// @dev each test funds itself and fetches its own order, a fly order is only
                /// good for the state it was quoted against and is single use
                beforeEach(async () => {
                    sellAssetInfo = getAssetInfo(sellToken, chainId);
                    buyAssetInfo = getAssetInfo(buyToken, chainId);
                    amount = hre.ethers.utils.parseUnits(rawAmount, sellAssetInfo.decimals);

                    await setBalance(sellAssetInfo.address, senderAcc.address, amount);
                    await approve(sellAssetInfo.address, proxy.address);

                    buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);
                    feeBalanceBefore = await balanceOf(sellAssetInfo.address, feeReceiverAddr);

                    const { quote, transaction } = await getFlyQuote(
                        sellAssetInfo,
                        buyAssetInfo,
                        amount,
                        flyWrapper,
                    );

                    const exchangeAddr = transaction.to;
                    const allowanceTarget = quote.targetAddress;
                    const price = 1; // anything bigger than 0 triggers the offchain if
                    const protocolFee = 0;
                    // fly calldata goes in raw, the router owns the layout so no offsets are needed
                    const callData = transaction.data;

                    /// @dev the floor is baked into the order and is never rewritten, so it stays
                    /// sized for the full quoted amount even when the fee shrinks srcAmount
                    amountOutMin = hre.ethers.BigNumber.from(quote.typedData.message.amountOutMin);

                    exchangeObject = formatExchangeObjForOffchain(
                        sellAssetInfo.address,
                        buyAssetInfo.address,
                        amount,
                        flyWrapper.address,
                        exchangeAddr,
                        allowanceTarget,
                        price,
                        protocolFee,
                        callData,
                    );

                    // DFSExchangeCore refuses to call an exchangeAddr that isn't whitelisted
                    await addToExchangeAggregatorRegistry(senderAcc, exchangeAddr, isFork);
                });

                const expectSwapSettled = async (expectedFee) => {
                    const buyBalanceAfter = await balanceOf(
                        buyAssetInfo.address,
                        senderAcc.address,
                    );
                    const sellBalanceAfter = await balanceOf(
                        sellAssetInfo.address,
                        senderAcc.address,
                    );
                    const received = buyBalanceAfter.sub(buyBalanceBefore);

                    // the eoa was funded with exactly amount and the whole of it went in
                    expect(sellBalanceAfter).to.be.eq(0);

                    // the router enforces the quoted floor, clearing it is the real success signal
                    expect(received).to.be.gte(amountOutMin);

                    // the fee is taken off the sell side, so it is exact rather than approximate
                    const feeBalanceAfter = await balanceOf(sellAssetInfo.address, feeReceiverAddr);
                    expect(feeBalanceAfter.sub(feeBalanceBefore)).to.be.eq(expectedFee);

                    /// @dev sendLeftover has to hand everything back
                    expect(await balanceOf(sellAssetInfo.address, flyWrapper.address)).to.be.eq(0);
                    expect(await balanceOf(buyAssetInfo.address, flyWrapper.address)).to.be.eq(0);
                    expect(await balanceOf(sellAssetInfo.address, proxy.address)).to.be.eq(0);
                    expect(await balanceOf(buyAssetInfo.address, proxy.address)).to.be.eq(0);
                };

                /// @dev no dfs fee is taken on a standalone sell, so srcAmount still equals the
                /// quoted amount and the router writes back the value the order already carries
                it(`... should sell ${sellToken} for ${buyToken} (fly), no fee`, async () => {
                    const sellAction = new dfs.actions.basic.SellAction(
                        exchangeObject,
                        senderAcc.address,
                        senderAcc.address,
                    );
                    const functionData = sellAction.encodeForDsProxyCall()[1];

                    await executeAction('DFSSell', functionData, proxy);

                    // DFSSell zeroes dfsFeeDivider when it runs as a direct action
                    await expectSwapSettled(0);
                });

                /// @dev the dfs fee is taken in the recipe, so srcAmount reaches the wrapper
                /// smaller than the quoted amount and updateAmountIn has to rewrite the order
                it(`... should sell ${sellToken} for ${buyToken} (fly), dfs fee taken`, async () => {
                    const sellRecipe = new dfs.Recipe('SellRecipe', [
                        new dfs.actions.basic.PullTokenAction(
                            sellAssetInfo.address,
                            senderAcc.address,
                            amount.toString(),
                        ),
                        new dfs.actions.basic.SellAction(
                            exchangeObject,
                            proxy.address,
                            senderAcc.address,
                        ),
                    ]);
                    const functionData = sellRecipe.encodeForDsProxyCall()[1];

                    await executeAction('RecipeExecutor', functionData, proxy);

                    // in a recipe the divider is looked up per token pair, fee is srcAmount / divider
                    const feeDivider = await tokenGroupRegistry.getFeeForTokens(
                        sellAssetInfo.address,
                        buyAssetInfo.address,
                    );
                    expect(feeDivider).to.be.gt(0);

                    await expectSwapSettled(amount.div(feeDivider));
                });
            });
        });
    });
};

const openOceanTestData = [
    { sellToken: 'WETH', buyToken: 'USDC', rawAmount: '100' },
    { sellToken: 'USDC', buyToken: 'WETH', rawAmount: '500000' },
    { sellToken: 'DAI', buyToken: 'USDT', rawAmount: '1000000' },
    { sellToken: 'USDT', buyToken: 'USDC', rawAmount: '10000000' },
];

/// @dev the dfs referrer
const OPEN_OCEAN_REFERRER_ADDR = '0x0eD7f3223266Ca1694F85C23aBe06E614Af3A479';

/// @dev openocean takes a chain slug in the path, not a chain id
const openOceanChainNames = {
    1: 'eth',
    10: 'optimism',
    56: 'bsc',
    137: 'polygon',
    8453: 'base',
    42161: 'arbitrum',
    59144: 'linea',
};

/// @dev hashflow, native v2/v4 and bebop fill from maker orders signed off chain. Rewriting the
/// sell amount invalidates those signatures and reverts the swap, so the router is told to route
/// around them. Prefer this over disabledDexIds, whose indexes differ per chain.
/// Set to undefined to allow every route
const OPEN_OCEAN_DISABLE_RFQ = 'true'; // only the string works, disableRfq=1 is ignored

/// @dev OpenOceanExchange.swap, the only entrypoint the wrapper knows how to rewrite
const OPEN_OCEAN_SWAP_SELECTOR = '0x90411a32';

const getOpenOceanQuote = async (
    sellAssetInfo,
    buyAssetInfo,
    amount,
    openOceanWrapper,
    chainId,
) => {
    const chainName = openOceanChainNames[chainId];
    if (!chainName) {
        throw new Error(`openocean swap api has no chain slug for chainId ${chainId}`);
    }

    const options = {
        method: 'GET',
        baseURL: 'https://open-api-pro.de1.exchange',
        url: `/v4/${chainName}/swap`,
        params: {
            inTokenAddress: sellAssetInfo.address,
            outTokenAddress: buyAssetInfo.address,
            /// @dev amountDecimals/gasPriceDecimals are the raw units, the older amount/gasPrice
            /// params are whole tokens and gwei and are deprecated
            amountDecimals: amount.toString(),
            gasPriceDecimals: hre.ethers.utils.parseUnits('1', 'gwei').toString(),
            slippage: 1, // in percent
            disableRfq: OPEN_OCEAN_DISABLE_RFQ,
            account: openOceanWrapper.address,
            referrer: OPEN_OCEAN_REFERRER_ADDR,
        },
        headers: {
            apikey: process.env.OPEN_OCEAN_API_KEY,
            'Content-Type': 'application/json',
        },
    };
    const response = await axios(options);

    // openocean answers 200 on the wire and carries the real status in the body
    if (response.data.code !== 200) {
        throw new Error(`openocean swap api returned code ${response.data.code}`);
    }

    return response.data.data;
};

const getOpenOceanAmountOffsets = (callData, amount) => {
    const amountHex = hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [amount]).slice(2);

    return [...callData.matchAll(new RegExp(amountHex, 'gi'))].map((match) => match.index / 2 - 1);
};

const openOceanTest = async () => {
    describe('Dfs-Sell-via-OpenOcean-Aggregator', function () {
        this.timeout(400000);

        let senderAcc;
        let openOceanWrapper;
        let proxy;
        let feeReceiverAddr;
        let tokenGroupRegistry;
        const chainId = chainIds[network];

        const isFork = isNetworkFork();

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];

            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
            }

            openOceanWrapper = await redeploy('OpenOceanWrapper', isFork);

            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await setNewExchangeWrapper(senderAcc, openOceanWrapper.address, isFork);

            /// @dev the dfs fee is taken off srcAmount and paid in the sell token, so both the
            /// receiver and the per pair divider are needed to say exactly how much should move
            const feeRecipient = await hre.ethers.getContractAt(
                'FeeRecipient',
                addrs[network].FEE_RECIPIENT_ADDR,
            );
            feeReceiverAddr = await feeRecipient.getFeeAddr();
            tokenGroupRegistry = await hre.ethers.getContractAt(
                'TokenGroupRegistry',
                addrs[network].TOKEN_GROUP_REGISTRY,
            );
        });

        openOceanTestData.forEach(({ sellToken, buyToken, rawAmount }) => {
            describe(`${sellToken} -> ${buyToken} | Amount: ${rawAmount}`, () => {
                let exchangeObject;
                let amount;
                let sellAssetInfo;
                let buyAssetInfo;
                let buyBalanceBefore;
                let amountOutMin;
                let feeBalanceBefore;

                /// @dev nothing is rolled back between tests so every transaction stays on the
                /// vnet to be inspected later. That means each test funds itself and fetches its
                /// own order, a openocean order is only good for the state it was quoted against
                beforeEach(async () => {
                    sellAssetInfo = getAssetInfo(sellToken, chainId);
                    buyAssetInfo = getAssetInfo(buyToken, chainId);
                    amount = hre.ethers.utils.parseUnits(rawAmount, sellAssetInfo.decimals);

                    await setBalance(sellAssetInfo.address, senderAcc.address, amount);
                    await approve(sellAssetInfo.address, proxy.address);

                    buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);
                    feeBalanceBefore = await balanceOf(sellAssetInfo.address, feeReceiverAddr);

                    const quote = await getOpenOceanQuote(
                        sellAssetInfo,
                        buyAssetInfo,
                        amount,
                        openOceanWrapper,
                        chainId,
                    );

                    // guards the amount format, the deprecated params take whole tokens
                    expect(quote.inAmount).to.be.eq(amount.toString());

                    expect(quote.data.slice(0, 10)).to.be.eq(OPEN_OCEAN_SWAP_SELECTOR);

                    const exchangeAddr = quote.to;
                    // the openocean router pulls the sell token itself, there is no separate spender
                    const allowanceTarget = quote.to;
                    const price = 1; // anything bigger than 0 triggers the offchain if
                    const protocolFee = 0;

                    const offsets = getOpenOceanAmountOffsets(quote.data, amount);

                    /// @dev the wrapper takes a single offset, so anything other than one hit
                    /// means the order no longer looks the way it is being rewritten
                    expect(offsets.length).to.be.eq(1);

                    const callData = hre.ethers.utils.defaultAbiCoder.encode(
                        ['(bytes,uint256)'],
                        [[quote.data, offsets[0]]],
                    );

                    amountOutMin = hre.ethers.BigNumber.from(quote.minOutAmount);

                    exchangeObject = formatExchangeObjForOffchain(
                        sellAssetInfo.address,
                        buyAssetInfo.address,
                        amount,
                        openOceanWrapper.address,
                        exchangeAddr,
                        allowanceTarget,
                        price,
                        protocolFee,
                        callData,
                    );

                    // DFSExchangeCore refuses to call an exchangeAddr that isn't whitelisted
                    await addToExchangeAggregatorRegistry(senderAcc, exchangeAddr, isFork);
                });

                const expectSwapSettled = async (expectedFee) => {
                    const buyBalanceAfter = await balanceOf(
                        buyAssetInfo.address,
                        senderAcc.address,
                    );
                    const sellBalanceAfter = await balanceOf(
                        sellAssetInfo.address,
                        senderAcc.address,
                    );
                    const received = buyBalanceAfter.sub(buyBalanceBefore);

                    // the eoa was funded with exactly amount and the whole of it went in
                    expect(sellBalanceAfter).to.be.eq(0);

                    expect(received).to.be.gte(amountOutMin);

                    // the fee is taken off the sell side, so it is exact rather than approximate
                    const feeBalanceAfter = await balanceOf(sellAssetInfo.address, feeReceiverAddr);
                    expect(feeBalanceAfter.sub(feeBalanceBefore)).to.be.eq(expectedFee);

                    /// @dev sendLeftover has to hand everything back
                    expect(
                        await balanceOf(sellAssetInfo.address, openOceanWrapper.address),
                    ).to.be.eq(0);
                    expect(
                        await balanceOf(buyAssetInfo.address, openOceanWrapper.address),
                    ).to.be.eq(0);
                    expect(await balanceOf(sellAssetInfo.address, proxy.address)).to.be.eq(0);
                    expect(await balanceOf(buyAssetInfo.address, proxy.address)).to.be.eq(0);
                };

                /// @dev no dfs fee is taken on a standalone sell, so srcAmount still equals the
                /// quoted amount and the wrapper writes back the value the order already carries
                it(`... should sell ${sellToken} for ${buyToken} (openocean), no fee`, async () => {
                    const sellAction = new dfs.actions.basic.SellAction(
                        exchangeObject,
                        senderAcc.address,
                        senderAcc.address,
                    );
                    const functionData = sellAction.encodeForDsProxyCall()[1];

                    await executeAction('DFSSell', functionData, proxy);

                    // DFSSell zeroes dfsFeeDivider when it runs as a direct action
                    await expectSwapSettled(0);
                });

                /// @dev the dfs fee is taken in the recipe, so srcAmount reaches the wrapper
                /// smaller than the quoted amount and the offsets have to rewrite the order
                it(`... should sell ${sellToken} for ${buyToken} (openocean), dfs fee taken`, async () => {
                    const sellRecipe = new dfs.Recipe('SellRecipe', [
                        new dfs.actions.basic.PullTokenAction(
                            sellAssetInfo.address,
                            senderAcc.address,
                            amount.toString(),
                        ),
                        new dfs.actions.basic.SellAction(
                            exchangeObject,
                            proxy.address,
                            senderAcc.address,
                        ),
                    ]);
                    const functionData = sellRecipe.encodeForDsProxyCall()[1];

                    await executeAction('RecipeExecutor', functionData, proxy);

                    // in a recipe the divider is looked up per token pair, fee is srcAmount / divider
                    const feeDivider = await tokenGroupRegistry.getFeeForTokens(
                        sellAssetInfo.address,
                        buyAssetInfo.address,
                    );
                    expect(feeDivider).to.be.gt(0);

                    await expectSwapSettled(amount.div(feeDivider));
                });
            });
        });
    });
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
            await addToRegistry(
                'KyberInputScalingHelper',
                '0x2f577A41BeC1BE1152AeEA12e73b7391d15f655D',
            );
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
                    url: `routes?tokenIn=${sellAssetInfo.address}&tokenOut=${
                        buyAssetInfo.address
                    }&amountIn=${amount.toString()}&saveGas=false&gasInclude=true&x-client-id=${clientId}`,
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
                    exchangeObject,
                    senderAcc.address,
                    senderAcc.address,
                );
                const functionData = sellAction.encodeForDsProxyCall()[1];
                await executeAction('DFSSell', functionData, proxy);
                const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);
                expect(buyBalanceBefore).is.lt(buyBalanceAfter);
                await revertToSnapshot(snapshot);
            });
            it(`... should try to sell ${trade.sellToken} for ${trade.buyToken} with offchain calldata (Kyber) in a recipe`, async () => {
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
                    url: `routes?tokenIn=${sellAssetInfo.address}&tokenOut=${
                        buyAssetInfo.address
                    }&amountIn=${amount.toString()}&saveGas=false&gasInclude=true&x-client-id=${clientId}`,
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
                    new dfs.actions.basic.PullTokenAction(
                        sellAssetInfo.address,
                        senderAcc.address,
                        amount,
                    ),
                    new dfs.actions.basic.SellAction(
                        exchangeObject,
                        proxy.address,
                        senderAcc.address,
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
                baseURL: 'https://api.paraswap.io',
                url: `/prices?srcToken=${sellAssetInfo.address}&srcDecimals=${sellAssetInfo.decimals}&destToken=${buyAssetInfo.address}&destDecimals=${buyAssetInfo.decimals}&amount=${amount}&side=SELL&network=${networkId}&version=6.2`,
            };
            const priceObject = await axios(options).then((response) => response.data.priceRoute);
            console.log(priceObject);

            const secondOptions = {
                method: 'POST',
                baseURL: 'https://api.paraswap.io/transactions/1?ignoreChecks=true',
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

            let amountInHex = hre.ethers.utils.defaultAbiCoder.encode(
                ['uint256'],
                [priceObject.srcAmount],
            );
            amountInHex = amountInHex.slice(2);

            let offset = callData.toString().indexOf(amountInHex);
            offset = offset / 2 - 1;

            const paraswapSpecialCalldata = hre.ethers.utils.defaultAbiCoder.encode(
                ['(bytes,uint256)'],
                [[callData, offset]],
            );

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
                exchangeObject,
                senderAcc.address,
                senderAcc.address,
            );

            const functionData = sellAction.encodeForDsProxyCall()[1];

            await executeAction('DFSSell', functionData, proxy);

            const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });
        it('... should try to sell WETH for DAI with offchain calldata (Paraswap) in a recipe', async () => {
            // test recipe
            const sellRecipe = new dfs.Recipe('SellRecipe', [
                new dfs.actions.basic.PullTokenAction(
                    sellAssetInfo.address,
                    senderAcc.address,
                    amount.toString(),
                ),
                new dfs.actions.basic.SellAction(exchangeObject, proxy.address, senderAcc.address),
            ]);
            const functionData = sellRecipe.encodeForDsProxyCall()[1];

            await executeAction('RecipeExecutor', functionData, proxy, amount);

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
            const chainId = chainIds[network];

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
                url:
                    `/v6.0/${chainId}/swap?src=${sellAssetInfo.address}&dst=${buyAssetInfo.address}&amount=${amount}&from=${oneInchWrapper.address}` +
                    '&slippage=1' +
                    '&usePatching=true' +
                    '&disableEstimate=true' +
                    '&allowPartialFill=false' +
                    '&includeProtocols=true',

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
            const indexes = [...sourceStr.matchAll(new RegExp(searchStr, 'gi'))].map(
                (a) => a.index,
            );

            const offsets = [];

            for (let i = 0; i < indexes.length; i++) {
                offsets[i] = indexes[i] / 2 - 1;
            }

            const specialCalldata = hre.ethers.utils.defaultAbiCoder.encode(
                ['(bytes,uint256[])'],
                [[callData, offsets]],
            );

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
                exchangeObject,
                senderAcc.address,
                senderAcc.address,
            );
            const functionData = sellAction.encodeForDsProxyCall()[1];

            await executeAction('DFSSell', functionData, proxy);

            const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });
        it('... should try to sell WETH for DAI with offchain calldata (1inch) in a recipe', async () => {
            // test recipe
            const sellRecipe = new dfs.Recipe('SellRecipe', [
                new dfs.actions.basic.PullTokenAction(
                    sellAssetInfo.address,
                    senderAcc.address,
                    amount.toString(),
                ),
                new dfs.actions.basic.SellAction(exchangeObject, proxy.address, senderAcc.address),
            ]);
            const functionData = sellRecipe.encodeForDsProxyCall()[1];

            await executeAction('RecipeExecutor', functionData, proxy, amount);

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
        let snapshot;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
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

            const zeroxWrapper = addrs[network].ZEROX_WRAPPER;

            const options = {
                method: 'GET',
                baseURL: 'https://api.0x.org',
                url: `/swap/allowance-holder/quote?chainId=${chainId}&sellToken=${
                    sellAssetInfo.address
                }&buyToken=${
                    buyAssetInfo.address
                }&sellAmount=${sellAmount.toString()}&taker=${zeroxWrapper}`,
                headers: {
                    '0x-api-key': `${process.env.ZEROX_API_KEY}`,
                    '0x-version': 'v2',
                },
            };
            const priceObject = await axios(options).then((response) => response.data);

            // THIS IS CHANGEABLE WITH API INFORMATION
            const allowanceTarget = priceObject.transaction.to;
            const price = 1; // just for testing, anything bigger than 0 triggers offchain if
            const protocolFee = 0;
            const callData = priceObject.transaction.data;

            const exchangeObject = formatExchangeObjForOffchain(
                sellAssetInfo.address,
                buyAssetInfo.address,
                sellAmount,
                zeroxWrapper,
                allowanceTarget,
                allowanceTarget,
                price,
                protocolFee,
                callData,
            );
            await addToExchangeAggregatorRegistry(senderAcc, allowanceTarget);

            const sellAction = new dfs.actions.basic.SellAction(
                exchangeObject,
                senderAcc.address,
                senderAcc.address,
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

const odosTest = async () => {
    describe('Dfs-Sell-via-Odos-Aggregator', function () {
        this.timeout(400000);

        let senderAcc;
        let odosWrapper;
        let proxy;
        let snapshot;
        let exchangeObject;
        let amount;
        let buyBalanceBefore;
        let buyAssetInfo;
        let sellAssetInfo;

        before(async () => {
            const chainId = chainIds[network];

            await redeploy('DFSSell');
            await redeploy('PullToken');
            await redeploy('RecipeExecutor');
            odosWrapper = await redeploy('OdosWrapper');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await setNewExchangeWrapper(senderAcc, odosWrapper.address);

            sellAssetInfo = getAssetInfo('WETH', chainId);
            buyAssetInfo = getAssetInfo('USDC', chainId);

            buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);
            amount = hre.ethers.utils.parseUnits('1', 18);
            await setBalance(sellAssetInfo.address, senderAcc.address, amount);
            await approve(sellAssetInfo.address, proxy.address);
            const odosQuoteBody = {
                chainId: 1,
                compact: false,
                inputTokens: [
                    {
                        amount: amount.toString(),
                        tokenAddress: sellAssetInfo.address,
                    },
                ],
                outputTokens: [
                    {
                        proportion: 1,
                        tokenAddress: buyAssetInfo.address,
                    },
                ],
                referralCode: 0,
                slippageLimitPercent: 1,
                userAddr: odosWrapper.address,
            };
            const quote = {
                method: 'POST',
                baseURL: 'https://api.odos.xyz/sor/quote/v2',
                data: odosQuoteBody,
            };
            // set slippage to user slippage + fee%
            // add all protocols and remove one by one

            const quoteObject = await axios(quote).then((response) => response.data);
            const assembleTx = {
                method: 'POST',
                baseURL: 'https://api.odos.xyz/sor/assemble',
                data: {
                    userAddr: odosWrapper.address,
                    pathId: quoteObject.pathId,
                },
            };
            // set slippage to user slippage + fee%
            // add all protocols and remove one by one

            const transactionObject = await axios(assembleTx).then((response) => response.data);
            console.log(transactionObject);

            // THIS IS CHANGEABLE WITH API INFORMATION
            const allowanceTarget = transactionObject.transaction.to;
            const price = 1; // just for testing, anything bigger than 0 triggers offchain if
            const protocolFee = 0;
            const callData = transactionObject.transaction.data;

            let amountInHex = hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [amount]);
            amountInHex = amountInHex.slice(2);

            let offset = callData.toString().indexOf(amountInHex.toLowerCase());
            offset = offset / 2 - 1;

            const specialCalldata = hre.ethers.utils.defaultAbiCoder.encode(
                ['(bytes,uint256)'],
                [[callData, offset]],
            );

            exchangeObject = formatExchangeObjForOffchain(
                sellAssetInfo.address,
                buyAssetInfo.address,
                amount,
                odosWrapper.address,
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

        it('... should try to sell WETH for DAI with offchain calldata (Odos)', async () => {
            const sellAction = new dfs.actions.basic.SellAction(
                exchangeObject,
                senderAcc.address,
                senderAcc.address,
            );
            const functionData = sellAction.encodeForDsProxyCall()[1];

            await executeAction('DFSSell', functionData, proxy);

            const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });
        it('... should try to sell WETH for DAI with offchain calldata (Odos) in a recipe', async () => {
            // test recipe
            const sellRecipe = new dfs.Recipe('SellRecipe', [
                new dfs.actions.basic.PullTokenAction(
                    sellAssetInfo.address,
                    senderAcc.address,
                    amount.toString(),
                ),
                new dfs.actions.basic.SellAction(exchangeObject, proxy.address, senderAcc.address),
            ]);
            const functionData = sellRecipe.encodeForDsProxyCall()[1];

            await executeAction('RecipeExecutor', functionData, proxy, amount);

            const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });
    });
};

const pendleRouterTest = async () => {
    describe('Dfs-Sell-via-Pendle-Router', function () {
        this.timeout(400000);

        const testSwaps = [
            {
                sellToken: DAI_ADDR,
                buyToken: '0x62c6e813b9589c3631ba0cdb013acdb8544038b7', // PT USDe Nov
                pendleMarket: '0x4eaa571eafcd96f51728756bd7f396459bb9b869',
            },
            {
                buyToken: DAI_ADDR,
                sellToken: '0x62c6e813b9589c3631ba0cdb013acdb8544038b7', // PT USDe Nov
                pendleMarket: '0x4eaa571eafcd96f51728756bd7f396459bb9b869',
            },
            {
                sellToken: DAI_ADDR,
                buyToken: '0xe6a934089bbee34f832060ce98848359883749b3', // PT sUSDe Nov
                pendleMarket: '0xb6ac3d5da138918ac4e84441e924a20daa60dbdd',
            },
            {
                buyToken: DAI_ADDR,
                sellToken: '0xe6a934089bbee34f832060ce98848359883749b3', // PT sUSDe Nov
                pendleMarket: '0xb6ac3d5da138918ac4e84441e924a20daa60dbdd',
            },
        ];

        const PENDLE_ROUTER = '0x888888888889758F76e7103c6CbF23ABbF58F946';

        let senderAcc;
        let pendleWrapper;
        let proxy;
        let snapshot;

        const validateNoTokensLeftOnProxy = async (sellToken, buyToken) => {
            const proxySellTokenBalance = await balanceOf(sellToken, proxy.address);
            const proxyBuyTokenBalance = await balanceOf(buyToken, proxy.address);

            expect(proxySellTokenBalance).to.be.eq(0);
            expect(proxyBuyTokenBalance).to.be.eq(0);
        };

        // @dev This test uses live API response and latest state. Keep in mind that swap won't be available after PT maturity.
        // Date: 2025-05-07 Block: 22431905
        before(async () => {
            await redeploy('DFSSellNoFee');
            await redeploy('PullToken');
            await redeploy('RecipeExecutor');
            pendleWrapper = await redeploy('PendleWrapper');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await setNewExchangeWrapper(senderAcc, pendleWrapper.address);
            await addToExchangeAggregatorRegistry(senderAcc, PENDLE_ROUTER);
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        for (let i = 0; i < testSwaps.length; ++i) {
            const testSwap = testSwaps[i];
            const sellAsset = testSwap.sellToken;
            const buyAsset = testSwap.buyToken;
            const chainId = 1;
            const slippage = 0.05;
            const enableAggregator = true;
            const tokenIn = sellAsset;
            const tokenOut = buyAsset;
            const amountIn = hre.ethers.utils.parseUnits('1', 18);
            const router = PENDLE_ROUTER;
            const allowanceTarget = PENDLE_ROUTER;
            const price = 1; // just for testing, anything bigger than 0 triggers offchain if
            const protocolFee = 0;
            it(`... should try to sell ${testSwap.sellToken} for ${testSwap.buyToken} with offchain calldata (Pendle) action direct`, async () => {
                const pendleMarketContract = await hre.ethers.getContractAt(
                    'IPendleMarket',
                    testSwap.pendleMarket,
                );
                const isExpired = await pendleMarketContract.isExpired();
                if (isExpired) {
                    console.log('Pendle market is expired. Skipping test...');
                    expect(true).to.be.true;
                    return;
                }

                const receiver = pendleWrapper.address;
                await setBalance(sellAsset, senderAcc.address, amountIn);
                await approve(sellAsset, proxy.address);

                const options = {
                    method: 'GET',
                    baseURL: `https://api-v2.pendle.finance/core/v2/sdk/${chainId}/`,
                    url: `convert?receiver=${receiver}&slippage=${slippage}&enableAggregator=${enableAggregator}&tokensIn=${tokenIn}&tokensOut=${tokenOut}&amountsIn=${amountIn}`,
                };
                const res = await axios(options);

                const exchangeObject = formatExchangeObjForOffchain(
                    sellAsset,
                    buyAsset,
                    amountIn,
                    pendleWrapper.address,
                    router,
                    allowanceTarget,
                    price,
                    protocolFee,
                    res.data.routes[0].tx.data /* calldata */,
                );

                const sellActionNoFee = new dfs.actions.basic.SellNoFeeAction(
                    exchangeObject,
                    senderAcc.address,
                    senderAcc.address,
                );

                const functionData = sellActionNoFee.encodeForDsProxyCall()[1];

                const buyBalanceBefore = await balanceOf(buyAsset, senderAcc.address);
                const sellBalanceBefore = await balanceOf(sellAsset, senderAcc.address);

                await executeAction('DFSSellNoFee', functionData, proxy);

                const sellBalanceAfter = await balanceOf(sellAsset, senderAcc.address);
                const buyBalanceAfter = await balanceOf(buyAsset, senderAcc.address);

                expect(buyBalanceBefore).is.lt(buyBalanceAfter);
                expect(sellBalanceAfter).is.eq(sellBalanceBefore.sub(amountIn));
                await validateNoTokensLeftOnProxy(sellAsset, buyAsset);
            });
            it(`... should try to sell ${testSwap.sellToken} for ${testSwap.buyToken} with offchain calldata (Pendle) in a recipe`, async () => {
                const pendleMarketContract = await hre.ethers.getContractAt(
                    'IPendleMarket',
                    testSwap.pendleMarket,
                );
                const isExpired = await pendleMarketContract.isExpired();
                if (isExpired) {
                    console.log('Pendle market is expired. Skipping test...');
                    expect(true).to.be.true;
                    return;
                }

                const receiver = pendleWrapper.address;
                await setBalance(sellAsset, senderAcc.address, amountIn);
                await approve(sellAsset, proxy.address);

                const options = {
                    method: 'GET',
                    baseURL: `https://api-v2.pendle.finance/core/v2/sdk/${chainId}/`,
                    url: `convert?receiver=${receiver}&slippage=${slippage}&enableAggregator=${enableAggregator}&tokensIn=${tokenIn}&tokensOut=${tokenOut}&amountsIn=${amountIn}`,
                };
                const res = await axios(options);

                const exchangeObject = formatExchangeObjForOffchain(
                    sellAsset,
                    buyAsset,
                    amountIn,
                    pendleWrapper.address,
                    router,
                    allowanceTarget,
                    price,
                    protocolFee,
                    res.data.routes[0].tx.data /* calldata */,
                );

                const sellRecipe = new dfs.Recipe('SellRecipeNoFee', [
                    new dfs.actions.basic.PullTokenAction(sellAsset, senderAcc.address, amountIn),
                    new dfs.actions.basic.SellNoFeeAction(
                        exchangeObject,
                        proxy.address,
                        senderAcc.address,
                    ),
                ]);

                const functionData = sellRecipe.encodeForDsProxyCall()[1];

                const buyBalanceBefore = await balanceOf(buyAsset, senderAcc.address);
                const sellBalanceBefore = await balanceOf(sellAsset, senderAcc.address);

                await executeAction('RecipeExecutor', functionData, proxy);

                const sellBalanceAfter = await balanceOf(sellAsset, senderAcc.address);
                const buyBalanceAfter = await balanceOf(buyAsset, senderAcc.address);

                expect(buyBalanceBefore).is.lt(buyBalanceAfter);
                expect(sellBalanceAfter).is.eq(sellBalanceBefore.sub(amountIn));
                await validateNoTokensLeftOnProxy(sellAsset, buyAsset);
            });
        }
    });
};

const offchainExchangeFullTest = async () => {
    await paraswapTest();
    await oneInchTest();
    await kyberTest();
    await zeroxTest();
    await odosTest();
    await pendleRouterTest();
    await bebopTest();
    await flyTest();
    await openOceanTest();
};

module.exports = {
    offchainExchangeFullTest,
    kyberTest,
    paraswapTest,
    oneInchTest,
    zeroxTest,
    odosTest,
    pendleRouterTest,
    bebopTest,
    flyTest,
    openOceanTest,
};
