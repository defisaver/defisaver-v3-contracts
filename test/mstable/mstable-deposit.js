const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
} = require('../utils');

const {
    buyCoinAndSave,
    imUSD,
    imUSDVault,
} = require('../utils-mstable');

describe('mStable-Deposit', () => {
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
        view = await redeploy('MStableView');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    stables.forEach(
        async (stableCoin) => it(`... should deposit $${saveAmount} worth of ${stableCoin} into Savings Contract`, async () => {
            const stableCoinAddr = getAssetInfo(stableCoin).address;

            await buyCoinAndSave(senderAcc, stableCoinAddr, saveAmount, false);
            expect(await balanceOf(imUSD, proxy.address)).to.be.gt(0, 'mStable Save failed');
        }),
    );

    stables.forEach(
        async (stableCoin) => it(`... should deposit $${saveAmount} worth of ${stableCoin} into Savings Vault Contract`, async () => {
            const stableCoinAddr = getAssetInfo(stableCoin).address;

            await buyCoinAndSave(senderAcc, stableCoinAddr, saveAmount, true);
            expect(await view['rawBalanceOf(address,address)'](imUSDVault, proxy.address)).to.be.gt(0, 'mStable Save to Vault failed');
        }),
    );
});
