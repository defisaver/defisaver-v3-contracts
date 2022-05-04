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
} = require('../utils');
const { qiDaoOpen, qiDaoSupply } = require('../actions');

const WETH_VAULT_ID = '1';
const WBTC_VAULT_ID = '2';

const vaultRegistyAddress = '0xF03F92e206706b407A17Fc9009CC35285d8bbe76';

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
    describe('QiDao-Open', () => {
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
            await qiDaoOpen(proxy, '1');
            const WETH_ADDRESS = addrs[network].WETH_ADDRESS;
            const supplyAmount = hre.ethers.utils.parseUnits('100', 18);

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
            console.log(`Collateral after supply : ${coll.toString()}`);
            expect(coll).to.be.eq(supplyAmount);
        });
        it('... should suply WBTC to QiDao vault', async () => {
            await qiDaoOpen(proxy, WBTC_VAULT_ID);
            const WBTC_OPTI_ADDRESS = '0x68f180fcCe6836688e9084f035309E29Bf0A2095';
            const supplyAmount = hre.ethers.utils.parseUnits('5', 18);

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
            console.log(`Collateral after supply : ${coll.toString()}`);
            expect(coll).to.be.eq(supplyAmount);
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
};

module.exports = {
    qiDaoFullTest,
    qiDaoOpenTest,
    qiDaoSupplyTest,
};
