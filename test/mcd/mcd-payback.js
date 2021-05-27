const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const {
    balanceOf,
    getProxy,
    redeploy,
    MIN_VAULT_DAI_AMOUNT,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
} = require('../utils');

const {
    fetchMakerAddresses,
    canGenerateDebt,
} = require('../utils-mcd.js');

const {
    paybackMcd,
    openVault,
} = require('../actions.js');

const PARTIAL_DAI_AMOUNT = '20';

describe('Mcd-Payback', function () {
    this.timeout(40000);

    let makerAddresses; let senderAcc; let proxy;

    before(async () => {
        await redeploy('McdPayback');
        await redeploy('McdGenerate');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);
        let vaultId;

        it(`... should payback ${PARTIAL_DAI_AMOUNT} DAI for ${ilkData.ilkLabel} vault`, async () => {
            // skip uni tokens
            if (tokenData.symbol.indexOf('UNIV2') !== -1) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            const canGenerate = await canGenerateDebt(ilkData);
            if (!canGenerate) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            vaultId = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                fetchAmountinUSDPrice(tokenData.symbol, '30000'),
                (parseInt(MIN_VAULT_DAI_AMOUNT, 10) + 50).toString(),
            );

            // const ratio = await getRatio(mcdView, vaultId);
            // console.log('ratio: ', ratio.toString());

            const from = senderAcc.address;
            const amountDai = hre.ethers.utils.parseUnits(PARTIAL_DAI_AMOUNT, 18);

            const daiBalanceBefore = await balanceOf(makerAddresses.MCD_DAI, from);

            await paybackMcd(proxy, vaultId, amountDai, from, makerAddresses.MCD_DAI);

            const daiBalanceAfter = await balanceOf(makerAddresses.MCD_DAI, from);

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
