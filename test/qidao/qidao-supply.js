const hre = require('hardhat');
const { qiDaoOpen, qiDaoSupply } = require('../actions');

const {
    redeploy, getProxy, setBalance, addrs, approve,
} = require('../utils');

describe('QiDao-Open', () => {
    let senderAcc; let proxy;

    const network = hre.network.config.name;

    before(async () => {
        await redeploy('QiDaoOpen');
        await redeploy('QiDaoSupply');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should suply WETH to QiDao vault', async () => {
        const vaultAddress = '0x062016Cd29Fabb26c52BAB646878987fC9B0Bc55';
        const vaultRegistyAddress = '0xF03F92e206706b407A17Fc9009CC35285d8bbe76';
        const registryContract = await hre.ethers.getContractAt('QiDaoRegistry', vaultRegistyAddress);
        const registryId = await registryContract.vaultIdByVaultAddress(vaultAddress);
        await qiDaoOpen(proxy, registryId);
        const WETH_ADDRESS = addrs[network].WETH_ADDRESS;
        const supplyAmount = hre.ethers.utils.parseUnits('100', 18);
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
    });
});
