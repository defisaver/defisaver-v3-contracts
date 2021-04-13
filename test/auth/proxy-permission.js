// const { expect } = require('chai');
const hre = require('hardhat');

const { deployContract } = require('../../scripts/utils/deployer');

const {
    getProxy,
} = require('../utils');

describe('Proxy-Permission', () => {
    let ownerAcc1; let ownerAcc2; let
        proxy; let proxyPermission;

    before(async () => {
        proxyPermission = await deployContract('ProxyPermission');

        ownerAcc1 = (await hre.ethers.getSigners())[0];
        ownerAcc2 = (await hre.ethers.getSigners())[1];

        proxy = await getProxy(ownerAcc1.address);
    });

    it('... should through DSProxy give contract permission', async () => {
        const ProxyPermission = await hre.ethers.getContractFactory('ProxyPermission');
        const functionData = ProxyPermission.interface.encodeFunctionData(
            'givePermission',
            [ownerAcc2.address],
        );

        await proxy['execute(address,bytes)'](proxyPermission.address, functionData, { gasLimit: 1500000 });

        // TODO: check permission
    });

    it('... should through DSProxy remove contract permission', async () => {
        const ProxyPermission = await hre.ethers.getContractFactory('ProxyPermission');
        const functionData = ProxyPermission.interface.encodeFunctionData(
            'removePermission',
            [ownerAcc2.address],
        );

        await proxy['execute(address,bytes)'](proxyPermission.address, functionData, { gasLimit: 1500000 });

        // TODO: check permission
    });
});
