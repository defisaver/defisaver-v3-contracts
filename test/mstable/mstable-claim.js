const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
    timeTravel,
} = require('../utils');

const {
    mStableClaim,
} = require('../actions.js');

const {
    buyCoinAndSave,
    imUSDVault,
    MTA,
} = require('../utils-mstable');

describe('mStable-Claim', () => {
    const saveAmount = '10000';

    const stables = [
        'DAI',
        'USDT',
        'USDC',
        'sUSD',
    ];

    let view;
    let senderAcc;
    let proxy;

    before(async () => {
        await redeploy('MStableDeposit');
        await redeploy('MStableClaim');
        view = await redeploy('MStableView');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    stables.forEach(
        async (stableCoin) => it(`... should deposit $${saveAmount} worth of ${stableCoin} into Savings Vault Contract then claim rewards`, async () => {
            const stableCoinAddr = getAssetInfo(stableCoin).address;

            await buyCoinAndSave(senderAcc, stableCoinAddr, saveAmount, true);
            expect(await view['rawBalanceOf(address,address)'](imUSDVault, proxy.address)).to.be.gt(0, 'mStable Save to Vault failed');

            await timeTravel(365 * 24 * 2600);
            // updates user reward data
            await view['pokeBoost(address,address)'](imUSDVault, proxy.address);

            const { amount, first, last } = await view['unclaimedRewards(address,address)'](imUSDVault, proxy.address);

            const mtaBefore = await balanceOf(MTA, proxy.address);
            await mStableClaim(proxy, imUSDVault, proxy.address, first, last);
            const mtaAfter = await balanceOf(MTA, proxy.address);
            const mtaReward = mtaAfter - mtaBefore;

            expect(mtaReward).to.be.gte(0, 'Claim failed');
            expect(amount).to.be.gt(0, 'View contract not working');
        }),
    );
});
