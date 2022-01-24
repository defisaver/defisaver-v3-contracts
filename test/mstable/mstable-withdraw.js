const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
    setBalance,
    Float2BN,
    approve,
    fetchAmountinUSDPrice,
} = require('../utils');

const {
    mUSD,
    imUSD,
    imUSDVault,
    AssetPair,
} = require('../utils-mstable');

const { mStableDeposit, mStableWithdraw } = require('../actions');

describe('mStable-Withdraw', () => {
    const saveDollarValue = '10000';

    let senderAcc; let senderAddr;
    let proxy; let proxyAddr;
    let view;

    before(async () => {
        await redeploy('MStableDeposit');
        await redeploy('MStableWithdraw');
        view = await redeploy('MStableView');

        senderAcc = (await hre.ethers.getSigners())[0];
        senderAddr = senderAcc.address;
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;
    });

    const stablecoinDepositTests = (stablecoin) => [
        {
            entryAsset: getAssetInfo(stablecoin),
            exitAsset: getAssetInfo('mUSD'),
            assetPair: AssetPair.BASSET_MASSET,
            toExpect: async (exitAsset, userAddr) => balanceOf(exitAsset.address, userAddr),
        },
        {
            entryAsset: getAssetInfo(stablecoin),
            exitAsset: getAssetInfo('imUSD'),
            assetPair: AssetPair.BASSET_IMASSET,
            toExpect: async (exitAsset, userAddr) => balanceOf(exitAsset.address, userAddr),
        },
        {
            entryAsset: getAssetInfo(stablecoin),
            exitAsset: {
                address: '0x78BefCa7de27d07DC6e71da295Cc2946681A6c7B',
                symbol: 'imUSDVault',
            },
            assetPair: AssetPair.BASSET_IMASSETVAULT,
            toExpect: async (exitAsset, userAddr) => view['rawBalanceOf(address,address)'](exitAsset.address, userAddr),
        },
    ];

    const stables = [
        'DAI',
        'USDC',
        'USDT',
    ];

    const tests = [
        ...stables.map((stablecoin) => stablecoinDepositTests(stablecoin)).reduce(
            (running, testGroup) => [...running, ...testGroup],
        ),
        {
            entryAsset: getAssetInfo('mUSD'),
            exitAsset: getAssetInfo('imUSD'),
            assetPair: AssetPair.MASSET_IMASSET,
            toExpect: async (exitAsset, userAddr) => balanceOf(exitAsset.address, userAddr),
        },
        {
            entryAsset: getAssetInfo('mUSD'),
            exitAsset: {
                address: '0x78BefCa7de27d07DC6e71da295Cc2946681A6c7B',
                symbol: 'imUSDVault',
            },
            assetPair: AssetPair.MASSET_IMASSETVAULT,
            toExpect: async (exitAsset, userAddr) => view['rawBalanceOf(address,address)'](exitAsset.address, userAddr),
        },
        {
            entryAsset: getAssetInfo('imUSD'),
            exitAsset: {
                address: '0x78BefCa7de27d07DC6e71da295Cc2946681A6c7B',
                symbol: 'imUSDVault',
            },
            assetPair: AssetPair.IMASSET_IMASSETVAULT,
            toExpect: async (exitAsset, userAddr) => view['rawBalanceOf(address,address)'](exitAsset.address, userAddr),
        },
    ];

    tests.forEach(async (_test) => {
        const amount = Float2BN(
            fetchAmountinUSDPrice(
                _test.entryAsset.symbol,
                saveDollarValue,
            ), _test.entryAsset.decimals,
        );

        it(`... should deposit ${_test.entryAsset.symbol} and get ${_test.exitAsset.symbol} then withdraw`, async () => {
            const isVaultOperation = (
                _test.exitAsset.address.toLowerCase() === imUSDVault.toLowerCase()
            );
            const recipient = isVaultOperation ? proxyAddr : senderAddr;
            const balanceBefore = await _test.toExpect(_test.exitAsset, recipient);

            await setBalance(_test.entryAsset.address, senderAddr, amount);
            await approve(_test.entryAsset.address, proxyAddr);
            await mStableDeposit(
                proxy,
                _test.entryAsset.address,
                mUSD,
                imUSD,
                imUSDVault,
                senderAddr,
                recipient,
                amount,
                0,
                _test.assetPair,
            );

            let balanceAfter = await _test.toExpect(_test.exitAsset, recipient);
            expect(balanceAfter).to.be.gt(balanceBefore);

            if (!isVaultOperation) await approve(_test.exitAsset.address, proxyAddr);
            await mStableWithdraw(
                proxy,
                _test.entryAsset.address,
                mUSD,
                imUSD,
                imUSDVault,
                recipient,
                senderAddr,
                balanceAfter,
                0,
                _test.assetPair,
            );

            balanceAfter = await _test.toExpect(_test.exitAsset, recipient);
            expect(balanceAfter).to.be.eq(balanceBefore);
        });
    });
});
