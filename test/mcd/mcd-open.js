const { expect } = require("chai");

const { getAssetInfo, ilks, } = require('defisaver-tokens');

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
    openMcd,
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

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);

        it(`... should open an empty ${ilkData.ilkLabel} Maker vault`, async () => {
            const vaultsBefore = await getVaultsForUser(proxy.address, makerAddresses);
            const numVaultsForUser = vaultsBefore[0].length;

            await openMcd(proxy, makerAddresses, joinAddr);

            const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);
            const numVaultsForUserAfter = vaultsAfter[0].length;
            const lastVaultIlk = vaultsAfter.ilks[vaultsAfter.ilks.length - 1];

            expect(numVaultsForUser + 1).to.be.eq(numVaultsForUserAfter);
            expect(lastVaultIlk).to.be.eq(tokenData.ilk);
        });
    }

    it(`... should fail to open an Maker vault, because of invalid joinAddr`, async () => {
        const callData = encodeMcdOpenAction(nullAddress);

        const McdOpen = await ethers.getContractFactory("McdOpen");
        const functionData = McdOpen.interface.encodeFunctionData(
            "executeAction",
                [[callData], [], [0], []]
        );

        try {
            await proxy['execute(address,bytes)'](mcdOpenAddr, functionData);
            expect(true).to.be.false;
        } catch (err) {
            expect(true).to.be.true;
        }
    });

});
