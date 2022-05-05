const hre = require('hardhat');
const { expect } = require('chai');
const {
    getProxy,
    redeploy,
    takeSnapshot,
    revertToSnapshot,
    addrs,
    approve,
    setBalance,
    balanceOf,
} = require('../utils');
const {
    qiDaoOpen,
    qiDaoSupply,
    qiDaoGenerate,
    qiDaoWithdraw,
    qiDaoPayback,
} = require('../actions');

const WETH_VAULT_ID = '1';
const WBTC_VAULT_ID = '2';

const vaultRegistyAddress = '0xF03F92e206706b407A17Fc9009CC35285d8bbe76';
const MAI_STABLECOIN_ADDRESS = '0xdFA46478F9e5EA86d57387849598dbFB2e964b02';
const WBTC_OPTI_ADDRESS = '0x68f180fcCe6836688e9084f035309E29Bf0A2095';

const findLatestQiDaoVault = async (ownerAddress, vaultId) => {
    const registryContract = await hre.ethers.getContractAt('QiDaoRegistry', vaultRegistyAddress);
    const vaultAddress = await registryContract.vaultAddressById(vaultId);
    const vaultContract = await hre.ethers.getContractAt('IStablecoin', vaultAddress);
    const userVaultAmount = await vaultContract.balanceOf(ownerAddress);
    const userVaultId = await vaultContract.tokenOfOwnerByIndex(ownerAddress, userVaultAmount - 1);
    return userVaultId;
};

const findVaultCollateral = async (vaultId, userVaultId) => {
    const registryContract = await hre.ethers.getContractAt('QiDaoRegistry', vaultRegistyAddress);
    const vaultAddress = await registryContract.vaultAddressById(vaultId);
    const vaultContract = await hre.ethers.getContractAt('IStablecoin', vaultAddress);
    const collAmount = await vaultContract.vaultCollateral(userVaultId);
    return collAmount;
};

const findVaultDebt = async (vaultId, userVaultId) => {
    const registryContract = await hre.ethers.getContractAt('QiDaoRegistry', vaultRegistyAddress);
    const vaultAddress = await registryContract.vaultAddressById(vaultId);
    const vaultContract = await hre.ethers.getContractAt('IStablecoin', vaultAddress);
    const debtAmount = await vaultContract.vaultDebt(userVaultId);
    return debtAmount;
};

const qiDaoOpenTest = async () => {
    describe('QiDao-Open', () => {
        let senderAcc;
        let proxy;
        let snapshotId;

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should open WETH QiDao vault', async () => {
            await qiDaoOpen(proxy, WETH_VAULT_ID);
            const vaultId = await findLatestQiDaoVault(proxy.address, WETH_VAULT_ID);
            console.log(`vaultID : ${vaultId.toString()}`);
            expect(vaultId).to.be.gt(0);
        });
        it('... should open WBTC QiDao vault', async () => {
            await qiDaoOpen(proxy, WBTC_VAULT_ID);
            const vaultId = await findLatestQiDaoVault(proxy.address, WBTC_VAULT_ID);
            console.log(`vaultID : ${vaultId.toString()}`);
            expect(vaultId).to.be.gt(0);
        });
    });
};

const qiDaoSupplyTest = async () => {
    describe('QiDao-Supply', () => {
        let senderAcc;
        let proxy;

        let snapshotId;
        const network = hre.network.config.name;

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should suply WETH to QiDao vault', async () => {
            await qiDaoOpen(proxy, WETH_VAULT_ID);
            const WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            const supplyAmount = hre.ethers.utils.parseUnits('10', 18);

            await setBalance(WETH_ADDRESS, senderAcc.address, supplyAmount);
            await approve(WETH_ADDRESS, proxy.address, senderAcc);
            const userVaultId = await findLatestQiDaoVault(proxy.address, WETH_VAULT_ID);

            await qiDaoSupply(
                proxy,
                WETH_VAULT_ID,
                userVaultId.toString(),
                WETH_ADDRESS,
                supplyAmount.toString(),
                senderAcc.address,
            );

            const coll = await findVaultCollateral(WETH_VAULT_ID, userVaultId.toString());
            console.log(`Collateral after supply : ${(coll / 1e18).toString()} WETH`);
            expect(coll).to.be.eq(supplyAmount);
        });
        it('... should suply WBTC to QiDao vault', async () => {
            await qiDaoOpen(proxy, WBTC_VAULT_ID);
            const supplyAmount = hre.ethers.utils.parseUnits('5', 8);

            await setBalance(WBTC_OPTI_ADDRESS, senderAcc.address, supplyAmount);
            await approve(WBTC_OPTI_ADDRESS, proxy.address, senderAcc);
            const userVaultId = await findLatestQiDaoVault(proxy.address, WBTC_VAULT_ID);

            await qiDaoSupply(
                proxy,
                WBTC_VAULT_ID,
                userVaultId.toString(),
                WBTC_OPTI_ADDRESS,
                supplyAmount.toString(),
                senderAcc.address,
            );
            const coll = await findVaultCollateral('2', userVaultId.toString());
            console.log(`Collateral after supply : ${(coll / 1e8).toString()} WBTC`);
            expect(coll).to.be.eq(supplyAmount);
        });
    });
};

const qiDaoGenerateTest = async () => {
    describe('QiDao-Generate', () => {
        let senderAcc; let proxy;

        const network = hre.network.config.name;
        let snapshotId;

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should supply WETH to QiDao vault and generate MAI', async () => {
            await qiDaoOpen(proxy, WETH_VAULT_ID);
            const WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            const supplyAmount = hre.ethers.utils.parseUnits('10', 18);

            await setBalance(WETH_ADDRESS, senderAcc.address, supplyAmount);
            await approve(WETH_ADDRESS, proxy.address, senderAcc);
            const userVaultId = await findLatestQiDaoVault(proxy.address, WETH_VAULT_ID);

            await qiDaoSupply(
                proxy,
                WETH_VAULT_ID,
                userVaultId.toString(),
                WETH_ADDRESS,
                supplyAmount.toString(),
                senderAcc.address,
            );

            const coll = await findVaultCollateral(WETH_VAULT_ID, userVaultId.toString());
            console.log(`Collateral after supply : ${(coll / 1e18).toString()} WETH`);
            expect(coll).to.be.eq(supplyAmount);

            const generateAmount = hre.ethers.utils.parseUnits('10000', 18);
            const balanceBefore = await balanceOf(MAI_STABLECOIN_ADDRESS, senderAcc.address);

            await qiDaoGenerate(
                proxy,
                WETH_VAULT_ID,
                userVaultId.toString(),
                generateAmount.toString(),
                senderAcc.address,
            );
            const balanceAfter = await balanceOf(MAI_STABLECOIN_ADDRESS, senderAcc.address);
            const balanceChange = balanceAfter.sub(balanceBefore);
            expect(balanceChange).to.be.eq(generateAmount);
            const debtAmount = await findVaultDebt(WETH_VAULT_ID, userVaultId);
            console.log(`Debt after generate : ${(debtAmount / 1e18).toString()} MAI`);
            expect(debtAmount).to.be.eq(generateAmount);
        });
        it('... should supply WBTC to QiDao vault and generate MAI', async () => {
            await qiDaoOpen(proxy, WBTC_VAULT_ID);
            const supplyAmount = hre.ethers.utils.parseUnits('5', 8);

            await setBalance(WBTC_OPTI_ADDRESS, senderAcc.address, supplyAmount);
            await approve(WBTC_OPTI_ADDRESS, proxy.address, senderAcc);
            const userVaultId = await findLatestQiDaoVault(proxy.address, WBTC_VAULT_ID);

            await qiDaoSupply(
                proxy,
                WBTC_VAULT_ID,
                userVaultId.toString(),
                WBTC_OPTI_ADDRESS,
                supplyAmount.toString(),
                senderAcc.address,
            );

            const coll = await findVaultCollateral(WBTC_VAULT_ID, userVaultId.toString());
            console.log(`Collateral after supply : ${(coll / 1e8).toString()} WBTC`);
            expect(coll).to.be.eq(supplyAmount);

            const generateAmount = hre.ethers.utils.parseUnits('10000', 18);
            const balanceBefore = await balanceOf(MAI_STABLECOIN_ADDRESS, senderAcc.address);

            await qiDaoGenerate(
                proxy,
                WBTC_VAULT_ID,
                userVaultId.toString(),
                generateAmount.toString(),
                senderAcc.address,
            );
            const balanceAfter = await balanceOf(MAI_STABLECOIN_ADDRESS, senderAcc.address);
            const balanceChange = balanceAfter.sub(balanceBefore);
            expect(balanceChange).to.be.eq(generateAmount);
            const debtAmount = await findVaultDebt(WBTC_VAULT_ID, userVaultId);
            console.log(`Debt after generate : ${(debtAmount / 1e18).toString()} MAI`);
            expect(debtAmount).to.be.eq(generateAmount);
        });
    });
};

const qiDaoWithdrawTest = async () => {
    describe('QiDao-Withdraw', () => {
        let senderAcc;
        let proxy;

        let snapshotId;
        const network = hre.network.config.name;

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should supply WETH to QiDao vault and then withdraw it', async () => {
            await qiDaoOpen(proxy, WETH_VAULT_ID);
            const WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            const supplyAmount = hre.ethers.utils.parseUnits('10', 18);

            await setBalance(WETH_ADDRESS, senderAcc.address, supplyAmount);
            await approve(WETH_ADDRESS, proxy.address, senderAcc);
            const userVaultId = await findLatestQiDaoVault(proxy.address, WETH_VAULT_ID);

            await qiDaoSupply(
                proxy,
                WETH_VAULT_ID,
                userVaultId.toString(),
                WETH_ADDRESS,
                supplyAmount.toString(),
                senderAcc.address,
            );

            const coll = await findVaultCollateral(WETH_VAULT_ID, userVaultId.toString());
            console.log(`Collateral after supply : ${(coll / 1e18).toString()} WETH`);
            expect(coll).to.be.eq(supplyAmount);

            await qiDaoWithdraw(
                proxy,
                WETH_VAULT_ID,
                userVaultId.toString(),
                (supplyAmount / 2).toString(),
                senderAcc.address,
            );
            const collAfterFirst = await findVaultCollateral(WETH_VAULT_ID, userVaultId.toString());
            console.log(`Collateral after first withdraw : ${(collAfterFirst / 1e18).toString()} WETH`);

            await qiDaoWithdraw(
                proxy,
                WETH_VAULT_ID,
                userVaultId.toString(),
                (hre.ethers.constants.MaxUint256).toString(),
                senderAcc.address,
            );
            const collAfterSnd = await findVaultCollateral(WETH_VAULT_ID, userVaultId.toString());
            console.log(`Collateral after second withdraw : ${(collAfterSnd / 1e18).toString()} WETH`);
            expect(collAfterSnd).to.be.eq(0);
            const wethBalanceAfterWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
            expect(wethBalanceAfterWithdraw).to.be.eq(supplyAmount);
        });
        it('... should suply WBTC to QiDao vault', async () => {
            await qiDaoOpen(proxy, WBTC_VAULT_ID);
            const supplyAmount = hre.ethers.utils.parseUnits('5', 8);

            await setBalance(WBTC_OPTI_ADDRESS, senderAcc.address, supplyAmount);
            await approve(WBTC_OPTI_ADDRESS, proxy.address, senderAcc);
            const userVaultId = await findLatestQiDaoVault(proxy.address, WBTC_VAULT_ID);

            await qiDaoSupply(
                proxy,
                WBTC_VAULT_ID,
                userVaultId.toString(),
                WBTC_OPTI_ADDRESS,
                supplyAmount.toString(),
                senderAcc.address,
            );
            const coll = await findVaultCollateral('2', userVaultId.toString());
            console.log(`Collateral after supply : ${(coll / 1e8).toString()} WBTC`);
            expect(coll).to.be.eq(supplyAmount);

            await qiDaoWithdraw(
                proxy,
                WBTC_VAULT_ID,
                userVaultId.toString(),
                (supplyAmount / 2).toString(),
                senderAcc.address,
            );
            const collAfterFirst = await findVaultCollateral(WBTC_VAULT_ID, userVaultId.toString());
            console.log(`Collateral after first withdraw : ${(collAfterFirst / 1e8).toString()} WBTC`);

            await qiDaoWithdraw(
                proxy,
                WBTC_VAULT_ID,
                userVaultId.toString(),
                (hre.ethers.constants.MaxUint256).toString(),
                senderAcc.address,
            );
            const collAfterSnd = await findVaultCollateral(WBTC_VAULT_ID, userVaultId.toString());
            console.log(`Collateral after second withdraw : ${(collAfterSnd / 1e8).toString()} WBTC`);
            expect(collAfterSnd).to.be.eq(0);
            const wbtcBalanceAfterWithdraw = await balanceOf(WBTC_OPTI_ADDRESS, senderAcc.address);
            expect(wbtcBalanceAfterWithdraw).to.be.eq(supplyAmount);
        });
    });
};

const qiDaoPaybackTest = async () => {
    describe('QiDao-Payback', () => {
        let senderAcc; let proxy;

        const network = hre.network.config.name;
        let snapshotId;

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should supply WETH to QiDao vault and generate MAI then payback it', async () => {
            await qiDaoOpen(proxy, WETH_VAULT_ID);
            const WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            const supplyAmount = hre.ethers.utils.parseUnits('10', 18);

            await setBalance(WETH_ADDRESS, senderAcc.address, supplyAmount);
            await approve(WETH_ADDRESS, proxy.address, senderAcc);
            const userVaultId = await findLatestQiDaoVault(proxy.address, WETH_VAULT_ID);

            await qiDaoSupply(
                proxy,
                WETH_VAULT_ID,
                userVaultId.toString(),
                WETH_ADDRESS,
                supplyAmount.toString(),
                senderAcc.address,
            );

            const coll = await findVaultCollateral(WETH_VAULT_ID, userVaultId.toString());
            console.log(`Collateral after supply : ${(coll / 1e18).toString()} WETH`);
            expect(coll).to.be.eq(supplyAmount);

            const generateAmount = hre.ethers.utils.parseUnits('10000', 18);
            const amountNeededToRepay = hre.ethers.utils.parseUnits('10050', 18);
            const balanceBefore = await balanceOf(MAI_STABLECOIN_ADDRESS, senderAcc.address);

            await qiDaoGenerate(
                proxy,
                WETH_VAULT_ID,
                userVaultId.toString(),
                generateAmount.toString(),
                senderAcc.address,
            );
            const balanceAfter = await balanceOf(MAI_STABLECOIN_ADDRESS, senderAcc.address);
            const balanceChange = balanceAfter.sub(balanceBefore);
            expect(balanceChange).to.be.eq(generateAmount);
            const debtAmount = await findVaultDebt(WETH_VAULT_ID, userVaultId);
            console.log(`Debt after generate : ${(debtAmount / 1e18).toString()} MAI`);
            expect(debtAmount).to.be.eq(generateAmount);
            await setBalance(MAI_STABLECOIN_ADDRESS, senderAcc.address, amountNeededToRepay);
            await approve(MAI_STABLECOIN_ADDRESS, proxy.address, senderAcc);
            await qiDaoPayback(
                proxy,
                WETH_VAULT_ID,
                userVaultId.toString(),
                (debtAmount / 2).toString(),
                senderAcc.address,
            );
            const debtAmountAfterFirst = await findVaultDebt(WETH_VAULT_ID, userVaultId);
            console.log(`Debt after first payback : ${(debtAmountAfterFirst / 1e18).toString()} MAI`);

            await qiDaoPayback(
                proxy,
                WETH_VAULT_ID,
                userVaultId.toString(),
                (hre.ethers.constants.MaxUint256).toString(),
                senderAcc.address,
            );

            const debtAmountAfterSecond = await findVaultDebt(WETH_VAULT_ID, userVaultId);
            console.log(`Debt after second payback : ${(debtAmountAfterSecond / 1e18).toString()} MAI`);
            expect(debtAmountAfterSecond).to.be.eq(0);
        });
        it('... should supply WBTC to QiDao vault and generate MAI then payback it', async () => {
            await qiDaoOpen(proxy, WBTC_VAULT_ID);
            const supplyAmount = hre.ethers.utils.parseUnits('5', 8);

            await setBalance(WBTC_OPTI_ADDRESS, senderAcc.address, supplyAmount);
            await approve(WBTC_OPTI_ADDRESS, proxy.address, senderAcc);
            const userVaultId = await findLatestQiDaoVault(proxy.address, WBTC_VAULT_ID);

            await qiDaoSupply(
                proxy,
                WBTC_VAULT_ID,
                userVaultId.toString(),
                WBTC_OPTI_ADDRESS,
                supplyAmount.toString(),
                senderAcc.address,
            );

            const coll = await findVaultCollateral(WBTC_VAULT_ID, userVaultId.toString());
            console.log(`Collateral after supply : ${(coll / 1e8).toString()} WBTC`);
            expect(coll).to.be.eq(supplyAmount);

            const generateAmount = hre.ethers.utils.parseUnits('10000', 18);
            const amountNeededToRepay = hre.ethers.utils.parseUnits('10050', 18);

            const balanceBefore = await balanceOf(MAI_STABLECOIN_ADDRESS, senderAcc.address);

            await qiDaoGenerate(
                proxy,
                WBTC_VAULT_ID,
                userVaultId.toString(),
                generateAmount.toString(),
                senderAcc.address,
            );
            const balanceAfter = await balanceOf(MAI_STABLECOIN_ADDRESS, senderAcc.address);
            const balanceChange = balanceAfter.sub(balanceBefore);
            expect(balanceChange).to.be.eq(generateAmount);
            const debtAmount = await findVaultDebt(WBTC_VAULT_ID, userVaultId);
            console.log(`Debt after generate : ${(debtAmount / 1e18).toString()} MAI`);
            expect(debtAmount).to.be.eq(generateAmount);
            await setBalance(MAI_STABLECOIN_ADDRESS, senderAcc.address, amountNeededToRepay);
            await approve(MAI_STABLECOIN_ADDRESS, proxy.address, senderAcc);
            await qiDaoPayback(
                proxy,
                WBTC_VAULT_ID,
                userVaultId.toString(),
                (debtAmount / 2).toString(),
                senderAcc.address,
            );
            const debtAmountAfterFirst = await findVaultDebt(WBTC_VAULT_ID, userVaultId);
            console.log(`Debt after first payback : ${(debtAmountAfterFirst / 1e18).toString()} MAI`);

            await qiDaoPayback(
                proxy,
                WBTC_VAULT_ID,
                userVaultId.toString(),
                (hre.ethers.constants.MaxUint256).toString(),
                senderAcc.address,
            );

            const debtAmountAfterSecond = await findVaultDebt(WBTC_VAULT_ID, userVaultId);
            console.log(`Debt after second payback : ${(debtAmountAfterSecond / 1e18).toString()} MAI`);
            expect(debtAmountAfterSecond).to.be.eq(0);
        });
    });
};

const qiDaoDeployContracts = async () => {
    await redeploy('QiDaoOpen');
    await redeploy('QiDaoSupply');
    await redeploy('QiDaoGenerate');
    await redeploy('QiDaoWithdraw');
    await redeploy('QiDaoPayback');
};
const qiDaoFullTest = async () => {
    await qiDaoDeployContracts();
    await qiDaoOpenTest();
    await qiDaoSupplyTest();
    await qiDaoGenerateTest();
    await qiDaoWithdrawTest();
    await qiDaoPaybackTest();
};

module.exports = {
    qiDaoFullTest,
    qiDaoOpenTest,
    qiDaoSupplyTest,
    qiDaoGenerateTest,
    qiDaoWithdrawTest,
    qiDaoPaybackTest,
};
