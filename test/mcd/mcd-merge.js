const { expect } = require("chai");

const { getAssetInfo, ilks } = require("defisaver-tokens");

const {
    getProxy,
    redeploy,
    standardAmounts,
} = require("../utils");

const { fetchMakerAddresses, getVaultInfo } = require("../utils-mcd");

const { openVault, mcdMerge } = require("../actions.js");

const VAULT_DAI_AMOUNT = '530';

describe("Mcd-Merge", function () {
    let makerAddresses, senderAcc, proxy, mcdView, mcdManager;

    before(async () => {
        await redeploy("McdMerge");

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

       mcdView = await redeploy("McdView");
    });

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);

        it(`... should merge two ${ilkData.ilkLabel} Maker vaults`, async () => {

            const vaultId1 = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                standardAmounts[tokenData.symbol],
                VAULT_DAI_AMOUNT
            );

            const vaultId2 = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                standardAmounts[tokenData.symbol],
                VAULT_DAI_AMOUNT
            );

            const vault1Before = await getVaultInfo(mcdView, vaultId1, ilkData.ilkBytes);
            const vault2Before = await getVaultInfo(mcdView, vaultId2, ilkData.ilkBytes);

            await mcdMerge(proxy, vaultId1, vaultId2);

            const vault2After = await getVaultInfo(mcdView, vaultId2, ilkData.ilkBytes);

            expect(vault2After.debt).to.be.eq(vault1Before.debt + vault2Before.debt);
            expect(vault2After.coll).to.be.eq(vault1Before.coll + vault2Before.coll);
        });

    }

});
