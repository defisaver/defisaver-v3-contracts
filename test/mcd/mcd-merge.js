const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    MIN_VAULT_DAI_AMOUNT,
    WETH_ADDRESS,
} = require('../utils');

const { getVaultInfo } = require('../utils-mcd');

const { openVault, mcdMerge } = require('../actions.js');

describe('Mcd-Merge', () => {
    let senderAcc; let proxy; let mcdView;

    before(async () => {
        await redeploy('McdMerge');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        mcdView = await redeploy('McdView');
    });

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const tokenData = getAssetInfo(ilkData.asset);

        it(`... should merge two ${ilkData.ilkLabel} Maker vaults`, async () => {
            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }
            const vaultId1 = await openVault(
                proxy,
                ilkData.ilkLabel,
                fetchAmountinUSDPrice(tokenData.symbol, '40000'),
                (parseInt(MIN_VAULT_DAI_AMOUNT, 10) + 50).toString(),
            );
            const vaultId2 = await openVault(
                proxy,
                ilkData.ilkLabel,
                fetchAmountinUSDPrice(tokenData.symbol, '40000'),
                (parseInt(MIN_VAULT_DAI_AMOUNT, 10) + 50).toString(),
            );
            const vault1Before = await getVaultInfo(mcdView, vaultId1, ilkData.ilkBytes);
            const vault2Before = await getVaultInfo(mcdView, vaultId2, ilkData.ilkBytes);
            await mcdMerge(proxy, vaultId1, vaultId2);

            const vault2After = await getVaultInfo(mcdView, vaultId2, ilkData.ilkBytes);

            expect(vault2After.debt).to.be.closeTo(vault1Before.debt + vault2Before.debt, 0.0001);
            expect(vault2After.coll).to.be.closeTo(vault1Before.coll + vault2Before.coll, 0.0001);
        }).timeout(50000);
    }
});
