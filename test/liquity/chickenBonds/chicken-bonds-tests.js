const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    setBalance,
    redeploy,
    balanceOf,
    LUSD_ADDR,
    MAX_UINT,
    BLUSD_ADDR,
    timeTravel,
} = require('../../utils');

const {
    createChickenBond, chickenOut, chickenIn, chickenRedeem,
} = require('../../actions');

const FIFTEEN_DAYS = 1296000;

const cbCreateTest = async () => {
    describe('Create Chicken Bond test', function () {
        this.timeout(1000000);

        let senderAcc;
        let proxy;
        let chickenBondsView;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];

            chickenBondsView = await redeploy('ChickenBondsView');

            proxy = await getProxy(senderAcc.address);
        });

        it('... should create a chicken bond', async () => {
            const lusdAmount = hre.ethers.utils.parseUnits('1000', 18);
            await setBalance(LUSD_ADDR, senderAcc.address, lusdAmount);

            const numBondsBefore = (await chickenBondsView.getUsersBonds(proxy.address)).length;

            await createChickenBond(proxy, lusdAmount, senderAcc.address);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            const latestBond = bonds[bonds.length - 1];

            expect(latestBond.lusdAmount).to.be.eq(lusdAmount);
            expect(latestBond.status).to.be.eq(1);
            expect(numBondsBefore + 1).to.be.eq(bonds.length);
        });

        it('... should create a chicken bond with max.uint amount', async () => {
            const lusdAmount = hre.ethers.utils.parseUnits('850', 18);

            await setBalance(LUSD_ADDR, senderAcc.address, lusdAmount);

            const numBondsBefore = (await chickenBondsView.getUsersBonds(proxy.address)).length;

            await createChickenBond(proxy, MAX_UINT, senderAcc.address);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            const latestBond = bonds[bonds.length - 1];

            expect(latestBond.lusdAmount).to.be.eq(lusdAmount);
            expect(latestBond.status).to.be.eq(1);
            expect(numBondsBefore + 1).to.be.eq(bonds.length);
        });
    });
};

const cbChickenOutTest = async () => {
    describe('Chicken out test', function () {
        this.timeout(1000000);

        let senderAcc;
        let senderAcc2;
        let proxy;
        let chickenBondsView;
        let bondID;
        let lusdAmount;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            senderAcc2 = (await hre.ethers.getSigners())[1];
            chickenBondsView = await redeploy('ChickenBondsView');

            proxy = await getProxy(senderAcc.address);

            lusdAmount = hre.ethers.utils.parseUnits('1000', 18);
            await setBalance(LUSD_ADDR, senderAcc.address, lusdAmount);

            await createChickenBond(proxy, lusdAmount, senderAcc.address);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondID = bonds[bonds.length - 1].bondID.toString();
        });

        it('... should chicken out a bond', async () => {
            const lusdBalanceBefore = await balanceOf(LUSD_ADDR, senderAcc.address);

            const bondInfo = await chickenBondsView.getBondFullInfo(bondID);

            await chickenOut(proxy, bondID, bondInfo.lusdAmount.toString(), senderAcc.address);

            const lusdBalanceAfter = await balanceOf(LUSD_ADDR, senderAcc.address);

            const bond = await chickenBondsView.getBondFullInfo(bondID);

            expect(lusdBalanceBefore.add(lusdAmount)).to.be.eq(lusdBalanceAfter);
            expect(bond.status).to.be.eq(2);
        });

        it('... should chicken out a bond and send to diff acc.', async () => {
            lusdAmount = hre.ethers.utils.parseUnits('1000', 18);
            await setBalance(LUSD_ADDR, senderAcc.address, lusdAmount);

            await createChickenBond(proxy, lusdAmount, senderAcc.address);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondID = bonds[bonds.length - 1].bondID.toString();

            const lusdBalanceBefore = await balanceOf(LUSD_ADDR, senderAcc2.address);

            await chickenOut(proxy, bondID, 0, senderAcc2.address);

            const lusdBalanceAfter = await balanceOf(LUSD_ADDR, senderAcc2.address);

            const bond = await chickenBondsView.getBondFullInfo(bondID);

            expect(lusdBalanceBefore.add(lusdAmount)).to.be.eq(lusdBalanceAfter);
            expect(bond.status).to.be.eq(2);
        });
    });
};

const cbChickenInTest = async () => {
    describe('Chicken in test', function () {
        this.timeout(1000000);

        let senderAcc;
        let proxy;
        let chickenBondsView;
        let bondID;
        let lusdAmount;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];

            proxy = await getProxy(senderAcc.address);
            chickenBondsView = await redeploy('ChickenBondsView');

            lusdAmount = hre.ethers.utils.parseUnits('1000', 18);
            await setBalance(LUSD_ADDR, senderAcc.address, lusdAmount);

            await createChickenBond(proxy, lusdAmount, senderAcc.address);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondID = bonds[bonds.length - 1].bondID.toString();
        });

        it('... should chicken in a bond', async () => {
            const bLusdBalanceBefore = await balanceOf(BLUSD_ADDR, senderAcc.address);

            await timeTravel(FIFTEEN_DAYS);

            const bondUpdated = await chickenBondsView.getBondFullInfo(bondID);

            console.log(bondUpdated.accruedBLUSD.toString());

            await chickenIn(proxy, bondID, senderAcc.address);

            const bLusdBalanceAfter = await balanceOf(BLUSD_ADDR, senderAcc.address);

            const bond = await chickenBondsView.getBondFullInfo(bondID);

            expect(bLusdBalanceBefore.add(bondUpdated.accruedBLUSD) / 1e18).to.be.closeTo(
                bLusdBalanceAfter / 1e18,
                0.001,
            );
            expect(bond.status).to.be.eq(3);
        });
    });
};

const cbRedeemTest = async () => {
    describe('Redeem bLUSD for LUSD', function () {
        this.timeout(1000000);

        let senderAcc;
        let proxy;
        let chickenBondsView;
        let bondID;
        let bondID2;
        let lusdAmount;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];

            proxy = await getProxy(senderAcc.address);
            chickenBondsView = await redeploy('ChickenBondsView');

            lusdAmount = hre.ethers.utils.parseUnits('1000', 18);
            await setBalance(LUSD_ADDR, senderAcc.address, lusdAmount);

            await createChickenBond(proxy, lusdAmount, senderAcc.address);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondID = bonds[bonds.length - 1].bondID.toString();

            lusdAmount = hre.ethers.utils.parseUnits('1000000', 18);
            await setBalance(LUSD_ADDR, senderAcc.address, lusdAmount);

            await createChickenBond(proxy, lusdAmount, senderAcc.address);

            const bonds2 = await chickenBondsView.getUsersBonds(proxy.address);
            bondID2 = bonds2[bonds2.length - 1].bondID.toString();
        });

        it('... should redeem LUSD for bLUSD', async () => {
            await timeTravel(FIFTEEN_DAYS);

            await chickenIn(proxy, bondID, senderAcc.address);
            await chickenIn(proxy, bondID2, senderAcc.address);

            await timeTravel(FIFTEEN_DAYS * 2);

            const bLusdBalanceBefore = await balanceOf(BLUSD_ADDR, senderAcc.address);
            const lusdBalanceBefore = await balanceOf(LUSD_ADDR, senderAcc.address);

            await chickenRedeem(
                proxy,
                bLusdBalanceBefore.div('2'),
                0,
                senderAcc.address,
                senderAcc.address,
            );

            const lusdBalanceAfter = await balanceOf(LUSD_ADDR, senderAcc.address);
            const lusdBalanceProxy = await balanceOf(LUSD_ADDR, proxy.address);

            expect(lusdBalanceProxy).to.be.eq(0);
            expect(lusdBalanceAfter).to.be.gt(lusdBalanceBefore);
        });
    });
};

const cbFullTest = async () => {
    await cbCreateTest();
    await cbChickenOutTest();
    await cbChickenInTest();
    await cbRedeemTest();
};

module.exports = {
    cbFullTest,
    cbCreateTest,
    cbChickenOutTest,
    cbChickenInTest,
    cbRedeemTest,
};
