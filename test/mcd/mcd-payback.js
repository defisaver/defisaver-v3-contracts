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
    openMcd,
    supplyMcd,
    generateMcd,
    paybackMcd,
    openVault,
} = require('../actions.js');

const VAULT_DAI_AMOUNT = '140';
const PARTIAL_DAI_AMOUNT = '20';

describe("Mcd-Payback", function() {
    let makerAddresses, senderAcc, proxy;

    before(async () => {
        await redeploy('McdPayback');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        this.timeout(40000);
    });

    for (let i = 0; i < mcdCollateralAssets.length; ++i) {
        const tokenData = mcdCollateralAssets[i];
        const joinAddr = ilkToJoinMap[tokenData.ilk];
        let vaultId;

        it(`... should payback ${PARTIAL_DAI_AMOUNT} DAI for ${tokenData.ilkLabel} vault`, async () => {
            this.timeout(40000);

            vaultId = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                standardAmounts[tokenData.symbol],
                VAULT_DAI_AMOUNT
            );

            const from = senderAcc.address;
            const amountDai = ethers.utils.parseUnits(PARTIAL_DAI_AMOUNT, 18);

            const daiBalanceBefore = await balanceOf(makerAddresses["MCD_DAI"], from);

            await paybackMcd(proxy, vaultId, amountDai, from);

            const daiBalanceAfter = await balanceOf(makerAddresses["MCD_DAI"], from);

            expect(daiBalanceBefore.sub(amountDai)).to.be.eq(daiBalanceAfter);
        });

        it(`... should payback whole debt for ${tokenData.ilkLabel} vault`, async () => {
            this.timeout(40000);

            const from = senderAcc.address;
            const amountDai = ethers.utils.parseUnits('200000', 18);

            await paybackMcd(proxy, vaultId, amountDai, from);

            // expect(daiBalanceBefore.sub(amountDai)).to.be.eq(daiBalanceAfter);
        });

    }
});