const { expect } = require("chai");

const { getAssetInfo, mcdCollateralAssets, ilkToJoinMap } = require('defisaver-tokens');

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

const encodeMcdOpenAction = (joinAddr) => {
    const abiCoder = new ethers.utils.AbiCoder();

    const encodeActionParams = abiCoder.encode(
        ['address', 'uint8[]'],
        [joinAddr, []]
    );

    return encodeActionParams;
};

describe("Mcd-Open", function() {

    let makerAddresses, senderAcc, proxy, mcdOpenAddr;

    before(async () => {
        await redeploy('McdOpen');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        mcdOpenAddr = await getAddrFromRegistry('McdOpen');
    });

    for (let i = 0; i < mcdCollateralAssets.length; ++i) {
        const tokenData = mcdCollateralAssets[i];

        it(`... should open an empty  ${tokenData.ilkLabel} Maker vault`, async () => {
            const callData = encodeMcdOpenAction(ilkToJoinMap[tokenData.ilk]);

            const vaultsBefore = await getVaultsForUser(proxy.address, makerAddresses);
            const numVaultsForUser = vaultsBefore[0].length;

            const McdOpen = await ethers.getContractFactory("McdOpen");
            const functionData = McdOpen.interface.encodeFunctionData(
                "executeAction",
                 [0, callData, []]
            );
    
            await proxy['execute(address,bytes)'](mcdOpenAddr, functionData);

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
                [0, callData, []]
        );

        try {
            await proxy['execute(address,bytes)'](mcdOpenAddr, functionData);
            expect(true).to.be.false; 
        } catch (err) {
            expect(true).to.be.true; 
        }

    });

});