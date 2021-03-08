
const { expect } = require("chai");

const { getAssetInfo } = require('@defisaver/tokens');

const {
    impersonateAccount,
    stopImpersonatingAccount,
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    nullAddress,
    REGISTRY_ADDR,
    OWNER_ACC
} = require('../utils');

const { deployContract } = require("../../scripts/utils/deployer");

const THREE_HOURS = 3 * 60 * 60;
const TWO_DAYS = 48 * 60 * 60;

describe("DFS-Registry", function() {

    let proxy, registry, senderAcc, senderAcc2, owner, registryByOwner;

    const contractAddr1 = '0x00000000219ab540356cBB839Cbe05303d7705Fa';
    const contractAddr2 = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    const contractAddr3 = '0x71C8dc1d6315a48850E88530d18d3a97505d2065';

    const id1 = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(contractAddr1));
    const id2 = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(contractAddr2));
    const id3 = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(contractAddr3));

    before(async () => {

        this.timeout(40000);

        senderAcc = (await hre.ethers.getSigners())[0];
        senderAcc2 = (await hre.ethers.getSigners())[1];
        proxy = await getProxy(senderAcc.address);
        registry = await deployContract("DFSRegistry");

        owner = await hre.ethers.provider.getSigner(OWNER_ACC);

        registryByOwner = registry.connect(owner);
    
    });

    describe('Testing auth of the functions', async () => {
        it('...should fail to registry if not owner', async () => {
            const registry2 = registry.connect(senderAcc2);

            try {
                await registry2.addNewContract(id1, contractAddr1, 0);
            } catch (err) {
                expect(err.toString()).to.have.string('msg.sender not owner');
            }
        });

        it('...should fail to start contact change if not owner', async () => {
            const registry2 = registry.connect(senderAcc2);

            try {
                await registry2.startContractChange(id1, contractAddr1);
            } catch (err) {
                expect(err.toString()).to.have.string('msg.sender not owner');
            }
        });

        it('...should fail to approve contact change if not owner', async () => {
            const registry2 = registry.connect(senderAcc2);

            try {
                await registry2.approveContractChange(id1);
            } catch (err) {
                expect(err.toString()).to.have.string('msg.sender not owner');
            }
        });

        it('...should fail to cancel contact change if not owner', async () => {
            const registry2 = registry.connect(senderAcc2);

            try {
                await registry2.cancelContractChange(id1);
            } catch (err) {
                expect(err.toString()).to.have.string('msg.sender not owner');
            }
        });

    });

    describe('Testing registry with 0 wait time', async () => {
        it('...should register a new contract with 0 wait time', async () => {
            await impersonateAccount(OWNER_ACC);

            const registryByOwner = registry.connect(owner);
            await registryByOwner.addNewContract(id1, contractAddr1, 0);
    
            const addr = await registry.getAddr(id1);
            expect(addr).to.be.eq(contractAddr1);

        });
    
        it('...should initiate a change for 0 wait time entry', async () => {
            const registryByOwner = registry.connect(owner);

            await registryByOwner.startContractChange(id1, contractAddr1);
            await registryByOwner.approveContractChange(id1);
    
            const addr = await registry.getAddr(id1);
            expect(addr).to.be.eq(contractAddr1);
    
        });
       
        it('...should fail to register same id twice', async () => {
            try {
                const registryByOwner = registry.connect(owner);
                await registryByOwner.addNewContract(id1, contractAddr2, 0);
                expect(true).to.be.false; 
    
            } catch (err) {
                expect(err.toString()).to.have.string('Entry id already exists');
            }

            await stopImpersonatingAccount(OWNER_ACC);

        });
    });

    describe('Testing approval after time has passed', async () => {
        it('...should register a new contract with 3 hours wait time', async () => {
            await impersonateAccount(OWNER_ACC);

            await registryByOwner.addNewContract(id2, contractAddr2, THREE_HOURS);
    
            const addr = await registry.getAddr(id2);
            expect(addr).to.be.eq(contractAddr2);
        });

        it('...should fail to approve it, because not in change process', async () => {
            try {
                await registryByOwner.approveContractChange(id2);
            } catch (err) {
                expect(err.toString()).to.have.string('Entry not in change process');
            }
        });
    
        it('...should initiate a change and approve after 3 hours', async () => {
            await registryByOwner.startContractChange(id2, contractAddr3);
    
            await hre.network.provider.request({
                method: "evm_increaseTime",
                params: [THREE_HOURS],
                id: new Date().getTime()
            });
    
            await registryByOwner.approveContractChange(id2);
    
            const addr = await registry.getAddr(id2);
            expect(addr).to.be.eq(contractAddr3);
        });
    
        it('...should register a new contract with 2 days wait time', async () => {
            await registryByOwner.addNewContract(id3, contractAddr3, TWO_DAYS);
    
            const addr = await registry.getAddr(id3);
            expect(addr).to.be.eq(contractAddr3);
        });
    
        it('...should fail to approve change after one day', async () => {
            await registryByOwner.startContractChange(id3, contractAddr2);
    
            await hre.network.provider.request({
                method: "evm_increaseTime",
                params: [TWO_DAYS / 2],
                id: new Date().getTime()
            });
    
            try {
                await registryByOwner.approveContractChange(id3);
                expect(true).to.be.false; 
    
            } catch (err) {
                expect(err.toString()).to.have.string('Change not ready yet');
            }
        });
    
        it('...should cancel the contract change', async () => {
            await registryByOwner.cancelContractChange(id3);
    
            const entry = await registryByOwner.entries(id3);
            expect(entry.inContractChange).to.be.false;

        });
    });

    describe('Change vote period', async () => {
        it('...should start a change in voting period and approve after 4 days', async () => {
            const newWaitPeriod = TWO_DAYS + TWO_DAYS;
            await registryByOwner.startWaitPeriodChange(id3, newWaitPeriod);

            await hre.network.provider.request({
                method: "evm_increaseTime",
                params: [newWaitPeriod],
                id: new Date().getTime()
            });

            await registryByOwner.approveWaitPeriodChange(id3);

            const entry = await registryByOwner.entries(id3);
            expect(entry.waitPeriod).to.be.eq(newWaitPeriod);

        });

        it('...should fail to start a change in contract address, while wait period change', async () => {
            try {
                const newWaitPeriod = TWO_DAYS + TWO_DAYS;
                await registryByOwner.startWaitPeriodChange(id3, newWaitPeriod);

                await registryByOwner.startContractChange(id3, contractAddr3);
                expect(true).to.be.false; 
            } catch (err) {
                expect(err.toString()).to.have.string("Already in wait period change");
                await registryByOwner.cancelWaitPeriodChange(id3);
            }
        });

        it('...should fail to start a wait period change, while in contract change', async () => {
            try {
                const newWaitPeriod = TWO_DAYS + TWO_DAYS;
                await registryByOwner.startContractChange(id3, contractAddr3);

                await registryByOwner.startWaitPeriodChange(id3, newWaitPeriod);
                expect(true).to.be.false; 
            } catch (err) {
                expect(err.toString()).to.have.string("Already in contract change");
                await registryByOwner.cancelContractChange(id3);
            }
        });

        it('...should fail to approve voting period change, because not enought time has passed', async () => {
            const newWaitPeriod = TWO_DAYS + TWO_DAYS;
            await registryByOwner.startWaitPeriodChange(id3, newWaitPeriod);
    
            await hre.network.provider.request({
                method: "evm_increaseTime",
                params: [TWO_DAYS],
                id: new Date().getTime()
            });
    
            try {
                await registryByOwner.approveWaitPeriodChange(id3);
                expect(true).to.be.false; 
    
            } catch (err) {
                expect(err.toString()).to.have.string('Change not ready yet');
            }
        });

        it('...should start a new period change and cancel it', async () => {
            const newWaitPeriod = TWO_DAYS + TWO_DAYS;
            await registryByOwner.startWaitPeriodChange(id3, newWaitPeriod);

            await registryByOwner.cancelWaitPeriodChange(id3);

            const entry = await registryByOwner.entries(id3);
            expect(entry.inWaitPeriodChange).to.be.false;

            await stopImpersonatingAccount(OWNER_ACC);
        });

    });
  

});