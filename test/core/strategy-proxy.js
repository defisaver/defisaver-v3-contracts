const { expect } = require('chai');
const hre = require('hardhat');

const {
    redeploy,
    getProxy,
} = require('../utils');

describe('StrategyProxy', () => {
    let strategyStorage;
    let bundleStorage;
    let senderAcc;
    let strategyProxy;
    let proxy;

    before(async () => {
        strategyProxy = await redeploy('StrategyProxy');
        strategyStorage = await redeploy('StrategyStorage');
        bundleStorage = await redeploy('BundleStorage');

        senderAcc = (await hre.ethers.getSigners())[0];

        proxy = await getProxy(senderAcc.address);
    });

    it('...should create a new strategy ', async () => {
        const functionData = strategyProxy.interface.encodeFunctionData('createStrategy', [
            'TestStrategy', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true,
        ]);

        await proxy['execute(address,bytes)'](strategyProxy.address, functionData, {
            gasLimit: 5000000,
        });

        const numStrategies = await strategyStorage.getStrategyCount();

        expect(numStrategies).to.be.eq(1);
    });

    it('...should create a another new strategy ', async () => {
        const functionData = strategyProxy.interface.encodeFunctionData('createStrategy', [
            'TestStrategy2', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true,
        ]);

        await proxy['execute(address,bytes)'](strategyProxy.address, functionData, {
            gasLimit: 5000000,
        });

        const numStrategies = await strategyStorage.getStrategyCount();

        expect(numStrategies).to.be.eq(2);
    });

    it('...should registry a new bundle ', async () => {
        const functionData = strategyProxy.interface.encodeFunctionData('createBundle', [[0, 1]]);

        await proxy['execute(address,bytes)'](strategyProxy.address, functionData, {
            gasLimit: 5000000,
        });

        const numBundles = await bundleStorage.getBundleCount();

        expect(numBundles).to.be.eq(1);
    });
});
