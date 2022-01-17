const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
    timeTravel,
    takeSnapshot,
    revertToSnapshot,
    setBalance,
    approve,
    Float2BN,
} = require('../utils');

const {
    mStableClaim, mStableDeposit,
} = require('../actions.js');

const {
    imUSDVault,
    MTA,
    AssetPair,
    mUSD,
    imUSD,
} = require('../utils-mstable');

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
        await redeploy('MStableDeposit');
        await redeploy('MStableClaim');
        view = await redeploy('MStableView');
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
            expect(unclaimedAmount).to.be.gt(0, 'View contract not working');

            await revertToSnapshot(snapshotId);
        }),
    );
});
