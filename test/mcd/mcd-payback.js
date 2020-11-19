const { expect } = require("chai");

const { getAssetInfo, ilks } = require('defisaver-tokens');

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

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);
        let vaultId;

        it(`... should payback ${PARTIAL_DAI_AMOUNT} DAI for ${ilkData.ilkLabel} vault`, async () => {
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

            await paybackMcd(proxy, vaultId, amountDai, from, makerAddresses["MCD_DAI"]);

            const daiBalanceAfter = await balanceOf(makerAddresses["MCD_DAI"], from);

            expect(daiBalanceBefore.sub(amountDai)).to.be.eq(daiBalanceAfter);
        });

        it(`... should payback whole debt for ${ilkData.ilkLabel} vault`, async () => {
            this.timeout(40000);

            const from = senderAcc.address;
            const amountDai = ethers.utils.parseUnits('200000', 18);

            await paybackMcd(proxy, vaultId, amountDai, from, makerAddresses["MCD_DAI"]);

            // expect(daiBalanceBefore.sub(amountDai)).to.be.eq(daiBalanceAfter);
        });

    }
});
