const { expect } = require("chai");

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const {
    getAddrFromRegistry,
    balanceOf,
    getProxy,
    redeploy,
    standardAmounts,
    MAX_UINT,
    MIN_VAULT_DAI_AMOUNT,
    WETH_ADDRESS
} = require('../utils');

const {
    fetchMakerAddresses,
    getRatio,
    canGenerateDebt,
} = require('../utils-mcd.js');

const {
    openMcd,
    supplyMcd,
    generateMcd,
    paybackMcd,
    openVault,
} = require('../actions.js');

const PARTIAL_DAI_AMOUNT = '20';

describe("Mcd-Payback", function() {
    this.timeout(40000);

    let makerAddresses, senderAcc, proxy, mcdView;

    before(async () => {
        await redeploy('McdPayback');
        await redeploy('McdGenerate');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        mcdView = await redeploy('McdView');

    });

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);
        let vaultId;

        it(`... should payback ${PARTIAL_DAI_AMOUNT} DAI for ${ilkData.ilkLabel} vault`, async () => {
             // skip uni tokens
             if (tokenData.symbol.indexOf("UNIV2") !== -1) {
                expect(true).to.be.true;
                return;
            }

            const canGenerate = await canGenerateDebt(ilkData);
            if (!canGenerate) {
                expect(true).to.be.true;
                return;
            }

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            console.log((standardAmounts[tokenData.symbol] * 2.5).toString(),
            (parseInt(MIN_VAULT_DAI_AMOUNT) + 50).toString());

            vaultId = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                (standardAmounts[tokenData.symbol] * 2.5).toString(),
                (parseInt(MIN_VAULT_DAI_AMOUNT) + 50).toString()
            );

            // const ratio = await getRatio(mcdView, vaultId);
            // console.log('ratio: ', ratio.toString());

            const from = senderAcc.address;
            const amountDai = ethers.utils.parseUnits(PARTIAL_DAI_AMOUNT, 18);

            const daiBalanceBefore = await balanceOf(makerAddresses["MCD_DAI"], from);

            console.log('daiBalanceBefore: ', daiBalanceBefore / 1e18);

            await paybackMcd(proxy, vaultId, amountDai, from, makerAddresses["MCD_DAI"]);

            const daiBalanceAfter = await balanceOf(makerAddresses["MCD_DAI"], from);

            expect(daiBalanceBefore.sub(amountDai)).to.be.eq(daiBalanceAfter);
        });

        // it(`... should payback whole debt for ${ilkData.ilkLabel} vault`, async () => {

        //     const from = senderAcc.address;
        //     const amountDai = ethers.utils.parseUnits('200000', 18);

        //     await paybackMcd(proxy, vaultId, amountDai, from, makerAddresses["MCD_DAI"]);

        //     // expect(daiBalanceBefore.sub(amountDai)).to.be.eq(daiBalanceAfter);
        // });

    }
});
