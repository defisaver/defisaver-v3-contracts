const { expect } = require('chai');
const hre = require('hardhat');
const {
    redeploy,
    getAddrFromRegistry,
    takeSnapshot,
    revertToSnapshot,
} = require('../utils');
const { createSafe, executeSafeTx, SAFE_CONSTANTS } = require('../utils-safe');

describe('ModulePermission', () => {
    let modulePermissionContract;
    let senderAddr;
    let safeAddr;
    let safeInstance;
    let flAddr;
    let snapshotId;

    before(async () => {
        modulePermissionContract = await redeploy('ModulePermission');

        flAddr = await getAddrFromRegistry('FLAction');

        const senderAcc = (await hre.ethers.getSigners())[0];
        senderAddr = senderAcc.address;

        safeAddr = await createSafe(senderAddr);
        console.log('Safe addr: ', safeAddr);
        safeInstance = await hre.ethers.getContractAt('ISafe', safeAddr);
    });

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    const enableSafeModule = async (moduleAddr) => {
        const enableModuleFuncData = modulePermissionContract.interface.encodeFunctionData(
            'enableModule',
            [moduleAddr],
        );
        await executeSafeTx(
            senderAddr,
            safeInstance,
            modulePermissionContract.address,
            enableModuleFuncData,
        );
    };

    const disableSafeModule = async (moduleAddr) => {
        const disableModuleFuncData = modulePermissionContract.interface.encodeFunctionData(
            'disableLastModule',
            [moduleAddr],
        );
        await executeSafeTx(
            senderAddr,
            safeInstance,
            modulePermissionContract.address,
            disableModuleFuncData,
        );
    };

    it('... should enable safe module', async () => {
        await enableSafeModule(flAddr);
        const isModuleEnabled = await safeInstance.isModuleEnabled(flAddr);
        expect(isModuleEnabled).to.be.equal(true);
    });

    it('... should ignore when enabling safe module twice', async () => {
        await enableSafeModule(flAddr);
        await enableSafeModule(flAddr);
    });

    it('... should revert when enabling zero address', async () => {
        const enableModuleFuncData = modulePermissionContract.interface.encodeFunctionData(
            'enableModule',
            [hre.ethers.constants.AddressZero],
        );
        await expect(
            executeSafeTx(
                senderAddr,
                safeInstance,
                modulePermissionContract.address,
                enableModuleFuncData,
            ),
        ).to.be.reverted;
    });

    it('... should revert when enabling sentinel module address', async () => {
        const enableModuleFuncData = modulePermissionContract.interface.encodeFunctionData(
            'enableModule',
            [SAFE_CONSTANTS.SENTINEL_MODULE],
        );
        await expect(
            executeSafeTx(
                senderAddr,
                safeInstance,
                modulePermissionContract.address,
                enableModuleFuncData,
            ),
        ).to.be.reverted;
    });

    it('... should disable last module', async () => {
        await enableSafeModule(flAddr);
        await disableSafeModule(flAddr);
        const isModuleEnabled = await safeInstance.isModuleEnabled(flAddr);
        expect(isModuleEnabled).to.be.equal(false);
    });

    it('... should revert when disabling module that is not enabled', async () => {
        const disableModuleFuncData = modulePermissionContract.interface.encodeFunctionData(
            'disableLastModule',
            [flAddr],
        );
        await expect(
            executeSafeTx(
                senderAddr,
                safeInstance,
                modulePermissionContract.address,
                disableModuleFuncData,
            ),
        ).to.be.reverted;
    });

    it('... should revert when disabling sentinel module address', async () => {
        const disableModuleFuncData = modulePermissionContract.interface.encodeFunctionData(
            'disableLastModule',
            [SAFE_CONSTANTS.SENTINEL_MODULE],
        );
        await expect(
            executeSafeTx(
                senderAddr,
                safeInstance,
                modulePermissionContract.address,
                disableModuleFuncData,
            ),
        ).to.be.reverted;
    });

    it('... test enabling and disabling multiple modules', async () => {
        await enableSafeModule(flAddr);

        const flBalancer = await getAddrFromRegistry('FLBalancer');
        await enableSafeModule(flBalancer);

        await disableSafeModule(flBalancer);

        const isFlEnabled = await safeInstance.isModuleEnabled(flAddr);
        expect(isFlEnabled).to.be.equal(true);

        const isFlBalancerEnabled = await safeInstance.isModuleEnabled(flBalancer);
        expect(isFlBalancerEnabled).to.be.equal(false);
    });

    it('... should revert when not disabling last module in list of enabled modules', async () => {
        await enableSafeModule(flAddr);

        const flBalancer = await getAddrFromRegistry('FLBalancer');
        await enableSafeModule(flBalancer);

        const disableModuleFuncData = modulePermissionContract.interface.encodeFunctionData(
            'disableLastModule',
            [flAddr],
        );
        await expect(
            executeSafeTx(
                senderAddr,
                safeInstance,
                modulePermissionContract.address,
                disableModuleFuncData,
            ),
        ).to.be.reverted;
    });
});
