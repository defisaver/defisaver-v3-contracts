const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
} = require('../utils');

const {
    mStableWithdraw,
} = require('../actions.js');

const {
    buyCoinAndSave,
    mUSD,
    imUSD,
    imUSDVault,
} = require('../utils-mstable');

describe('mStable-Withdraw', () => {
    const saveAmount = '10000';

    const stables = [
        'DAI',
        'USDT',
        'USDC',
        'sUSD',
    ];

    let senderAcc;
    let proxy;
    let view;

    before(async () => {
        await redeploy('MStableDeposit');
        await redeploy('MStableWithdraw');
        view = await redeploy('MStableView');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    stables.forEach(
        async (stableCoin) => it(`... should deposit $${saveAmount} worth of ${stableCoin} into Savings Contract then withdraw`, async () => {
            const stableCoinAddr = getAssetInfo(stableCoin).address;

            await buyCoinAndSave(senderAcc, stableCoinAddr, saveAmount, false);
            expect(await balanceOf(imUSD, proxy.address)).to.be.gt(0, 'mStable Save failed');

            await mStableWithdraw(
                proxy,
                stableCoinAddr,
                mUSD,
                imUSD,
                imUSDVault,
                proxy.address,
                hre.ethers.constants.MaxUint256,
                0,
                false,
            );

            expect(await balanceOf(stableCoinAddr, proxy.address)).to.be.gt(0, 'mStable Withdraw failed');
        }),
    );

    stables.forEach(
        async (stableCoin) => it(`... should deposit $${saveAmount} worth of ${stableCoin} into Savings Vault Contract then withdraw`, async () => {
            const stableCoinAddr = getAssetInfo(stableCoin).address;

            await buyCoinAndSave(senderAcc, stableCoinAddr, saveAmount, true);
            expect(await view['rawBalanceOf(address,address)'](imUSDVault, proxy.address)).to.be.gt(0, 'mStable Save to Vault failed');

            await mStableWithdraw(
                proxy,
                stableCoinAddr,
                mUSD,
                imUSD,
                imUSDVault,
                proxy.address,
                hre.ethers.constants.MaxUint256,
                0,
                true,
            );

            expect(await balanceOf(stableCoinAddr, proxy.address)).to.be.gt(0, 'mStable Withdraw from Vault failed');
        }),
    );
});
