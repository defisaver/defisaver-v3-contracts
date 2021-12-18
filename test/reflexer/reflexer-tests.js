/* eslint-disable no-await-in-loop */
const { expect } = require('chai');
const hre = require('hardhat');
const { reflexerOpen } = require('../actions');
const {
    redeploy, getProxy, LOGGER_ADDR, takeSnapshot, revertToSnapshot, getAddrFromRegistry,
} = require('../utils');
const {
    safeCount, lastSafeID, getSafeInfo, ADAPTER_ADDRESS,
} = require('../utils-reflexer');

const reflexerOpenTest = async () => {
    describe('Reflexer-Open', () => {
        let senderAcc; let proxy; let reflexerView; let logger; let reflexerViewAddr;

        before(async () => {
            reflexerViewAddr = await getAddrFromRegistry('ReflexerView');
            reflexerView = await hre.ethers.getContractAt('ReflexerView', reflexerViewAddr);
            logger = await hre.ethers.getContractAt('DefisaverLogger', LOGGER_ADDR);
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should open 5 empty Reflexer Safes', async () => {
            const snapshot = await takeSnapshot();
            let safeCountBefore = await safeCount(proxy.address);
            for (let i = 0; i < 5; i++) {
                await reflexerOpen(proxy, ADAPTER_ADDRESS);
                const safeCountAfter = await safeCount(proxy.address);
                expect(safeCountAfter - 1).to.be.equal(safeCountBefore);
                safeCountBefore = safeCountAfter;

                const safeID = await lastSafeID(proxy.address);
                const info = await getSafeInfo(reflexerView, safeID);
                expect(info.coll.toNumber()).to.be.equal(0);
                expect(info.debt.toNumber()).to.be.equal(0);
            }
            revertToSnapshot(snapshot);
        }).timeout(50000);

        it('... should log every event', async () => {
            const snapshot = await takeSnapshot();
            await expect(reflexerOpen(proxy, ADAPTER_ADDRESS))
                .to.emit(logger, 'LogEvent');
            revertToSnapshot(snapshot);
        }).timeout(10000);
    });
};

const reflexerDeployContracts = async () => {
    await redeploy('ReflexerOpen');
    await redeploy('ReflexerView');
};

const reflexerFullTest = async () => {
    await reflexerDeployContracts();

    await reflexerOpenTest();
};

module.exports = {
    reflexerOpenTest,
    reflexerFullTest,
    reflexerDeployContracts,
};
