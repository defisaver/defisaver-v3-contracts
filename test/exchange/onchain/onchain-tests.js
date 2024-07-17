/* eslint-disable max-len */
const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const hre = require('hardhat');
require('dotenv-safe').config();
const dfs = require('@defisaver/sdk');
const {
    getProxy,
    redeploy,
    balanceOf,
    setNewExchangeWrapper,
    setBalance,
    resetForkToBlock,
    Float2BN,
    formatExchangeObj,
    BN2Float,
    formatExchangeObjCurve,
    REGISTRY_ADDR,
    addrs,
    placeHolderAddr,
    approve,
    getNetwork,
} = require('../../utils');

const { sell, executeAction } = require('../../actions');

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

// @dev If curve route contains some synthetix tokens, curve order may fail because of deadline
const routeContainsSynthetixTokensThatCanBreakCurveOrder = (exchangeData) => {
    const tokens = [
        '5e74c9036fb86bd7ecdcb084a0673efc32ea31cb', // sETH
        'fe18be6b3bd88a2d2a7f928d00292e7a9963cfc6', // sBTC
        '57Ab1ec28D129707052df4dF418D58a2D46d5f51', // sUSD
    ];
    return tokens.some((t) => exchangeData.toString().includes(t));
};

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

    if (routeContainsSynthetixTokensThatCanBreakCurveOrder(exchangeData)) {
        return -1;
    }

    // eslint-disable-next-line no-unused-vars
    const rate = await dfsPrices.callStatic.getExpectedRate(
        wrapper.address,
        sellAssetInfo.address,
        buyAssetInfo.address,
        amount,
        exchangeData,
    );

    const expectedOutput = amount.mul(rate).div(Float2BN('1'));

    const feeReceiverAmountBefore = await balanceOf(sellAssetInfo.address, addrs[getNetwork()].FEE_RECEIVER);

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
        false,
        true, // sell in recipe so we can check the fee
    );

    const feeReceiverAmountAfter = await balanceOf(sellAssetInfo.address, addrs[getNetwork()].FEE_RECEIVER);

    const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

    // test fee amount
    const tokenGroupRegistry = await hre.ethers.getContractAt('TokenGroupRegistry', addrs[getNetwork()].TOKEN_GROUP_REGISTRY);
    const fee = await tokenGroupRegistry.getFeeForTokens(sellAssetInfo.address, buyAssetInfo.address);
    const feeAmount = amount.div(fee);

    // must be closeTo because 1 wei steth bug
    expect(feeReceiverAmountAfter).to.be.closeTo(feeReceiverAmountBefore.add(feeAmount), '1');

    expect(buyBalanceAfter).is.gt('0');
    if (Math.abs(
        buyBalanceAfter - expectedOutput,
    ) > expectedOutput * 0.01) {
        console.log(`
        Bad liquidity or rate getter:
        Expected: ${+BN2Float(expectedOutput, buyAssetInfo.decimals)}
        Output: ${+BN2Float(buyBalanceAfter, buyAssetInfo.decimals)}
        `);
    }
    return rate;
};

const dfsSellSameAssetTest = async () => {
    describe('Dfs-same asset sell', function () {
        this.timeout(140000);

        let senderAcc;
        let proxy;

        const network = hre.network.config.name;

        before(async () => {
            await redeploy('DFSSell');
            await redeploy('RecipeExecutor');
            await redeploy('PullToken');
            await redeploy('SendToken');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        });

        it('... should try to test how same asset swap works', async () => {
            const amount = hre.ethers.utils.parseUnits('100', 18);
            const daiAddr = addrs[network].DAI_ADDRESS;
            const pullTokenAction = new dfs.actions.basic.PullTokenAction(
                daiAddr,
                senderAcc.address,
                amount.toString(),
            );
            const dfsSellAction = new dfs.actions.basic.SellAction(
                formatExchangeObj(
                    daiAddr,
                    daiAddr,
                    amount.toString(),
                    placeHolderAddr,
                ),
                proxy.address,
                proxy.address,
            );
            const sendTokenAction = new dfs.actions.basic.SendTokenAction(
                daiAddr,
                senderAcc.address,
                '$2',
            );
            const dfsSellSameAssetRecipe = new dfs.Recipe('SameAssetSell', [
                pullTokenAction,
                dfsSellAction,
                sendTokenAction,
            ]);

            await setBalance(daiAddr, senderAcc.address, amount);
            await approve(daiAddr, proxy.address);

            const functionData = dfsSellSameAssetRecipe.encodeForDsProxyCall()[1];
            await executeAction('RecipeExecutor', functionData, proxy);

            const daiBalanceAfter = await balanceOf(daiAddr, senderAcc.address);
            expect(daiBalanceAfter).to.be.eq(amount);
        });
    });
};

const dfsSellTest = async () => {
    describe('Dfs-Sell-onchain', function () {
        this.timeout(400000);

        let senderAcc;
        let proxy;
        let uniWrapper;
        let kyberWrapper;
        let uniV3Wrapper;
        let curveWrapper;
        let dfsPrices;

        before(async () => {
            await resetForkToBlock();
            await redeploy('DFSSell');
            await redeploy('RecipeExecutor');

            dfsPrices = await redeploy('DFSPricesView');
            uniWrapper = await redeploy('UniswapWrapperV3');
            kyberWrapper = await redeploy('KyberWrapperV3');
            uniV3Wrapper = await redeploy('UniV3WrapperV3');
            curveWrapper = await redeploy('CurveWrapperV3');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await setNewExchangeWrapper(senderAcc, uniWrapper.address);
            await setNewExchangeWrapper(senderAcc, kyberWrapper.address);
            await setNewExchangeWrapper(senderAcc, uniV3Wrapper.address);
            await setNewExchangeWrapper(senderAcc, curveWrapper.address);
        });

        for (let i = 0; i < 1; ++i) {
            const trade = trades[i];

            it(`... should sell on Kyber ${trade.sellToken} for ${trade.buyToken}`, async () => {
                const kyberRate = await executeSell(senderAcc, proxy, dfsPrices, trade, kyberWrapper);
                console.log(`Kyber sell rate -> ${kyberRate}`);
            });
            it(`... should sell on Uniswap ${trade.sellToken} for ${trade.buyToken}`, async () => {
                const uniRate = await executeSell(
                    senderAcc, proxy, dfsPrices,
                    { ...trade, fee: 0 },
                    uniWrapper,
                );
                console.log(`Uniswap sell rate -> ${uniRate}`);
            });
            it(`... should sell on UniswapV3 ${trade.sellToken} for ${trade.buyToken}`, async () => {
                const uniV3Rate = await executeSell(senderAcc, proxy, dfsPrices, trade, uniV3Wrapper);
                console.log(`UniswapV3 sell rate -> ${uniV3Rate}`);
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

const onchainExchangeFullTest = async () => {
    await dfsSellTest();
    await dfsSellSameAssetTest();
};

module.exports = {
    onchainExchangeFullTest,
    dfsSellSameAssetTest,
    dfsSellTest,
};
