const { expect } = require("chai");

const { getAssetInfo, ilks, } = require('defisaver-tokens');

const dfs = require('defisaver-sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    nullAddress,
    REGISTRY_ADDR,
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
} = require('../utils-mcd');

const {
    openMcd, openVault,
} = require('../actions.js');

describe("Mcd-Open", function() {

    let makerAddresses, senderAcc, proxy, mcdOpenAddr, mcdView;

    before(async () => {
        await redeploy('McdOpen');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        mcdOpenAddr = await getAddrFromRegistry('McdOpen');
        mcdView = await redeploy('McdView');

    });

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);

        it(`... should open an empty ${ilkData.ilkLabel} Maker vault`, async () => {
            const vaultsBefore = await getVaultsForUser(proxy.address, makerAddresses);
            const numVaultsForUser = vaultsBefore[0].length;

            const vaultId = await openMcd(proxy, makerAddresses, joinAddr);

            const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);
            const numVaultsForUserAfter = vaultsAfter[0].length;
            const lastVaultIlk = vaultsAfter.ilks[vaultsAfter.ilks.length - 1];

            expect(numVaultsForUser + 1).to.be.eq(numVaultsForUserAfter);
            expect(lastVaultIlk).to.be.eq(ilkData.ilkBytes);
        });
    }


    // it(`... should fail to open an Maker vault, because of invalid joinAddr`, async () => {
    //     try {
    //         await openMcd(proxy, makerAddresses, nullAddress);
    //         expect(true).to.be.false;
    //     } catch (err) {
    //         expect(true).to.be.true;
    //     }
    // });

});
