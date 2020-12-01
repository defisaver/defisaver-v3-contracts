const { expect } = require("chai");

const { deployContract } = require("../../scripts/utils/deployer");

const {
    getProxy,
} = require('../utils');

describe("Proxy-Permission", function() {
    let ownerAcc1, ownerAcc2, proxy;

    before(async () => {

        proxyPermission = await deployContract('ProxyPermission');

        ownerAcc1 = (await hre.ethers.getSigners())[0];
        ownerAcc2 = (await hre.ethers.getSigners())[1];

        proxy = await getProxy(ownerAcc1.address);

    });

    it(`... should through DSProxy give contract permission`, async () => {
    
        const ProxyPermission = await ethers.getContractFactory("ProxyPermission");
        const functionData = ProxyPermission.interface.encodeFunctionData(
            "givePermission",
             [ownerAcc2.address]
        );
    
        await proxy['execute(address,bytes)'](proxyPermission.address, functionData, {gasLimit: 1500000});

        // check permission
    });

    it(`... should through DSProxy remove contract permission`, async () => {
        const ProxyPermission = await ethers.getContractFactory("ProxyPermission");
        const functionData = ProxyPermission.interface.encodeFunctionData(
            "removePermission",
             [ownerAcc2.address]
        );
    
        await proxy['execute(address,bytes)'](proxyPermission.address, functionData, {gasLimit: 1500000});

        // check permission

    });

});