const hre = require('hardhat');
const { qiDaoOpen, qiDaoSupply, qiDaoGenerate } = require('../actions');

const {
    redeploy, getProxy, setBalance, addrs, approve, balanceOf,
} = require('../utils');

describe('QiDao-Open', () => {
    let senderAcc; let proxy;

    const network = hre.network.config.name;

    before(async () => {
        await redeploy('QiDaoOpen');
        await redeploy('QiDaoSupply');
        await redeploy('QiDaoGenerate');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should suply WETH to QiDao vault and borrow MAI', async () => {
        const vaultAddress = '0x062016Cd29Fabb26c52BAB646878987fC9B0Bc55';
        const vaultRegistyAddress = '0xF03F92e206706b407A17Fc9009CC35285d8bbe76';
        const registryContract = await hre.ethers.getContractAt('QiDaoRegistry', vaultRegistyAddress);
        const registryId = await registryContract.vaultIdByVaultAddress(vaultAddress);
        await qiDaoOpen(proxy, registryId);
        const WETH_ADDRESS = addrs[network].WETH_ADDRESS;
        const supplyAmount = hre.ethers.utils.parseUnits('10', 18);
        await setBalance(WETH_ADDRESS, senderAcc.address, supplyAmount);
        await approve(WETH_ADDRESS, proxy.address, senderAcc);
        const vaultContract = await hre.ethers.getContractAt('IStablecoin', vaultAddress);
        const userVaultAmount = await vaultContract.balanceOf(proxy.address);
        const userVaultId = await vaultContract.tokenOfOwnerByIndex(
            proxy.address, userVaultAmount - 1,
        );
        await qiDaoSupply(
            proxy,
            registryId,
            userVaultId.toString(),
            WETH_ADDRESS,
            supplyAmount.toString(),
            senderAcc.address,
        );
        console.log(`WETH supplied: ${supplyAmount.toString()}`);
        const generateAmount = hre.ethers.utils.parseUnits('12500', 18);

        const MAI_STABLECOIN_ADDRESS = '0xdFA46478F9e5EA86d57387849598dbFB2e964b02';

        const balanceBefore = await balanceOf(MAI_STABLECOIN_ADDRESS, senderAcc.address);
        //console.log(balanceBefore.toString());

        await qiDaoGenerate(
            proxy,
            registryId,
            userVaultId.toString(),
            generateAmount.toString(),
            senderAcc.address,
        );
        const balanceAfter = await balanceOf(MAI_STABLECOIN_ADDRESS, senderAcc.address);
        //console.log(balanceAfter.toString());
        console.log(`MAI borrowed: ${balanceAfter.toString()}`);
    });
});
