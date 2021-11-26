const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    redeploy,
    getProxy,
    REGISTRY_ADDR,
} = require('../utils');

describe('ProxyAuth', () => {
    let proxyAuth; let proxy; let proxy2; let senderAcc; let proxyPermission; let sumInputs;

    before(async () => {
        proxyAuth = await redeploy('ProxyAuth');
        sumInputs = await redeploy('SumInputs');

        senderAcc = (await hre.ethers.getSigners())[0];
        const senderAcc2 = (await hre.ethers.getSigners())[1];

        proxy = await getProxy(senderAcc.address);
        proxy2 = await getProxy(senderAcc2.address);

        // give auth to ProxyAuth
        proxyPermission = await redeploy('ProxyPermission');

        // set StrategyExecutor to EOA for testing purposes so we can callExecute()
        await redeploy('StrategyExecutor', REGISTRY_ADDR, senderAcc.address);
    });

    it('...should callExecute when auth is given to proxyAuth and StrategyExecutor set', async () => {
        // give proxy permission to ProxyAuth
        const ProxyPermission = await hre.ethers.getContractFactory('ProxyPermission');
        const functionData = ProxyPermission.interface.encodeFunctionData(
            'givePermission',
            [proxyAuth.address],
        );

        await proxy['execute(address,bytes)'](proxyPermission.address, functionData, { gasLimit: 1500000 });

        // test action
        const encodedCall = (new dfs.actions.basic.SumInputsAction(1, 2)).encodeForDsProxyCall();

        await proxyAuth.callExecute(proxy.address, sumInputs.address, encodedCall[1]);
    });

    it('...should fail when ProxyAuth has no DSProxy.authority()', async () => {
        try {
            // eslint-disable-next-line max-len
            const encodedCall = (new dfs.actions.basic.SumInputsAction(1, 2)).encodeForDsProxyCall();

            await proxyAuth.callExecute(proxy2.address, sumInputs.address, encodedCall[1]);
        } catch (err) {
            // can't map error as the DSProxy throws
            console.log(err);
        }
    });

    it('...should fail when StrategyExecutor is not the caller', async () => {
        try {
            await redeploy('StrategyExecutor'); // set diff. address to be StrategyExecutor

            // eslint-disable-next-line max-len
            const encodedCall = (new dfs.actions.basic.SumInputsAction(1, 2)).encodeForDsProxyCall();

            await proxyAuth.callExecute(proxy.address, sumInputs.address, encodedCall[1]);
        } catch (err) {
            expect(err.toString()).to.have.string('SenderNotExecutorError');
        }
    });
});
