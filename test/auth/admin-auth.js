const { expect } = require("chai");

const { deployContract } = require("../../scripts/utils/deployer");

describe("Admin-Auth", function() {
    let ownerAcc1, ownerAcc2, adminAcc, adminAuth, adminAuthAddr;

    before(async () => {

        adminAuth = await deployContract('AdminAuth');

        ownerAcc1 = (await hre.ethers.getSigners())[0];
        ownerAcc2 = (await hre.ethers.getSigners())[1];
        adminAcc = (await hre.ethers.getSigners())[2];
        adminAcc2 = (await hre.ethers.getSigners())[3];
    });

    it(`... should fail to set an admin address if not owner `, async () => {
        try  {
            const adminAuthOwner2 = adminAuth.connect(ownerAcc2);
            await adminAuthOwner2.setAdmin(adminAcc.address);

            expect(true).to.be.false; 
        } catch(err) {
            expect(err.toString()).to.have.string('msg.sender not owner');
        }
    });

    it(`... should set an admin address`, async () => {
        await adminAuth.setAdmin(adminAcc.address);

        const currOwner = await adminAuth.admin();

        expect(currOwner).to.eq(adminAcc.address);
    });

    it(`... should fail to set an admin address twice`, async () => {
        try  {
            await adminAuth.setAdmin(adminAcc.address);
            expect(true).to.be.false; 
        } catch(err) {
            expect(err.toString()).to.have.string('admin is already set');
        }
    });

    it(`... should change the owner address`, async () => {
        const adminAuthByAdmin = adminAuth.connect(adminAcc);

        await adminAuthByAdmin.changeOwner(ownerAcc2.address);

        const currOwner = await adminAuth.owner();
        expect(currOwner).to.eq(ownerAcc2.address);
    });

    it(`... should fail to change the owner address if not called by admin`, async () => {
        try  {
            await adminAuth.changeOwner(ownerAcc2.address);
            expect(true).to.be.false; 
        } catch(err) {
            expect(err.toString()).to.have.string('msg.sender not admin');
        }
    });

    it(`... should change the admin address`, async () => {
        const adminAuthByAdmin = adminAuth.connect(adminAcc);

        await adminAuthByAdmin.changeAdmin(adminAcc2.address);

        const currAdmin = await adminAuth.admin();
        expect(currAdmin).to.eq(adminAcc2.address);
    });

    it(`... should fail to change the admin address if not called by admin`, async () => {
        try  {
            await adminAuth.changeAdmin(adminAcc2.address);
            expect(true).to.be.false; 
        } catch(err) {
            expect(err.toString()).to.have.string('msg.sender not admin');
        }
    });
});