const hre = require("hardhat");

const { deployContract } = require("../scripts/utils/deployer");

const REGISTRY_ADDR = '0xd26966adCdF4ef5CFcc6d2fFfe0190DF17acB72A';

const nullAddress = "0x0000000000000000000000000000000000000000";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const KYBER_WRAPPER = '0x71C8dc1d6315a48850E88530d18d3a97505d2065';
const UNISWAP_WRAPPER = '0x6403BD92589F825FfeF6b62177FCe9149947cb9f';
const OASIS_WRAPPER = '0x2aD7D86C56b7a09742213e1e649C727cB4991A54';

const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

const standardAmounts = {
    'ETH': '2',
    'BAT': '3000',
    'USDC': '400',
    'WBTC': '0.04',
    'ZRX': '2000',
    'KNC': '800',
    'MANA': '12000',
    'PAXUSD': '400',
    'COMP': '6',
    'LRC': '4000',
    'LINK': '45'
};

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

const redeploy = async (name, regAddr = REGISTRY_ADDR) => {
    const registryInstance = await hre.ethers.getContractFactory("DFSRegistry");
    const registry = await registryInstance.attach(regAddr);

    const c = await deployContract(name);
    const id = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(name));

    console.log(name, c.address);

    if (!(await registry.isRegistered(id))) {
        console.log(registry.address);
        await registry.addNewContract(id, c.address, 0);
    } else {
        await registry.startContractChange(id, c.address);
        await registry.approveContractChange(id);
    }

    return c;
};

const send = async (tokenAddr, to, amount) => {
    const tokenContract = await hre.ethers.getContractAt("IERC20", tokenAddr);

    await tokenContract.transfer(to, amount);
};

const approve = async (tokenAddr, to) => {
    const tokenContract = await hre.ethers.getContractAt("IERC20", tokenAddr);

    const allowance = await tokenContract.allowance(tokenContract.signer.address, to);

    if (allowance.toString() == '0') {
        await tokenContract.approve(to, MAX_UINT, {gasLimit: 1000000});
    }
};

const balanceOf = async (tokenAddr, addr) => {
    const tokenContract = await hre.ethers.getContractAt("IERC20", tokenAddr);

    let balance = '';

    if (tokenAddr.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        balance = await hre.ethers.provider.getBalance(addr);
    } else {
        balance = await tokenContract.balanceOf(addr);
    }

    return balance;
};


module.exports = {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    approve,
    balanceOf,
    standardAmounts,
    nullAddress,
    REGISTRY_ADDR,
    KYBER_WRAPPER,
    UNISWAP_WRAPPER,
    OASIS_WRAPPER,
    WETH_ADDRESS
};