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
    timeTravel,
    revertToSnapshot,
    takeSnapshot,
    getAddrFromRegistry,
} = require('../utils');

const {
    mUSD,
    imUSD,
    imUSDVault,
    AssetPair,
    MTA,
} = require('../utils-mstable');

const { mStableDeposit, mStableWithdraw, mStableClaim } = require('../actions');

const mstableDepositTest = async () => {
    describe('mStable-Deposit', () => {
        const saveDollarValue = '10000';

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let view;

        before(async () => {
            const viewAddr = await getAddrFromRegistry('MStableView');
            view = await hre.ethers.getContractAt('MStableView', viewAddr);

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

            it(`... should deposit ${_test.entryAsset.symbol} and get ${_test.exitAsset.symbol}`, async () => {
                const balanceBefore = await _test.toExpect(_test.exitAsset, senderAddr);

                await setBalance(_test.entryAsset.address, senderAddr, amount);
                await approve(_test.entryAsset.address, proxyAddr);
                await mStableDeposit(
                    proxy,
                    _test.entryAsset.address,
                    mUSD,
                    imUSD,
                    imUSDVault,
                    senderAddr,
                    senderAddr,
                    amount,
                    0,
                    _test.assetPair,
                );

                const balanceAfter = await _test.toExpect(_test.exitAsset, senderAddr);
                expect(balanceAfter).to.be.gt(balanceBefore);
            });
        });
    });
};
const mstableWithdrawTest = async () => {
    describe('mStable-Withdraw', () => {
        const saveDollarValue = '10000';

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let view;

        before(async () => {
            const viewAddr = await getAddrFromRegistry('MStableView');
            view = await hre.ethers.getContractAt('MStableView', viewAddr);

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
};
const mstableClaimTest = async () => {
    describe('mStable-Claim', () => {
        const saveAmount = '10000';

        const stables = [
            'DAI',
            'USDT',
            'USDC',
        ];

        let view;
        let vault;
        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;

        before(async () => {
            const viewAddr = await getAddrFromRegistry('MStableView');
            view = await hre.ethers.getContractAt('MStableView', viewAddr);
            vault = await hre.ethers.getContractAt('IBoostedVaultWithLockup', imUSDVault);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
        });

        stables.forEach(
            async (stableCoin) => it(`... should deposit $${saveAmount} worth of ${stableCoin} into Savings Vault Contract then claim rewards`, async () => {
                const snapshotId = await takeSnapshot();

                const { address: stableCoinAddr, decimals } = getAssetInfo(stableCoin);

                const amount = Float2BN(saveAmount, decimals);
                await setBalance(stableCoinAddr, senderAddr, amount);
                await approve(stableCoinAddr, proxyAddr);
                await mStableDeposit(
                    proxy,
                    stableCoinAddr,
                    mUSD,
                    imUSD,
                    imUSDVault,
                    senderAddr,
                    proxyAddr,
                    amount,
                    0,
                    AssetPair.BASSET_IMASSETVAULT,
                );
                expect(await view['rawBalanceOf(address,address)'](imUSDVault, proxy.address)).to.be.gt(0, 'mStable Save to Vault failed');

                await timeTravel(365 * 24 * 2600);
                // updates user reward data
                await vault['pokeBoost(address)'](proxy.address);

                const { amount: unclaimedAmount, first, last } = await view['unclaimedRewards(address,address)'](imUSDVault, proxy.address);

                const mtaBefore = await balanceOf(MTA, proxy.address);
                await mStableClaim(proxy, imUSDVault, proxy.address, first, last);
                const mtaAfter = await balanceOf(MTA, proxy.address);
                const mtaReward = mtaAfter - mtaBefore;

                expect(mtaReward).to.be.gte(0, 'Claim failed');
                console.log(unclaimedAmount, first, last);
                expect(unclaimedAmount).to.be.gt(0, 'View contract not working');

                await revertToSnapshot(snapshotId);
            }),
        );
    });
};
const mStableDeployContracts = async () => {
    await redeploy('MStableView');
    await redeploy('MStableDeposit');
    await redeploy('MStableClaim');
    await redeploy('MStableWithdraw');
};

const mStableFullTest = async () => {
    await mStableDeployContracts();
    await mstableDepositTest();
    await mstableWithdrawTest();
    await mstableClaimTest();
};
module.exports = {
    mstableClaimTest,
    mstableDepositTest,
    mstableWithdrawTest,
    mStableFullTest,
};
