const { expect } = require("chai");
const { deployContract } = require("../../scripts/utils/deployer.js");

const {
    impersonateAccount,
    stopImpersonatingAccount,
    sendEther,
    getAddrFromRegistry,
    redeploy,
    balanceOf,
    getProxy,
    send,
    OWNER_ACC,
    ADMIN_ACC,
    DAI_ADDR,
    ETH_ADDR,
    UNISWAP_WRAPPER,
} = require('../utils.js');

const {
    sell,
} = require('../actions');


describe("Admin-Auth", function() {
    let sender, ownerAcc, adminAcc, proxy, adminAuth, newAdminVault;

    before(async () => {

        adminAuth = await redeploy("AdminAuth");
        await redeploy("DFSSell");

        adminAcc = await hre.ethers.provider.getSigner(ADMIN_ACC);
        ownerAcc = await hre.ethers.provider.getSigner(OWNER_ACC);

        sender = (await hre.ethers.getSigners())[0];

        proxy = await getProxy(sender.address);

        newAdminVault = await deployContract('AdminVault');
    });

    it(`... non admin should fail to change admin vault`, async () => {
        try  {            
            await adminAuth.changeAdminVault(sender.address);
            expect(true).to.be.false; 
        } catch(err) {
            expect(err.toString()).to.have.string('msg.sender not admin');
        }
    });

    it(`... owner should withdraw 10 Dai from contract`, async () => {
        const tokenBalance = await balanceOf(DAI_ADDR, sender.address);

        // 10 Dai
        const amount = ethers.utils.parseUnits('10', 18);

        if (tokenBalance.lt(amount)) {
            await sell(
                proxy,
                ETH_ADDR,
                DAI_ADDR,
                ethers.utils.parseUnits('1', 18),
                UNISWAP_WRAPPER,
                sender.address,
                sender.address
            );
        }

        const tokenBalanceBefore = await balanceOf(DAI_ADDR, sender.address);

        await send(DAI_ADDR, adminAuth.address, amount);

        await impersonateAccount(OWNER_ACC);

        const adminAuthByOwner = adminAuth.connect(ownerAcc);
        await adminAuthByOwner.withdrawStuckFunds(DAI_ADDR, sender.address, amount);

        await stopImpersonatingAccount(OWNER_ACC);

        const tokenBalanceAfter = await balanceOf(DAI_ADDR, sender.address);

        expect(tokenBalanceBefore).to.be.eq(tokenBalanceAfter);
    });

    it(`... non owner should fail to withdraw Dai from contract`, async () => {
        try  {            
            await adminAuth.withdrawStuckFunds(DAI_ADDR, sender.address, 0);;
            expect(true).to.be.false; 
        } catch(err) {
            expect(err.toString()).to.have.string('msg.sender not owner');
        }
    });

    it(`... non admin should not be able to kill the contract`, async () => {
        try  {            
            await adminAuth.kill();
            expect(true).to.be.false; 
        } catch(err) {
            expect(err.toString()).to.have.string('msg.sender not admin');
        }
    });

    it(`... admin should be able to kill the contract`, async () => {
        await impersonateAccount(ADMIN_ACC);

        const adminAuthByAdmin = adminAuth.connect(adminAcc);
        await adminAuthByAdmin.kill();

        await stopImpersonatingAccount(ADMIN_ACC);

        try {
            await adminAuth.adminVault();
            expect(true).to.be.false; 
        } catch (err) {
            expect(true).to.be.true; 
        }
    });
  
});