const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const dfs = require('@defisaver/sdk');
const {
    takeSnapshot,
    revertToSnapshot,
    getProxy,
    formatExchangeObj,
    approve,
    depositToWeth,
    redeploy,
    nullAddress,
    setBalance,
    EETH_ADDR,
    ETHER_FI_LIQUIDITY_POOL,
} = require('../../utils/utils');
const { executeAction } = require('../../utils/actions');

describe('LsvSell', function () {
    this.timeout(80000);

    let senderAcc;
    let wallet;
    let snapshotId;

    let from;
    let to;
    const srcAmount = hre.ethers.utils.parseEther('1');
    const wrapper = nullAddress;
    const destAmount = 0;
    const uniV3Fee = 0;
    const minPriceExpected = 0; // force stake to be used instead of swap

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        from = senderAcc.address;
        to = senderAcc.address;
        wallet = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        await redeploy('LSVSell');
    });
    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });
    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    const expectStakeInsteadOfSell = async (tx, srcToken, destToken) => {
        const { logs } = await tx.wait();
        const log = logs.find(
            ({ topics }) =>
                topics[0] === hre.ethers.utils.id('ActionEvent(string,bytes)') &&
                topics[1] === hre.ethers.utils.id('LSVSell'),
        );
        expect(log, 'LSVSell action event').to.exist;
        const { defaultAbiCoder } = hre.ethers.utils;
        const [data] = defaultAbiCoder.decode(['bytes'], log.data);
        const [, src, dest, amount, , , shouldSell] = defaultAbiCoder.decode(
            ['address', 'address', 'address', 'uint256', 'uint256', 'uint256', 'bool'],
            data,
        );
        expect(src.toLowerCase()).to.eq(srcToken.address.toLowerCase());
        expect(dest.toLowerCase()).to.eq(destToken.address.toLowerCase());
        expect(amount).to.eq(srcAmount);
        expect(shouldSell).to.eq(false);
    };

    const getEethTokens = async () => {
        const etherFiPool = await hre.ethers.getContractAt(
            'ILiquidityPool',
            ETHER_FI_LIQUIDITY_POOL,
        );
        await etherFiPool.connect(senderAcc).deposit({ value: srcAmount.mul(2) });
    };

    const baseTest = async (destToken, srcToken) => {
        const exchangeObject = formatExchangeObj(
            srcToken.address,
            destToken.address,
            srcAmount,
            wrapper,
            destAmount,
            uniV3Fee,
            minPriceExpected,
        );
        const sellAction = new dfs.actions.basic.LSVSellAction(exchangeObject, from, to);
        if (srcToken.symbol !== 'WETH') {
            if (srcToken.symbol === 'eETH') {
                await getEethTokens();
            } else {
                await setBalance(srcToken.address, senderAcc.address, srcAmount);
            }
        } else {
            await depositToWeth(srcAmount, senderAcc);
        }
        await approve(srcToken.address, wallet.address, senderAcc);
        const recipe = new dfs.Recipe('LSVSell-Test-Lido', [sellAction]);
        const functionData = recipe.encodeForDsProxyCall()[1];
        const tx = await executeAction('RecipeExecutor', functionData, wallet);
        await expectStakeInsteadOfSell(tx, srcToken, destToken);
    };

    it('... should deposit WETH on lido if it gives better rate', async () => {
        const srcToken = getAssetInfo('WETH');
        const destToken = getAssetInfo('wstETH');
        await baseTest(destToken, srcToken);
    });

    it('... should deposit STETH on lido if it gives better rate', async () => {
        const srcToken = getAssetInfo('stETH');
        const destToken = getAssetInfo('wstETH');
        await baseTest(destToken, srcToken);
    });

    it('... should deposit WETH on ether.fi pool if it gives better rate', async () => {
        const srcToken = getAssetInfo('WETH');
        const destToken = getAssetInfo('weETH');
        await baseTest(destToken, srcToken);
    });

    it('... should deposit eETH on ether.fi pool if it gives better rate', async () => {
        const srcToken = { address: EETH_ADDR, symbol: 'eETH', decimals: 18 };
        const destToken = getAssetInfo('weETH');
        await baseTest(destToken, srcToken);
    });
});
