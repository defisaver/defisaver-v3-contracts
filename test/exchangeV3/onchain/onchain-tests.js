const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const hre = require('hardhat');
require('dotenv-safe').config();
const dfs = require('@defisaver/sdk');
const {
    getProxy,
    redeploy,
    setupExchangeFork,
    takeSnapshot,
    revertToSnapshot,
    balanceOf,
    setNewExchangeWrapper,
    setBalance,
    Float2BN,
    formatExchangeObj,
    USDT_ADDR,
    ETH_ADDR,
    WETH_ADDRESS,
    nullAddress,
    addrs,
    placeHolderAddr,
    approve,
    network,
} = require('../../utils/utils');

const { executeAction } = require('../../utils/actions');

// Fixed two-hop routes exercise the wrapper without depending on the live route finder.
const curveRoutes = {
    LUSD: {
        via: USDT_ADDR,
        pools: [
            '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46', // tricrypto2
            '0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA', // LUSD/3Crv
        ],
        params: [
            [2, 0, 1, 3, 3],
            [3, 0, 2, 1, 4],
        ],
    },
    STETH: {
        via: ETH_ADDR,
        pools: [WETH_ADDRESS, '0xDC24316b9AE028F1497c275EB9192a3Ea0f67022'],
        params: [
            [0, 0, 8, 0, 0],
            [0, 1, 1, 1, 2],
        ],
    },
};

const encodeCurveRoute = (trade, src, dest) => {
    const forward = trade.sellToken === 'WETH';
    const { via, pools, params } = curveRoutes[forward ? trade.buyToken : trade.sellToken];
    const [first, second] = forward ? pools : [pools[1], pools[0]];
    const steps = forward ? params : params.map(([i, j, ...rest]) => [j, i, ...rest]).reverse();
    return hre.ethers.utils.defaultAbiCoder.encode(
        ['address[11]', 'uint256[5][5]', 'address[5]'],
        [
            [src, first, via, second, dest, ...Array(6).fill(nullAddress)],
            [...steps, ...Array(3).fill([0, 0, 0, 0, 0])],
            Array(5).fill(nullAddress),
        ],
    );
};

const executeSell = async (senderAcc, proxy, dfsPrices, trade, wrapper, isCurve = false) => {
    const sellAssetInfo = getAssetInfo(trade.sellToken);
    const buyAssetInfo = getAssetInfo(trade.buyToken);

    const amount = Float2BN(trade.amount, sellAssetInfo.decimals);

    await setBalance(buyAssetInfo.address, senderAcc.address, Float2BN('0'));
    await setBalance(sellAssetInfo.address, senderAcc.address, amount);

    const exchangeObject = formatExchangeObj(
        sellAssetInfo.address,
        buyAssetInfo.address,
        amount,
        wrapper.address,
        0,
        trade.fee,
    );
    if (isCurve) {
        exchangeObject[8] = encodeCurveRoute(trade, sellAssetInfo.address, buyAssetInfo.address);
    }

    const rate = await dfsPrices.callStatic.getExpectedRate(
        wrapper.address,
        sellAssetInfo.address,
        buyAssetInfo.address,
        amount,
        exchangeObject[8],
    );

    const expectedOutput = amount.mul(rate).div(Float2BN('1'));

    const feeRecipient = await hre.ethers.getContractAt(
        'contracts/utils/fee/FeeRecipient.sol:FeeRecipient',
        addrs[network].FEE_RECIPIENT_ADDR,
    );
    const feeReceiver = await feeRecipient.getFeeAddr();
    const feeReceiverAmountBefore = await balanceOf(sellAssetInfo.address, feeReceiver);

    await approve(sellAssetInfo.address, proxy.address, senderAcc);
    const recipe = new dfs.Recipe('Sell', [
        new dfs.actions.basic.PullTokenAction(sellAssetInfo.address, senderAcc.address, amount),
        new dfs.actions.basic.SellAction(exchangeObject, proxy.address, senderAcc.address),
    ]);
    await executeAction('RecipeExecutor', recipe.encodeForDsProxyCall()[1], proxy);

    const feeReceiverAmountAfter = await balanceOf(sellAssetInfo.address, feeReceiver);

    const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

    // test fee amount
    const tokenGroupRegistry = await hre.ethers.getContractAt(
        'TokenGroupRegistry',
        addrs[network].TOKEN_GROUP_REGISTRY,
    );
    const fee = await tokenGroupRegistry.getFeeForTokens(
        sellAssetInfo.address,
        buyAssetInfo.address,
    );
    const feeAmount = amount.div(fee);

    // must be closeTo because 1 wei steth bug
    expect(feeReceiverAmountAfter).to.be.closeTo(feeReceiverAmountBefore.add(feeAmount), '1');

    expect(rate).to.be.gt(0);
    expect(buyBalanceAfter).to.be.closeTo(expectedOutput, expectedOutput.div(100));
};

const dfsSellSameAssetTest = () => {
    describe('Dfs-same asset sell', function () {
        this.timeout(140000);

        let senderAcc;
        let proxy;

        before(async () => {
            await setupExchangeFork();
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
                formatExchangeObj(daiAddr, daiAddr, amount.toString(), placeHolderAddr),
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

const dfsSellTest = () => {
    describe('Dfs-Sell-onchain', function () {
        this.timeout(400000);

        let senderAcc;
        let proxy;
        let uniWrapper;
        let kyberWrapper;
        let uniV3Wrapper;
        let curveWrapper;
        let dfsPrices;
        let snapshot;

        before(async () => {
            await setupExchangeFork();

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

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        const trade = { sellToken: 'WETH', buyToken: 'DAI', amount: '1' };
        it('sells WETH for DAI on Kyber', async () => {
            await executeSell(senderAcc, proxy, dfsPrices, trade, kyberWrapper);
        });
        it('sells WETH for DAI on Uniswap', async () => {
            await executeSell(senderAcc, proxy, dfsPrices, trade, uniWrapper);
        });
        it('sells WETH for DAI on Uniswap V3', async () => {
            await executeSell(senderAcc, proxy, dfsPrices, { ...trade, fee: 3000 }, uniV3Wrapper);
        });
        for (const token of Object.keys(curveRoutes)) {
            for (const [sellToken, buyToken] of [
                ['WETH', token],
                [token, 'WETH'],
            ]) {
                it(`sells ${sellToken} for ${buyToken} on Curve`, async () => {
                    const amount = sellToken === 'LUSD' ? '3000' : '1';
                    await executeSell(
                        senderAcc,
                        proxy,
                        dfsPrices,
                        { sellToken, buyToken, amount },
                        curveWrapper,
                        true,
                    );
                });
            }
        }
    });
};

const onchainExchangeFullTest = () => {
    dfsSellTest();
    dfsSellSameAssetTest();
};

module.exports = {
    onchainExchangeFullTest,
    dfsSellSameAssetTest,
    dfsSellTest,
};
