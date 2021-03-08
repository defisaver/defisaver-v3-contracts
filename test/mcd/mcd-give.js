const { expect } = require("chai");

const { ilks } = require("@defisaver/tokens");

const {
    getProxy,
    redeploy,
} = require("../utils");

const { fetchMakerAddresses, MCD_MANAGER_ADDR } = require("../utils-mcd");

const { openMcd, mcdGive } = require("../actions.js");

describe("Mcd-Give", function () {
    let makerAddresses, senderAcc, secondAcc, thirdAcc, proxy, mcdView, mcdManager;

    before(async () => {
        await redeploy("McdGive");

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        secondAcc = (await hre.ethers.getSigners())[1];
        thirdAcc = (await hre.ethers.getSigners())[2];
        proxy = await getProxy(senderAcc.address);

        mcdView = await redeploy("McdView");

        mcdManager = await hre.ethers.getContractAt("IManager", MCD_MANAGER_ADDR);
    });

    it(`... should give a cdp to another proxy`, async () => {
        const { join } = ilks[0];

        const vaultId = await openMcd(proxy, makerAddresses, join);

        const secondProxy = await getProxy(secondAcc.address);
        const createProxy = false;

        await mcdGive(proxy, vaultId, secondProxy, createProxy);

        const ownerAfter = await mcdManager.owns(vaultId);

        expect(ownerAfter).to.be.eq(secondProxy.address);
    });

    it(`... should give a cdp to an address and proxy should be created for it`, async () => {
        const { join } = ilks[0];

        const vaultId = await openMcd(proxy, makerAddresses, join);

        const createProxy = true;

        await mcdGive(proxy, vaultId, thirdAcc, createProxy);

        const ownerAfter = await mcdManager.owns(vaultId);

        const thirdProxy = await getProxy(thirdAcc.address);

        expect(ownerAfter).to.be.eq(thirdProxy.address);
    });
});
