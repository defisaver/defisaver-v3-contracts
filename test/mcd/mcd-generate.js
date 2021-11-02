const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const {
    balanceOf,
    getProxy,
    redeploy,
    WETH_ADDRESS,
    MIN_VAULT_DAI_AMOUNT,
    fetchAmountinUSDPrice,
} = require('../utils');

const { fetchMakerAddresses, canGenerateDebt } = require('../utils-mcd.js');

const { openMcd, supplyMcd, generateMcd } = require('../actions.js');

describe('Mcd-Generate', function () {
    this.timeout(80000);

    let makerAddresses; let senderAcc; let proxy;

    before(async () => {
        await redeploy('DFSSell');
        await redeploy('McdSupply');
        await redeploy('McdGenerate');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });
    // ETH-B fails often
    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);

        it(`... should generate ${MIN_VAULT_DAI_AMOUNT} DAI for ${ilkData.ilkLabel} vault`, async () => {
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

            const vaultId = await openMcd(proxy, joinAddr);
            const collAmount = hre.ethers.utils.parseUnits(
                fetchAmountinUSDPrice(tokenData.symbol, '30000'),
                tokenData.decimals,
            );

            const from = senderAcc.address;
            const to = senderAcc.address;

            const amountDai = hre.ethers.utils.parseUnits(MIN_VAULT_DAI_AMOUNT, 18);

            const daiBalanceBefore = await balanceOf(makerAddresses.MCD_DAI, from);

            await supplyMcd(proxy, vaultId, collAmount, tokenData.address, joinAddr, from);
            await generateMcd(proxy, vaultId, amountDai, to);
            const daiBalanceAfter = await balanceOf(makerAddresses.MCD_DAI, from);

            expect(daiBalanceBefore.add(amountDai)).to.be.eq(daiBalanceAfter);
        });
    }
});
