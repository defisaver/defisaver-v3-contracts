
const { expect } = require("chai");

const { getAssetInfo } = require('defisaver-tokens');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    nullAddress,
    REGISTRY_ADDR,
} = require('../utils');

const { deployContract } = require("../../scripts/utils/deployer");

const THREE_HOURS = 3 * 60 * 60;
const TWO_DAYS = 48 * 60 * 60;

describe("DFS-Registry", function() {

    let proxy, registry, senderAcc, senderAcc2;

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
            await registry.addNewContract(id1, contractAddr1, 0);
    
            const addr = await registry.getAddr(id1);
            expect(addr).to.be.eq(contractAddr1);
        });
    
        it('...should initiate a change for 0 wait time entry', async () => {
            await registry.startContractChange(id1, contractAddr1);
    
            await registry.approveContractChange(id1);
    
            const addr = await registry.getAddr(id1);
            expect(addr).to.be.eq(contractAddr1);
    
        });
       
        it('...should fail to register same id twice', async () => {
            try {
                await registry.addNewContract(id1, contractAddr2, 0);
                expect(true).to.be.false; 
    
            } catch (err) {
                expect(err.toString()).to.have.string('Entry id already exists');
            }
        });
    });

    describe('Testing approval after time has passed', async () => {
        it('...should register a new contract with 3 hours wait time', async () => {
            await registry.addNewContract(id2, contractAddr2, THREE_HOURS);
    
            const addr = await registry.getAddr(id2);
            expect(addr).to.be.eq(contractAddr2);
        });

        it('...should fail to approve it, because not in change process', async () => {
            try {
                await registry.approveContractChange(id2);
            } catch (err) {
                expect(err.toString()).to.have.string('Entry not in change process');
            }
        });
    
        it('...should initiate a change and approve after 3 hours', async () => {
            await registry.startContractChange(id2, contractAddr3);
    
            await hre.network.provider.request({
                method: "evm_increaseTime",
                params: [THREE_HOURS],
                id: new Date().getTime()
            });
    
            await registry.approveContractChange(id2);
    
            const addr = await registry.getAddr(id2);
            expect(addr).to.be.eq(contractAddr3);
        });
    
        it('...should register a new contract with 2 days wait time', async () => {
            await registry.addNewContract(id3, contractAddr3, TWO_DAYS);
    
            const addr = await registry.getAddr(id3);
            expect(addr).to.be.eq(contractAddr3);
        });
    
        it('...should fail to approve change after one day', async () => {
            await registry.startContractChange(id3, contractAddr2);
    
            await hre.network.provider.request({
                method: "evm_increaseTime",
                params: [TWO_DAYS / 2],
                id: new Date().getTime()
            });
    
            try {
                await registry.approveContractChange(id3);
                expect(true).to.be.false; 
    
            } catch (err) {
                expect(err.toString()).to.have.string('Change not ready yet');
            }
        });
    
        it('...should cancel the contract change', async () => {
            await registry.cancelContractChange(id3);
    
            const entry = await registry.entries(id3);
            expect(entry.inChange).to.be.false;
        });
    });

    describe('Change vote period', async () => {
        it('...should change voting period from 2 days to 4 days', async () => {
            const newWaitPeriod = TWO_DAYS + TWO_DAYS;
            await registry.changeWaitPeriod(id3, newWaitPeriod);

            const entry = await registry.entries(id3);
            expect(entry.waitPeriod).to.be.eq(TWO_DAYS + TWO_DAYS);
        });

        it('...should fail to decrease change vote period', async () => {
            const newWaitPeriod = TWO_DAYS;
            try {
                await registry.changeWaitPeriod(id3, newWaitPeriod);
            } catch (err) {
                expect(err.toString()).to.have.string('New wait period must be bigger');
            }
        });

    });
  

});