const { expect } = require("chai");

const { getAssetInfo, ilks } = require('defisaver-tokens');

const {
    getAddrFromRegistry,
    balanceOf,
    getProxy,
    redeploy,
    standardAmounts,
} = require('../utils');

const {
    fetchMakerAddresses,
} = require('../utils-mcd.js');

const {
    openMcd,
    supplyMcd,
    generateMcd,
} = require('../actions.js');

const DAI_AMOUNT = '100';

describe("Mcd-Generate", function() {
    let makerAddresses, senderAcc, proxy;

    before(async () => {
        await redeploy('McdGenerate');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        this.timeout(40000);
    });

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);

        it(`... should generate ${DAI_AMOUNT} DAI for ${ilkData.ilkLabel} vault`, async () => {
            this.timeout(40000);

            const vaultId = await openMcd(proxy, makerAddresses, joinAddr);
            const collAmount = ethers.utils.parseUnits(standardAmounts[tokenData.symbol], tokenData.decimals);

            const from = senderAcc.address;
            const to = senderAcc.address;

            const amountDai = ethers.utils.parseUnits(DAI_AMOUNT, 18);

            const daiBalanceBefore = await balanceOf(makerAddresses["MCD_DAI"], from);

            await supplyMcd(proxy, tokenData.symbol, tokenData.address, vaultId, collAmount, joinAddr, from);
            await generateMcd(proxy, vaultId, amountDai, to);

            const daiBalanceAfter = await balanceOf(makerAddresses["MCD_DAI"], from);

            expect(daiBalanceBefore.add(amountDai)).to.be.eq(daiBalanceAfter);
        });

    }
});
