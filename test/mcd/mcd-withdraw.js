const { expect } = require("chai");

const { getAssetInfo, mcdCollateralAssets, ilkToJoinMap } = require('defisaver-tokens');

const {
    getAddrFromRegistry,
    balanceOf,
    getProxy,
    redeploy,
    standardAmounts,
    MAX_UINT
} = require('../utils');

const {
    fetchMakerAddresses,
} = require('../utils-mcd.js');

const {
    withdrawMcd,
    openVault,
} = require('../actions.js');

const VAULT_DAI_AMOUNT = '140';

describe("Mcd-Withdraw", function() {
    let makerAddresses, senderAcc, proxy;

    before(async () => {
        await redeploy('McdWithdraw');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        this.timeout(40000);
    });

    for (let i = 0; i < mcdCollateralAssets.length; ++i) {
        const tokenData = mcdCollateralAssets[i];
        const joinAddr = ilkToJoinMap[tokenData.ilk];
        let vaultId;

        const withdrawAmount = (standardAmounts[tokenData.symbol] / 10).toString();

        it(`... should withdraw ${withdrawAmount} ${tokenData.symbol} from ${tokenData.ilkLabel} vault`, async () => {
            this.timeout(40000);

            vaultId = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                standardAmounts[tokenData.symbol],
                VAULT_DAI_AMOUNT
            );

            const to = senderAcc.address;
            const amountColl = ethers.utils.parseUnits(withdrawAmount, tokenData.decimals);

            const collBalanceBefore = await balanceOf(tokenData.address, to);

            await withdrawMcd(proxy, vaultId, amountColl, joinAddr, to);

            const collBalanceAfter = await balanceOf(tokenData.address, to);

            expect(collBalanceAfter).to.be.gt(collBalanceBefore);
        });
    }
});