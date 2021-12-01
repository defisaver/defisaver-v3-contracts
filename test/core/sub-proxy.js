const { expect } = require('chai');
const hre = require('hardhat');

const {
    redeploy,
    getProxy,
} = require('../utils');

const { getSubHash } = require('../utils-strategies');

// this just a proxy contract implementation already tested in SubStore (so just basic tests)
describe('SubProxy', () => {
    let subProxy;
    let senderAcc;
    let strategyStorage;
    let subStorage;
    let proxy;

    before(async () => {
        subProxy = await redeploy('SubProxy');
        subStorage = await redeploy('SubStorage');
        strategyStorage = await redeploy('StrategyStorage');

        await strategyStorage.createStrategy('TestStrategy', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
        await strategyStorage.createStrategy('TestStrategy2', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);

        senderAcc = (await hre.ethers.getSigners())[0];

        proxy = await getProxy(senderAcc.address);
    });

    it('...should add a new subscription', async () => {
        const subData = [0, false, [], []];
        const subDataHash = getSubHash(subData);

        const functionData = subProxy.interface.encodeFunctionData('subscribeToStrategy', [subData]);

        await proxy['execute(address,bytes)'](subProxy.address, functionData, {
            gasLimit: 5000000,
        });

        const numSubs = await subStorage.getSubsCount();

        expect(numSubs).to.be.eq(1);
        const storedSub = await subStorage.getSub(0);
        expect(storedSub.strategySubHash).to.be.eq(subDataHash);
    });

    it('...should update the new subscription', async () => {
        const updatedSubData = [1, false, [], []];

        const subDataHash = getSubHash(updatedSubData);

        const functionData = subProxy.interface.encodeFunctionData('updateSubData', [0, updatedSubData]);

        await proxy['execute(address,bytes)'](subProxy.address, functionData, {
            gasLimit: 5000000,
        });

        const storedSub = await subStorage.getSub(0);
        expect(storedSub.strategySubHash).to.be.eq(subDataHash);
    });

    it('...should deactivate users sub', async () => {
        const functionData = subProxy.interface.encodeFunctionData('deactivateSub', [0]);

        await proxy['execute(address,bytes)'](subProxy.address, functionData, {
            gasLimit: 5000000,
        });

        const storedSub = await subStorage.getSub(0);
        expect(storedSub.isEnabled).to.be.eq(false);
    });

    it('...should activate users sub', async () => {
        const functionData = subProxy.interface.encodeFunctionData('activateSub', [0]);

        await proxy['execute(address,bytes)'](subProxy.address, functionData, {
            gasLimit: 5000000,
        });

        const storedSub = await subStorage.getSub(0);
        expect(storedSub.isEnabled).to.be.eq(true);
    });
});
