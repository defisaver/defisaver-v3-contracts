const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const axios = require('axios');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
    setNewExchangeWrapper,
    depositToWeth,
    approve,
    formatExchangeObjForOffchain,
    addToZRXAllowlist,
    UNI_ADDR,
    WETH_ADDRESS,
    setBalance,
    fetchAmountinUSDPrice,
    resetForkToBlock,
} = require('../utils');

const {
    sell, executeAction, buy,
} = require('../actions.js');

const dfsSellTest = async () => {
    describe('Dfs-Sell', function () {
        this.timeout(400000);

        let senderAcc; let proxy; let uniWrapper; let
            kyberWrapper; let uniV3Wrapper; let paraswapWrapper;

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
            await resetForkToBlock();
            await redeploy('DFSSell');

            uniWrapper = await redeploy('UniswapWrapperV3');
            kyberWrapper = await redeploy('KyberWrapperV3');
            uniV3Wrapper = await redeploy('UniV3WrapperV3');
            paraswapWrapper = await redeploy('ParaswapWrapper');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            await setNewExchangeWrapper(senderAcc, uniWrapper.address);
            await setNewExchangeWrapper(senderAcc, kyberWrapper.address);
            await setNewExchangeWrapper(senderAcc, uniV3Wrapper.address);

            await setNewExchangeWrapper(senderAcc, paraswapWrapper.address);
        });
        it('... should try to sell WETH for DAI with offchain calldata (Paraswap)', async () => {
            const sellAssetInfo = getAssetInfo('WETH');
            const buyAssetInfo = getAssetInfo('USDC');

            const buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);

            await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
            await approve(sellAssetInfo.address, proxy.address);

            const options = {
                method: 'GET',
                baseURL: 'https://apiv5.paraswap.io',
                url: '/prices?srcToken=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2&srcDecimals=18&destToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&destDecimals=6&amount=1000000000000000000&side=SELL&network=1'
                + '&excludeDEXS=Balancer'
                + '&excludeContractMethods=simpleSwap'
                + `&userAddress=${paraswapWrapper.address}`,
            };
            console.log(options.baseURL + options.url);
            const priceObject = await axios(options).then((response) => response.data.priceRoute);
            console.log(priceObject);
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
            console.log(secondOptions.data);
            const resultObject = await axios(secondOptions).then((response) => response.data);
            console.log(resultObject);
            // THIS IS CHANGEABLE WITH API INFORMATION
            const allowanceTarget = priceObject.tokenTransferProxy;
            const price = 1; // just for testing, anything bigger than 0 triggers offchain if
            const protocolFee = 0;
            const callData = resultObject.data;
            console.log(callData);
            let amountInHex = hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [priceObject.srcAmount]);
            amountInHex = amountInHex.slice(2);
            console.log(amountInHex.toString());
            let offset = callData.toString().indexOf(amountInHex);
            console.log(offset);
            offset = offset / 2 - 1;
            console.log(offset);
            const paraswapSpecialCalldata = hre.ethers.utils.defaultAbiCoder.encode(['(bytes,uint256)'], [[callData, offset]]);

            const exchangeObject = formatExchangeObjForOffchain(
                sellAssetInfo.address,
                buyAssetInfo.address,
                hre.ethers.utils.parseUnits('1', 18),
                paraswapWrapper.address,
                priceObject.contractAddress,
                allowanceTarget,
                price,
                protocolFee,
                paraswapSpecialCalldata,
            );

            await addToZRXAllowlist(senderAcc, priceObject.contractAddress);
            const sellAction = new dfs.actions.basic.SellAction(
                exchangeObject, senderAcc.address, senderAcc.address,
            );

            const functionData = sellAction.encodeForDsProxyCall()[1];

            await executeAction('DFSSell', functionData, proxy);

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
};
const dfsPricesTest = async () => {
    describe('Dfs-Prices', function () {
        this.timeout(140000);

        let senderAcc; let uniWrapper; let
            kyberWrapper; let uniV3Wrapper; let dfsPrices;

        before(async () => {
            uniWrapper = await redeploy('UniswapWrapperV3');
            kyberWrapper = await redeploy('KyberWrapperV3');
            uniV3Wrapper = await redeploy('UniV3WrapperV3');

            dfsPrices = await redeploy('DFSPrices');

            senderAcc = (await hre.ethers.getSigners())[0];

            await setNewExchangeWrapper(senderAcc, uniWrapper.address);
            await setNewExchangeWrapper(senderAcc, kyberWrapper.address);
            await setNewExchangeWrapper(senderAcc, uniV3Wrapper.address);
        });

        it('... should check best price from DFSPrices contract', async () => {
            const abiCoder = new hre.ethers.utils.AbiCoder();
            const REN_ADDR = '0x408e41876cccdc0f92210600ef50372656052a38';

            const amount = hre.ethers.utils.parseUnits('0.3', 18);
            const srcToken = UNI_ADDR;
            const destToken = REN_ADDR;
            const exchangeType = 1; // BUY

            const firstPath = srcToken;
            const secondPath = destToken;

            const kyberRes = await dfsPrices.callStatic.getExpectedRate(
                kyberWrapper.address,
                srcToken,
                destToken,
                amount,
                exchangeType,
                [],
            );

            console.log(`Kyber buy expected rate -> ${kyberRes.toString() / 1e18}`);

            const path = abiCoder.encode(['address[]'], [[firstPath, secondPath]]);
            const uniRes = await dfsPrices.callStatic.getExpectedRate(
                uniWrapper.address,
                srcToken,
                destToken,
                amount,
                exchangeType,
                path,
            );

            console.log(`UniV2 buy expected rate -> ${uniRes.toString() / 1e18}`);

            const additionalData = hre.ethers.utils.solidityPack(['address', 'uint24', 'address', 'uint24', 'address'], [REN_ADDR, 3000, WETH_ADDRESS, 10000, UNI_ADDR]);
            const uniV3Res = await dfsPrices.callStatic.getExpectedRate(
                uniV3Wrapper.address,
                srcToken,
                destToken,
                amount,
                exchangeType,
                additionalData,
            );

            console.log(`UniV3 buy expected rate -> ${uniV3Res.toString() / 1e18}`);
        });
    });
};
const dfsExchangeFullTest = async () => {
    dfsSellTest();
    dfsPricesTest();
};

module.exports = {
    dfsExchangeFullTest,
    dfsSellTest,
    dfsPricesTest,
};
