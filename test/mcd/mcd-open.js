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
} = require('../utils-mcd');

const {
    openMcd, openVault,
} = require('../actions.js');

describe("Mcd-Open", function() {

    let makerAddresses, senderAcc, proxy, mcdOpenAddr;

    before(async () => {
        await redeploy('McdOpen');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        mcdOpenAddr = await getAddrFromRegistry('McdOpen');
    });

    for (let i = 0; i < 1; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);

        it(`... should open an empty ${ilkData.ilkLabel} Maker vault`, async () => {

            const vaultsBefore = await getVaultsForUser(proxy.address, makerAddresses);
            const numVaultsForUser = vaultsBefore[0].length;

            const openMyVault = new dfs.actions.maker.MakerOpenVaultAction(joinAddr);
            const functionData = openMyVault.encodeForDsProxyCall()[1];

            await proxy['execute(address,bytes)'](mcdOpenAddr, functionData, {gasLimit: 1000000});

            const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);
            const numVaultsForUserAfter = vaultsAfter[0].length;
            const lastVaultIlk = vaultsAfter.ilks[vaultsAfter.ilks.length - 1];

            expect(numVaultsForUser + 1).to.be.eq(numVaultsForUserAfter);
            expect(lastVaultIlk).to.be.eq(ilkData.ilkBytes);
        });
    }

    it(`... should fail to open an Maker vault, because of invalid joinAddr`, async () => {
        const openMyVault = new dfs.actions.maker.MakerOpenVaultAction(nullAddress);

        const McdOpen = await ethers.getContractFactory("McdOpen");
        const functionData = McdOpen.interface.encodeFunctionData(
            "executeActionDirect",
            [openMyVault.encodeForCall()]
        );

        try {
            await proxy['execute(address,bytes)'](mcdOpenAddr, functionData);
            expect(true).to.be.false;
        } catch (err) {
            expect(true).to.be.true;
        }
    });

});
