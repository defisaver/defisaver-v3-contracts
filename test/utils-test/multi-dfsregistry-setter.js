const { expect } = require('chai');
const hre = require('hardhat');

const {
    impersonateAccount,
    stopImpersonatingAccount,
    getNameId,
    getAddrFromRegistry,
    DAI_ADDR,
    ADMIN_ACC,
    addrs,
    WETH_ADDRESS,
} = require('../utils');

const { deployAsOwner } = require('../../scripts/utils/deployer');

describe('Multi-DFSRegistry-Setter', function () {
    this.timeout(80000);

    let dfsRegistry;
    let multiDFSRegistrySetter;

    // account that is hardcoded and has auth to call multiDFSRegistrySetter
    const callerAddr = '0x76720aC2574631530eC8163e4085d6F98513fb27';

    // example id used in tests (added random so it doesn't fail add if repeated on same node)
    const exampleName = `ExampleName${Math.random().toString()}`;
    const exampleID = getNameId(exampleName);

    const exampleName2 = `ExampleName2${Math.random().toString()}`;
    const exampleID2 = getNameId(exampleName2);

    before(async () => {
        dfsRegistry = await hre.ethers.getContractAt('DFSRegistry', addrs[hre.network.config.name].REGISTRY_ADDR);
        multiDFSRegistrySetter = await deployAsOwner('MultiDFSRegistrySetter');

        // change owner of dfsRegistry
        const adminVaultAddr = await dfsRegistry.adminVault();
        const adminVault = await hre.ethers.getContractAt('AdminVault', adminVaultAddr);
        const adminAcc = await hre.ethers.provider.getSigner(ADMIN_ACC);

        await impersonateAccount(ADMIN_ACC);
        const adminVaultByAdmin = adminVault.connect(adminAcc);

        await adminVaultByAdmin.changeOwner(multiDFSRegistrySetter.address);

        await stopImpersonatingAccount(ADMIN_ACC);
    });

    it('... should fail to call add multiple entries because wrong owner', async () => {
        try {
            await multiDFSRegistrySetter.addMultipleEntries([exampleID], [DAI_ADDR], [0]);

            expect(true).to.be(false);
        } catch (err) {
            expect(err.toString()).to.have.string('Wrong owner');
        }
    });

    it('... should fail to call start multiple contract changes because wrong owner', async () => {
        try {
            await multiDFSRegistrySetter.startMultipleContractChanges([exampleID], [DAI_ADDR]);

            expect(true).to.be(false);
        } catch (err) {
            expect(err.toString()).to.have.string('Wrong owner');
        }
    });

    it('... should fail to call approve multiple contract changes because wrong owner', async () => {
        try {
            await multiDFSRegistrySetter.approveMultipleContractChanges([exampleID]);

            expect(true).to.be(false);
        } catch (err) {
            expect(err.toString()).to.have.string('Wrong owner');
        }
    });

    it('... should call to add multiple entries', async () => {
        await impersonateAccount(callerAddr);

        const callerAcc = await hre.ethers.provider.getSigner(callerAddr);

        multiDFSRegistrySetter = multiDFSRegistrySetter.connect(callerAcc);

        await multiDFSRegistrySetter.addMultipleEntries(
            [exampleID, exampleID2],
            [DAI_ADDR, WETH_ADDRESS],
            [0, 0],
            { gasLimit: 3000000 },
        );

        const addr = await getAddrFromRegistry(exampleName);
        const addr2 = await getAddrFromRegistry(exampleName2);

        expect(addr.toLowerCase()).to.be.eq(DAI_ADDR.toLowerCase());
        expect(addr2.toLowerCase()).to.be.eq(WETH_ADDRESS.toLowerCase());
    });

    it('... should call to start multiple contract changes', async () => {
        const callerAcc = await hre.ethers.provider.getSigner(callerAddr);

        multiDFSRegistrySetter = multiDFSRegistrySetter.connect(callerAcc);

        try {
            await multiDFSRegistrySetter.startMultipleContractChanges(
                [exampleID, exampleID2],
                [WETH_ADDRESS, DAI_ADDR],
                { gasLimit: 3000000 },
            );
            expect(true).to.be.eq(true);
        } catch (err) {
            expect(true).to.be.eq(false);
        }
    });

    it('... should call approve multiple contract changes', async () => {
        const callerAcc = await hre.ethers.provider.getSigner(callerAddr);

        multiDFSRegistrySetter = multiDFSRegistrySetter.connect(callerAcc);

        // eslint-disable-next-line max-len
        await multiDFSRegistrySetter.approveMultipleContractChanges([exampleID, exampleID2], { gasLimit: 3000000 });

        const addr = await getAddrFromRegistry(exampleName);
        const addr2 = await getAddrFromRegistry(exampleName2);

        expect(addr.toLowerCase()).to.be.eq(WETH_ADDRESS.toLowerCase());
        expect(addr2.toLowerCase()).to.be.eq(DAI_ADDR.toLowerCase());
    });

    it('... should fail to call add multiple entries because of arr not equal lengths', async () => {
        await impersonateAccount(callerAddr);

        const callerAcc = await hre.ethers.provider.getSigner(callerAddr);

        multiDFSRegistrySetter = multiDFSRegistrySetter.connect(callerAcc);

        try {
            await multiDFSRegistrySetter.addMultipleEntries(
                [exampleID, exampleID2],
                [DAI_ADDR, WETH_ADDRESS],
                [0],
                { gasLimit: 3000000 },
            );
            expect(true).to.be(false);
        } catch (err) {
            expect(err.toString()).to.have.string('Arr length not eq');
        }
    });

    it('... should fail to call start multiple contract changes because of arr not equal lengths', async () => {
        await impersonateAccount(callerAddr);

        const callerAcc = await hre.ethers.provider.getSigner(callerAddr);

        multiDFSRegistrySetter = multiDFSRegistrySetter.connect(callerAcc);

        try {
            await multiDFSRegistrySetter.startMultipleContractChanges(
                [exampleID, exampleID2],
                [DAI_ADDR],
                { gasLimit: 3000000 },
            );
            expect(true).to.be(false);
        } catch (err) {
            expect(err.toString()).to.have.string('Arr length not eq');
        }
    });
});
