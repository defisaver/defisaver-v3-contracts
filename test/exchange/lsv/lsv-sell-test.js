const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const dfs = require('@defisaver/sdk');
const {
    takeSnapshot, revertToSnapshot, getProxy, resetForkToBlock,
    formatExchangeObj,
    approve,
    depositToWeth,
    redeploy,
    nullAddress,
    setBalance,
} = require('../../utils');
const { executeAction } = require('../../actions');

describe('LsvSell', function () {
    this.timeout(80000);

    const blockThatAcceptsRocketPoolDeposits = 20030817;

    let senderAcc;
    let wallet;
    let snapshotId;

    let from;
    let to;
    let srcToken = getAssetInfo('WETH');
    const srcAmount = hre.ethers.utils.parseEther('1');
    const wrapper = nullAddress;
    const destAmount = 0;
    const uniV3Fee = 0;
    const minPriceExpected = 0; // force stake to be used instead of swap

    before(async () => {
        await resetForkToBlock(blockThatAcceptsRocketPoolDeposits);
        senderAcc = (await hre.ethers.getSigners())[0];
        from = senderAcc.address;
        to = senderAcc.address;
        wallet = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        await redeploy('LSVSell');
    });
    beforeEach(async () => { snapshotId = await takeSnapshot(); });
    afterEach(async () => { await revertToSnapshot(snapshotId); });

    const expectStakeInsteadOfSell = async (tx, destToken) => {
        const txHash = tx.hash;
        const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
        for (let i = 0; i < receipt.logs.length; i++) {
            const log = receipt.logs[i];
            const lsvSellEncoded = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('LSVSell'));
            if (log.topics.length === 2 && log.topics[1] === lsvSellEncoded) {
                const logDataSliced = receipt.logs[i].data.slice(130);
                const decodedData = hre.ethers.utils.defaultAbiCoder.decode(
                    ['address', 'address', 'address', 'uint256', 'uint256', 'uint256', 'bool'],
                    `0x${logDataSliced}`,
                );
                expect(decodedData[1].toLowerCase()).to.be.eq(srcToken.address.toLowerCase());
                expect(decodedData[2].toLowerCase()).to.be.eq(destToken.address.toLowerCase());
                expect(decodedData[3]).to.be.eq(srcAmount);
                expect(decodedData[6]).to.be.eq(false);
                console.log(decodedData);
            }
        }
    };

    const baseTest = async (destToken, isStEth) => {
        srcToken = getAssetInfo(isStEth ? 'STETH' : 'WETH');
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
        if (isStEth) {
            await setBalance(srcToken.address, senderAcc.address, srcAmount);
        } else {
            await depositToWeth(srcAmount, senderAcc);
        }
        await approve(srcToken.address, wallet.address, senderAcc);
        const recipe = new dfs.Recipe('LSVSell-Test-Lido', [sellAction]);
        const functionData = recipe.encodeForDsProxyCall()[1];
        const tx = await executeAction('RecipeExecutor', functionData, wallet);
        expectStakeInsteadOfSell(tx, destToken);
    };

    it('... should deposit WETH on lido if it gives better rate', async () => {
        const destToken = getAssetInfo('wstETH');
        await baseTest(destToken);
    });

    it('... should deposit STETH on lido if it gives better rate', async () => {
        const destToken = getAssetInfo('wstETH');
        await baseTest(destToken, true);
    });

    it('... should deposit WETH on rocket pool if it gives better rate', async () => {
        const destToken = getAssetInfo('rETH');
        await baseTest(destToken);
    });
});
