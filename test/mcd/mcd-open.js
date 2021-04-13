const { expect } = require('chai');
const hre = require('hardhat');

const { ilks } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
} = require('../utils-mcd');

const {
    openMcd,
} = require('../actions.js');

describe('Mcd-Open', () => {
    let makerAddresses; let senderAcc; let proxy;

    before(async () => {
        await redeploy('McdOpen');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;

        it(`... should open an empty ${ilkData.ilkLabel} Maker vault`, async () => {
            const vaultsBefore = await getVaultsForUser(proxy.address, makerAddresses);
            const numVaultsForUser = vaultsBefore[0].length;

            await openMcd(proxy, makerAddresses, joinAddr);

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
