const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const hre = require('hardhat');
require('dotenv-safe').config();
const dfs = require('@defisaver/sdk');
const { default: axios } = require('axios');
const {
    getProxy,
    setupExchangeFork,
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
    DAI_ADDR,
    isNetworkFork,
    getOwnerAddr,
} = require('../../utils/utils');

const { executeAction } = require('../../utils/actions');
const { topUp } = require('../../../scripts/utils/fork');

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
    const response = await axios(options);
    return response.data;
};

const bebopTest = () => {
    describe('Dfs-Sell-via-Bebop-Aggregator (Parametrized)', function () {
        this.timeout(400000);

        let senderAcc;
        let bebopWrapper;
        let proxy;
        let snapshot;
        const chainId = chainIds[network];

        before(async () => {
            await setupExchangeFork();
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
    { sellToken: 'DAI', buyToken: 'WBTC', rawAmount: '10000' },
    { sellToken: 'WBTC', buyToken: 'USDT', rawAmount: '10' },
];

const getFlyQuote = async (sellAssetInfo, buyAssetInfo, amount, flyWrapper) => {
    const options = {
        method: 'GET',
        baseURL: 'https://api.fly.trade/aggregator/quote/transaction',
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
    };
    const response = await axios(options);
    return response.data;
};

const flyTest = () => {
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
            await setupExchangeFork();
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
                'contracts/utils/fee/FeeRecipient.sol:FeeRecipient',
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
    8453: 'base',
    42161: 'arbitrum',
    59144: 'linea',
    9745: 'plasma',
};

/// @dev hashflow, native v2/v4 and bebop fill from maker orders signed off chain. Rewriting the
/// sell amount invalidates those signatures and reverts the swap, so the router is told to route
/// around them. Prefer this over disabledDexIds, whose indexes differ per chain.
/// Set to undefined to allow every route
const OPEN_OCEAN_DISABLE_RFQ = 'true'; // only the string works, disableRfq=1 is ignored

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

const getAmountOffsets = (callData, amount) => {
    const amountHex = hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [amount]).slice(2);

    return [...callData.matchAll(new RegExp(amountHex, 'gi'))].map((match) => match.index / 2 - 1);
};

const openOceanTest = () => {
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
            await setupExchangeFork();
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
                'contracts/utils/fee/FeeRecipient.sol:FeeRecipient',
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

                    const exchangeAddr = quote.to;
                    // the openocean router pulls the sell token itself, there is no separate spender
                    const allowanceTarget = quote.to;
                    const price = 1; // anything bigger than 0 triggers the offchain if
                    const protocolFee = 0;

                    const offsets = getAmountOffsets(quote.data, amount);

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

const kyberTest = () => {
    describe('Dfs-Sell-via-Kyber-Aggregator', function () {
        this.timeout(400000);
        const chainId = chainIds[network];
        const src = getAssetInfo('WETH', chainId).address;
        const dest = getAssetInfo('DAI', chainId).address;
        const amount = hre.ethers.utils.parseEther('1');
        const clientId = 'partner-staging';
        const api = axios.create({
            baseURL: getKyberApiUrlByChainId(chainId),
            headers: { 'x-client-id': clientId },
        });
        let senderAcc;
        let proxy;
        let wrapper;
        let snapshot;

        before(async () => {
            await setupExchangeFork();
            wrapper = await redeploy('KyberAggregatorWrapper');
            [senderAcc] = await hre.ethers.getSigners();
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await setNewExchangeWrapper(senderAcc, wrapper.address);
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        for (const inRecipe of [false, true]) {
            it(`sells WETH for DAI ${inRecipe ? 'in a recipe' : 'directly'}`, async () => {
                await setBalance(src, senderAcc.address, amount);
                await approve(src, proxy.address);
                const route = await api.get('routes', {
                    params: {
                        tokenIn: src,
                        tokenOut: dest,
                        amountIn: amount.toString(),
                        saveGas: false,
                        gasInclude: true,
                    },
                });
                const { routeSummary, routerAddress } = route.data.data;
                const built = await api.post('route/build', {
                    routeSummary,
                    sender: wrapper.address,
                    recipient: wrapper.address,
                    slippageTolerance: 1000,
                    source: clientId,
                });
                const callData = built.data.data.data;
                await addToExchangeAggregatorRegistry(senderAcc, routerAddress);
                const order = formatExchangeObjForOffchain(
                    src,
                    dest,
                    amount,
                    wrapper.address,
                    routerAddress,
                    routerAddress,
                    1,
                    0,
                    callData,
                );
                const sell = new dfs.actions.basic.SellAction(
                    order,
                    inRecipe ? proxy.address : senderAcc.address,
                    senderAcc.address,
                );
                const action = inRecipe
                    ? new dfs.Recipe('SellRecipe', [
                          new dfs.actions.basic.PullTokenAction(src, senderAcc.address, amount),
                          sell,
                      ])
                    : sell;
                const buyBalanceBefore = await balanceOf(dest, senderAcc.address);
                await executeAction(
                    inRecipe ? 'RecipeExecutor' : 'DFSSell',
                    action.encodeForDsProxyCall()[1],
                    proxy,
                );
                expect(await balanceOf(dest, senderAcc.address)).to.be.gt(buyBalanceBefore);
            });
        }
    });
};

const paraswapTest = () => {
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
            await setupExchangeFork();
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

            const [offset] = getAmountOffsets(callData, priceObject.srcAmount);
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

        it('... should try to sell WETH for USDC with offchain calldata (Paraswap)', async () => {
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
        it('... should try to sell WETH for USDC with offchain calldata (Paraswap) in a recipe', async () => {
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

const oneInchTest = () => {
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
            await setupExchangeFork();
            const chainId = chainIds[network];

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

            const offsets = getAmountOffsets(callData, amount);
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

        it('... should try to sell WETH for USDC with offchain calldata (1inch)', async () => {
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
        it('... should try to sell WETH for USDC with offchain calldata (1inch) in a recipe', async () => {
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

const zeroxTest = () => {
    describe('Dfs-Sell-0x', function () {
        this.timeout(140000);

        let senderAcc;
        let proxy;
        let snapshot;

        before(async () => {
            await setupExchangeFork();
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
            await setNewExchangeWrapper(senderAcc, zeroxWrapper);

            const options = {
                method: 'GET',
                baseURL: 'https://api.0x.org',
                url: `/swap/allowance-holder/quote?chainId=${chainId}&sellToken=${
                    sellAssetInfo.address
                }&buyToken=${
                    buyAssetInfo.address
                }&sellAmount=${sellAmount.toString()}&taker=${zeroxWrapper}&txOrigin=${senderAcc.address}`,
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

const pendleRouterTest = () => {
    describe('Dfs-Sell-via-Pendle-Router', function () {
        this.timeout(400000);

        const router = '0x888888888889758F76e7103c6CbF23ABbF58F946';
        const amount = hre.ethers.utils.parseEther('1');
        let senderAcc;
        let proxy;
        let wrapper;
        let markets;
        let snapshot;

        before(async () => {
            await setupExchangeFork('DFSSellNoFee');
            wrapper = await redeploy('PendleWrapper');
            [senderAcc] = await hre.ethers.getSigners();
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await setNewExchangeWrapper(senderAcc, wrapper.address);
            await addToExchangeAggregatorRegistry(senderAcc, router);
            const { data } = await axios.get(
                'https://api-v2.pendle.finance/core/v1/1/markets/active',
            );
            markets = data.markets.sort((a, b) => b.details.liquidity - a.details.liquidity);
        });

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        for (const underlying of ['USDe', 'sUSDe']) {
            for (const buyPt of [true, false]) {
                const pair = buyPt ? `DAI for PT-${underlying}` : `PT-${underlying} for DAI`;
                for (const inRecipe of [false, true]) {
                    it(`sells ${pair} ${inRecipe ? 'in a recipe' : 'directly'}`, async () => {
                        const market = markets.find(({ name }) => name === underlying);
                        expect(market, `active ${underlying} market`).to.exist;
                        const [, pt] = market.pt.split('-');
                        const [src, dest] = buyPt ? [DAI_ADDR, pt] : [pt, DAI_ADDR];
                        await setBalance(src, senderAcc.address, amount);
                        await approve(src, proxy.address);

                        const { data } = await axios.get(
                            'https://api-v2.pendle.finance/core/v2/sdk/1/convert',
                            {
                                params: {
                                    receiver: wrapper.address,
                                    slippage: 0.05,
                                    enableAggregator: true,
                                    tokensIn: src,
                                    tokensOut: dest,
                                    amountsIn: amount.toString(),
                                },
                            },
                        );
                        const { tx } = data.routes[0];
                        expect(tx.to.toLowerCase()).to.eq(router.toLowerCase());
                        const order = formatExchangeObjForOffchain(
                            src,
                            dest,
                            amount,
                            wrapper.address,
                            router,
                            router,
                            1,
                            0,
                            tx.data,
                        );
                        const sell = new dfs.actions.basic.SellNoFeeAction(
                            order,
                            inRecipe ? proxy.address : senderAcc.address,
                            senderAcc.address,
                        );
                        const action = inRecipe
                            ? new dfs.Recipe('SellRecipeNoFee', [
                                  new dfs.actions.basic.PullTokenAction(
                                      src,
                                      senderAcc.address,
                                      amount,
                                  ),
                                  sell,
                              ])
                            : sell;
                        const balanceBefore = await balanceOf(dest, senderAcc.address);
                        await executeAction(
                            inRecipe ? 'RecipeExecutor' : 'DFSSellNoFee',
                            action.encodeForDsProxyCall()[1],
                            proxy,
                        );
                        expect(await balanceOf(dest, senderAcc.address)).to.be.gt(balanceBefore);
                        expect(await balanceOf(src, senderAcc.address)).to.eq(0);
                        expect(await balanceOf(src, proxy.address)).to.eq(0);
                        expect(await balanceOf(dest, proxy.address)).to.eq(0);
                    });
                }
            }
        }
    });
};

const offchainExchangeFullTest = () => {
    paraswapTest();
    oneInchTest();
    kyberTest();
    zeroxTest();
    pendleRouterTest();
    bebopTest();
    flyTest();
    openOceanTest();
};

module.exports = {
    offchainExchangeFullTest,
    kyberTest,
    paraswapTest,
    oneInchTest,
    zeroxTest,
    pendleRouterTest,
    bebopTest,
    flyTest,
    openOceanTest,
};
