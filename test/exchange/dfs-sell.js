const { expect } = require('chai');
const dfs = require('@defisaver/sdk');
const hre = require('hardhat');
const axios = require('axios');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
    setNewExchangeWrapper,
    depositToWeth,
    approve,
    getAddrFromRegistry,
    formatExchangeObjForOffchain,
    addToZRXAllowlist,
} = require('../utils');

const {
    sell,
} = require('../actions.js');

// TODO: check stuff like price and slippage
// TODO: can we make it work with 0x?

describe('Dfs-Sell', function () {
    this.timeout(40000);

    let senderAcc; let proxy; let uniWrapper; let
        kyberWrapper; let uniV3Wrapper; let offchainWrapper;

    const trades = [
        {
            sellToken: 'WETH', buyToken: 'DAI', amount: '1', fee: 3000,
        },
        {
            sellToken: 'DAI', buyToken: 'WBTC', amount: '200', fee: 3000,
        },
        {
            sellToken: 'WETH', buyToken: 'USDC', amount: '1', fee: 3000,
        },
        {
            sellToken: 'USDC', buyToken: 'WETH', amount: '100', fee: 3000,
        },
        {
            sellToken: 'WETH', buyToken: 'USDT', amount: '1', fee: 3000,
        },
        {
            sellToken: 'DAI', buyToken: 'USDC', amount: '100', fee: 500,
        },
    ];

    before(async () => {
        await redeploy('DFSSell');

        uniWrapper = await redeploy('UniswapWrapperV3');
        kyberWrapper = await redeploy('KyberWrapperV3');
        uniV3Wrapper = await redeploy('UniV3WrapperV3');
        offchainWrapper = await redeploy('ZeroxWrapper');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
        await setNewExchangeWrapper(senderAcc, kyberWrapper.address);
        await setNewExchangeWrapper(senderAcc, uniV3Wrapper.address);

        await setNewExchangeWrapper(senderAcc, offchainWrapper.address);
    });
    it('... should try to sell WETH for DAI with offchain calldata (1inch)', async () => {
        const sellAssetInfo = getAssetInfo('WETH');
        const buyAssetInfo = getAssetInfo('DAI');

        const buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);

        await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
        await approve(sellAssetInfo.address, proxy.address);
        const dfsSellAddr = await getAddrFromRegistry('DFSSell');

        const options = {
            method: 'GET',
            baseURL: 'https://api.1inch.exchange/v3.0/1',
            url: `/swap?fromTokenAddress=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2&toTokenAddress=0x6b175474e89094c44da98b954eedeac495271d0f&amount=1000000000000000000&fromAddress=${proxy.address}&slippage=5&protocols=UNISWAP_V2&disableEstimate=true`,
        };
        const objectResponse = await axios(options).then((response) => response.data);

        // THIS IS CHANGEABLE WITH API INFORMATION
        const allowanceTarget = objectResponse.tx.to;
        const price = 1; // just for testing, anything bigger than 0 triggers offchain if
        const protocolFee = 0;
        const callData = objectResponse.tx.data;

        const exchangeObject = formatExchangeObjForOffchain(
            sellAssetInfo.address,
            buyAssetInfo.address,
            hre.ethers.utils.parseUnits('10', 18),
            offchainWrapper.address,
            allowanceTarget,
            allowanceTarget,
            price,
            protocolFee,
            callData,
        );

        await addToZRXAllowlist(senderAcc, allowanceTarget);
        const sellAction = new dfs.actions.basic.SellAction(
            exchangeObject, senderAcc.address, senderAcc.address,
        );

        const functionData = sellAction.encodeForDsProxyCall()[1];

        await proxy['execute(address,bytes)'](dfsSellAddr, functionData, { gasLimit: 3000000 });

        const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);
        expect(buyBalanceBefore).is.lt(buyBalanceAfter);
    });

    it('... should try to sell WETH for DAI with offchain calldata (Paraswap)', async () => {
        const sellAssetInfo = getAssetInfo('WETH');
        const buyAssetInfo = getAssetInfo('USDC');

        const buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);

        await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
        await approve(sellAssetInfo.address, proxy.address);
        const dfsSellAddr = await getAddrFromRegistry('DFSSell');

        const options = {
            method: 'GET',
            baseURL: 'https://apiv5.paraswap.io',
            url: `/prices?srcToken=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2&srcDecimals=18&destToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&destDecimals=6&amount=1000000000000000000&side=SELL&network=1&includeDEXS=UniswapV3&excludeDEXS=&userAddress=${proxy.address}`,
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
                destAmount: priceObject.destAmount,
                userAddress: proxy.address,
                partner: 'paraswap.io',
                srcDecimals: priceObject.srcDecimals,
                destDecimals: priceObject.destDecimals,
            },
        };
        const resultObject = await axios(secondOptions).then((response) => response.data);

        // THIS IS CHANGEABLE WITH API INFORMATION
        const allowanceTarget = priceObject.tokenTransferProxy;
        const price = 1; // just for testing, anything bigger than 0 triggers offchain if
        const protocolFee = 0;
        const callData = resultObject.data;

        const exchangeObject = formatExchangeObjForOffchain(
            sellAssetInfo.address,
            buyAssetInfo.address,
            hre.ethers.utils.parseUnits('10', 18),
            offchainWrapper.address,
            priceObject.contractAddress,
            allowanceTarget,
            price,
            protocolFee,
            callData,
        );

        await addToZRXAllowlist(senderAcc, priceObject.contractAddress);
        const sellAction = new dfs.actions.basic.SellAction(
            exchangeObject, senderAcc.address, senderAcc.address,
        );

        const functionData = sellAction.encodeForDsProxyCall()[1];

        await proxy['execute(address,bytes)'](dfsSellAddr, functionData, { gasLimit: 3000000 });

        const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

        expect(buyBalanceBefore).is.lt(buyBalanceAfter);
    });

    for (let i = 0; i < trades.length; ++i) {
        const trade = trades[i];

        it(`... should sell ${trade.sellToken} for a ${trade.buyToken}`, async () => {
            const sellAssetInfo = getAssetInfo(trade.sellToken);
            const buyAssetInfo = getAssetInfo(trade.buyToken);

            const buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);

            const amount = trade.amount * 10 ** getAssetInfo(trade.sellToken).decimals;

            await sell(
                proxy,
                sellAssetInfo.address,
                buyAssetInfo.address,
                amount,
                uniWrapper.address,
                senderAcc.address,
                senderAcc.address,
            );

            const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });
    }
    for (let i = 0; i < trades.length; ++i) {
        const trade = trades[i];

        it(`... should sell ${trade.sellToken} for a ${trade.buyToken} on uniswap V3`, async () => {
            const sellAssetInfo = getAssetInfo(trade.sellToken);
            const buyAssetInfo = getAssetInfo(trade.buyToken);

            const buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);

            const amount = trade.amount * 10 ** getAssetInfo(trade.sellToken).decimals;
            await sell(
                proxy,
                sellAssetInfo.address,
                buyAssetInfo.address,
                amount,
                uniV3Wrapper.address,
                senderAcc.address,
                senderAcc.address,
                trade.fee,
            );

            const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });
    }
});
