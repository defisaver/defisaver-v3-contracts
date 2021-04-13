const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    WETH_ADDRESS,
    standardAmounts,
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultInfo,
} = require('../utils-mcd.js');

const {
    openMcd,
    supplyMcd,
} = require('../actions.js');

const BigNumber = hre.ethers.BigNumber;

describe('Mcd-Supply', function () {
    this.timeout(80000);

    let makerAddresses; let senderAcc; let proxy; let
        mcdView;

    before(async () => {
        await redeploy('McdSupply');
        makerAddresses = await fetchMakerAddresses();

        mcdView = await redeploy('McdView');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);

        it(`... should supply ${standardAmounts[tokenData.symbol]} ${tokenData.symbol} to a ${ilkData.ilkLabel} vault`, async () => {
            // skip uni tokens
            if (tokenData.symbol.indexOf('UNIV2') !== -1) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            const vaultId = await openMcd(proxy, makerAddresses, joinAddr);
            const amount = BigNumber.from(
                hre.ethers.utils.parseUnits(standardAmounts[tokenData.symbol], tokenData.decimals),
            );

            const from = senderAcc.address;

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            await supplyMcd(proxy, vaultId, amount, tokenData.address, joinAddr, from);

            const info = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);

            expect(standardAmounts[tokenData.symbol]).to.be.eq(info.coll.toString());
        });
    }
});
