const hre = require("hardhat");

const { deployContract } = require("../scripts/utils/deployer");

const REGISTRY_ADDR = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const nullAddress = "0x0000000000000000000000000000000000000000";

const getAddrFromRegistry = async (name) => {
    const registryInstance = await hre.ethers.getContractFactory("DFSRegistry");
    const registry = await registryInstance.attach(REGISTRY_ADDR);

    return (await registry.getAddr(hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(name))));
};

const getProxy = async (acc) => {
    const proxyRegistry = await 
    hre.ethers.getContractAt("IProxyRegistry", "0x4678f0a6958e4D2Bc4F1BAF7Bc52E8F3564f3fE4");

    let proxyAddr = await proxyRegistry.proxies(acc);

    if (proxyAddr == nullAddress) {
        await proxyRegistry.build(acc);
        proxyAddr = await proxyRegistry.proxies(acc);
    }

    const dsProxy = await hre.ethers.getContractAt("IDSProxy", proxyAddr);

    return dsProxy;
};

const redeploy = async (name) => {
    const registryInstance = await hre.ethers.getContractFactory("DFSRegistry");
    const registry = await registryInstance.attach(REGISTRY_ADDR);

    const c = await deployContract(name);

    await registry.changeInstant(ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(name)), c.address);
};

const send = async (tokenAddr, to, amount) => {
    const tokenContract = await hre.ethers.getContractAt("IERC20", tokenAddr);

    await tokenContract.transfer(to, amount);
};


module.exports = {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    nullAddress,
    REGISTRY_ADDR,
};