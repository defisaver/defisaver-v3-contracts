/* eslint-disable max-len */
const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const hre = require('hardhat');
// const axios = require('axios');

const {
    getProxy,
    redeploy,
    balanceOf,
    setNewExchangeWrapper,
    setBalance,
    resetForkToBlock,
    Float2BN,
    curveApiInit,
    formatExchangeObj,
    BN2Float,
    formatExchangeObjCurve,
    REGISTRY_ADDR,
    addrs,
} = require('../utils');

const {
    sell,
} = require('../actions');

const trades = [
    {
        sellToken: 'WETH', buyToken: 'DAI', amount: '1', fee: 3000,
    },
    {
        sellToken: 'DAI', buyToken: 'WBTC', amount: '30000', fee: 3000,
    },
    {
        sellToken: 'WETH', buyToken: 'USDC', amount: '1', fee: 3000,
    },
    {
        sellToken: 'USDC', buyToken: 'WETH', amount: '3000', fee: 3000,
    },
    {
        sellToken: 'WETH', buyToken: 'USDT', amount: '1', fee: 3000,
    },
    {
        sellToken: 'DAI', buyToken: 'USDC', amount: '3000', fee: 500,
    },
];

const curveTrades = [
    {
        sellToken: 'WETH', buyToken: 'LUSD', amount: '1',
    },
    {
        sellToken: 'LUSD', buyToken: 'WETH', amount: '3000',
    },
    {
        sellToken: 'WETH', buyToken: 'STETH', amount: '1',
    },
    {
        sellToken: 'STETH', buyToken: 'WETH', amount: '1',
    },
];

const executeSell = async (senderAcc, proxy, dfsPrices, trade, wrapper, isCurve = false) => {
    const sellAssetInfo = getAssetInfo(trade.sellToken);
    const buyAssetInfo = getAssetInfo(trade.buyToken);

    const amount = Float2BN(trade.amount, getAssetInfo(trade.sellToken).decimals);

    await setBalance(buyAssetInfo.address, senderAcc.address, Float2BN('0'));
    await setBalance(sellAssetInfo.address, senderAcc.address, amount);

    let exchangeObject;
    if (!isCurve) {
        exchangeObject = formatExchangeObj(
            sellAssetInfo.address,
            buyAssetInfo.address,
            amount,
            wrapper.address,
            0,
            trade.fee,
        );
    } else {
        exchangeObject = await formatExchangeObjCurve(
            sellAssetInfo.address,
            buyAssetInfo.address,
            amount,
            wrapper.address,
        );
    }
    const exchangeData = exchangeObject.at(-2);

    // eslint-disable-next-line no-unused-vars
    const rate = await dfsPrices.callStatic.getExpectedRate(
        wrapper.address,
        sellAssetInfo.address,
        buyAssetInfo.address,
        amount,
        0, // exchangeType = SELL
        exchangeData,
    );

    const feeReceiverAmountBefore = await balanceOf(sellAssetInfo.address,
        addrs[hre.network.config.name].FEE_RECEIVER);

    await sell(
        proxy,
        sellAssetInfo.address,
        buyAssetInfo.address,
        amount,
        wrapper.address,
        senderAcc.address,
        senderAcc.address,
        trade.fee,
        senderAcc,
        REGISTRY_ADDR,
        isCurve,
    );

    const feeReceiverAmountAfter = await balanceOf(sellAssetInfo.address,
        addrs[hre.network.config.name].FEE_RECEIVER);
    const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

    // test fee amount
    const tokenGroupRegistry = await hre.ethers.getContractAt('TokenGroupRegistry',
        addrs[hre.network.config.name].TOKEN_GROUP_REGISTRY);

    const fee = await tokenGroupRegistry.getFeeForTokens(sellAssetInfo.address, buyAssetInfo.address);

    const feeAmount = amount.div(fee);

    // must be closeTo because 1 wei steth bug
    expect(feeReceiverAmountAfter).to.be.closeTo(feeReceiverAmountBefore.add(feeAmount), '1');

    expect(buyBalanceAfter).is.gt('0');
    // expect(buyBalanceAfter).to.be.closeTo(rate, rate.div('1000'));
    return BN2Float(buyBalanceAfter, buyAssetInfo.decimals);
};

const dfsSellTest = async () => {
    describe('Dfs-Sell', function () {
        this.timeout(400000);

        let senderAcc;
        let proxy;
        let uniWrapper;
        let kyberWrapper;
        let uniV3Wrapper;
        let paraswapWrapper;
        let curveWrapper;
        let dfsPrices;

        before(async () => {
            await curveApiInit();
            await resetForkToBlock();
            await redeploy('DFSSell');

            dfsPrices = await redeploy('DFSPrices');
            uniWrapper = await redeploy('UniswapWrapperV3');
            kyberWrapper = await redeploy('KyberWrapperV3');
            uniV3Wrapper = await redeploy('UniV3WrapperV3');
            curveWrapper = await redeploy('CurveWrapperV3');
            paraswapWrapper = await redeploy('ParaswapWrapper');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            await setNewExchangeWrapper(senderAcc, uniWrapper.address);
            await setNewExchangeWrapper(senderAcc, kyberWrapper.address);
            await setNewExchangeWrapper(senderAcc, uniV3Wrapper.address);
            await setNewExchangeWrapper(senderAcc, curveWrapper.address);

            await setNewExchangeWrapper(senderAcc, paraswapWrapper.address);
        });
        // it('... should try to sell WETH for DAI with offchain calldata (Paraswap)', async () => {
        //     const sellAssetInfo = getAssetInfo('WETH');
        //     const buyAssetInfo = getAssetInfo('USDC');

        //     const buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);

        //     await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
        //     await approve(sellAssetInfo.address, proxy.address);

        //     const options = {
        //         method: 'GET',
        //         baseURL: 'https://apiv5.paraswap.io',
        //         url: '/prices?srcToken=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2&srcDecimals=18&destToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&destDecimals=6&amount=1000000000000000000&side=SELL&network=1'
        //         + '&excludeDEXS=Balancer'
        //         + '&excludeContractMethods=simpleSwap'
        //         + `&userAddress=${paraswapWrapper.address}`,
        //     };
        //     // console.log(options.baseURL + options.url);
        //     const priceObject = await axios(options).then((response) => response.data.priceRoute);
        //     // console.log(priceObject);
        //     const secondOptions = {
        //         method: 'POST',
        //         baseURL: 'https://apiv5.paraswap.io/transactions/1?ignoreChecks=true',
        //         data: {
        //             priceRoute: priceObject,
        //             srcToken: priceObject.srcToken,
        //             destToken: priceObject.destToken,
        //             srcAmount: priceObject.srcAmount,
        //             userAddress: paraswapWrapper.address,
        //             partner: 'paraswap.io',
        //             srcDecimals: priceObject.srcDecimals,
        //             destDecimals: priceObject.destDecimals,
        //             slippage: 1000,
        //             txOrigin: senderAcc.address,
        //         },
        //     };
        //     // console.log(secondOptions.data);
        //     const resultObject = await axios(secondOptions).then((response) => response.data);
        //     // console.log(resultObject);
        //     // THIS IS CHANGEABLE WITH API INFORMATION
        //     const allowanceTarget = priceObject.tokenTransferProxy;
        //     const price = 1; // just for testing, anything bigger than 0 triggers offchain if
        //     const protocolFee = 0;
        //     const callData = resultObject.data;
        //     // console.log(callData);
        //     let amountInHex = hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [priceObject.srcAmount]);
        //     amountInHex = amountInHex.slice(2);
        //     // console.log(amountInHex.toString());
        //     let offset = callData.toString().indexOf(amountInHex);
        //     // console.log(offset);
        //     offset = offset / 2 - 1;
        //     // console.log(offset);
        //     const paraswapSpecialCalldata = hre.ethers.utils.defaultAbiCoder.encode(['(bytes,uint256)'], [[callData, offset]]);

        //     const exchangeObject = formatExchangeObjForOffchain(
        //         sellAssetInfo.address,
        //         buyAssetInfo.address,
        //         hre.ethers.utils.parseUnits('1', 18),
        //         paraswapWrapper.address,
        //         priceObject.contractAddress,
        //         allowanceTarget,
        //         price,
        //         protocolFee,
        //         paraswapSpecialCalldata,
        //     );

        //     await addToZRXAllowlist(senderAcc, priceObject.contractAddress);
        //     const sellAction = new dfs.actions.basic.SellAction(
        //         exchangeObject, senderAcc.address, senderAcc.address,
        //     );

        //     const functionData = sellAction.encodeForDsProxyCall()[1];

        //     await executeAction('DFSSell', functionData, proxy);

        //     const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

        //     expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        // });
        for (let i = 0; i < trades.length; ++i) {
            const trade = trades[i];

            it(`... should sell ${trade.sellToken} for ${trade.buyToken}`, async () => {
                const kyberRate = await executeSell(senderAcc, proxy, dfsPrices, trade, kyberWrapper);
                console.log(`Kyber sell rate -> ${kyberRate}`);

                const uniRate = await executeSell(
                    senderAcc, proxy, dfsPrices,
                    { ...trade, fee: 0 },
                    uniWrapper,
                );
                console.log(`Uniswap sell rate -> ${uniRate}`);

                const uniV3Rate = await executeSell(senderAcc, proxy, dfsPrices, trade, uniV3Wrapper);
                console.log(`UniswapV3 sell rate -> ${uniV3Rate}`);

                const curveRate = await executeSell(
                    senderAcc,
                    proxy,
                    dfsPrices,
                    trade,
                    curveWrapper,
                    true,
                );
                console.log(`Curve sell rate -> ${curveRate}`);
            });
        }

        for (let i = 0; i < curveTrades.length; ++i) {
            const trade = curveTrades[i];

            it(`... should sell ${trade.sellToken} for ${trade.buyToken} on Curve`, async () => {
                const curveRate = await executeSell(
                    senderAcc,
                    proxy,
                    dfsPrices,
                    trade,
                    curveWrapper,
                    true,
                );
                console.log(`Curve sell rate -> ${curveRate}`);
            });
        }
    });
};

const dfsExchangeFullTest = async () => {
    dfsSellTest();
};

module.exports = {
    dfsExchangeFullTest,
    dfsSellTest,
};
