const hre = require("hardhat");

const { deployAsOwner } = require("../scripts/utils/deployer");

const REGISTRY_ADDR = '0xD6049E1F5F3EfF1F921f5532aF1A1632bA23929C';

const nullAddress = "0x0000000000000000000000000000000000000000";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const KYBER_WRAPPER = '0x71C8dc1d6315a48850E88530d18d3a97505d2065';
const UNISWAP_WRAPPER = '0x6403BD92589F825FfeF6b62177FCe9149947cb9f';
const OASIS_WRAPPER = '0x2aD7D86C56b7a09742213e1e649C727cB4991A54';
const ETH_ADDR = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const DAI_ADDR = '0x6b175474e89094c44da98b954eedeac495271d0f';
const USDC_ADDR = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

const AAVE_MARKET = '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5';

const MIN_VAULT_DAI_AMOUNT = '5010';

const OWNER_ACC = '0x0528A32fda5beDf89Ba9ad67296db83c9452F28C';
const ADMIN_ACC = '0x25eFA336886C74eA8E282ac466BdCd0199f85BB9';

const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

const AAVE_FL_FEE = 0.09;

const standardAmounts = {
    'ETH': '4',
    'WETH': '4',
    'AAVE': '15',
    'BAT': '8000',
    'USDC': '8000',
    'UNI': '100',
    'SUSD': '8000',
    'BUSD': '8000',
    'SNX': '200',
    'REP': '150',
    'REN': '2000',
    'MKR': '3',
    'ENJ': '2000',
    'DAI': '8000',
    'WBTC': '0.15',
    'RENBTC': '0.08',
    'ZRX': '4000',
    'KNC': '2000',
    'MANA': '4000',
    'PAXUSD': '8000',
    'COMP': '10',
    'LRC': '6000',
    'LINK': '140',
    'USDT': '4000',
    'TUSD': '4000',
    'BAL': '100',
    'GUSD': '4000',
    'YFI': '0.1'
};

const fetchStandardAmounts = async () => {
    return standardAmounts;
};

const getAddrFromRegistry = async (name) => {
    const registryInstance = await hre.ethers.getContractFactory("DFSRegistry");
    const registry = await registryInstance.attach(REGISTRY_ADDR);

    return (await registry.getAddr(hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(name))));
};

const getProxyWithSigner = async (signer, addr) => {
    const proxyRegistry = await
    hre.ethers.getContractAt("IProxyRegistry", "0x4678f0a6958e4D2Bc4F1BAF7Bc52E8F3564f3fE4");

    let proxyAddr = await proxyRegistry.proxies(addr);

    if (proxyAddr == nullAddress) {
        await proxyRegistry.build(addr);
        proxyAddr = await proxyRegistry.proxies(addr);
    }

    const dsProxy = await hre.ethers.getContractAt("IDSProxy", proxyAddr, signer);

    return dsProxy;
}

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

    await impersonateAccount(OWNER_ACC);

    const signer = await hre.ethers.provider.getSigner(OWNER_ACC);

    const registryInstance = await hre.ethers.getContractFactory("DFSRegistry", signer);
    const registry = await registryInstance.attach(regAddr);

    registry.connect(signer);

    const c = await deployAsOwner(name);
    const id = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(name));

    if (!(await registry.isRegistered(id))) {
        await registry.addNewContract(id, c.address, 0);
    } else {
        await registry.startContractChange(id, c.address);
        await registry.approveContractChange(id);
    }

    await stopImpersonatingAccount(OWNER_ACC);

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

const sendEther = async (signer, to, amount) => {
    const value = ethers.utils.parseUnits(amount, 18);
    const txObj = await signer.populateTransaction({ to, value, gasLimit: 300000 });

    await signer.sendTransaction(txObj);
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

const formatExchangeObj = (srcAddr, destAddr, amount, wrapper, destAmount = 0) => {
    const abiCoder = new ethers.utils.AbiCoder();

    let firstPath = srcAddr;
    let secondPath = destAddr;

    if (srcAddr.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        firstPath = WETH_ADDRESS;
    }

    if (destAddr.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        secondPath = WETH_ADDRESS;
    }

    const path = abiCoder.encode(['address[]'],[[firstPath, secondPath]]);

    return [
        srcAddr,
        destAddr,
        amount,
        destAmount,
        0,
        0,
        nullAddress,
        wrapper,
        path,
        [nullAddress, nullAddress, nullAddress, 0, 0, ethers.utils.toUtf8Bytes('')]
    ];
};

const isEth = (tokenAddr) => {
    if (tokenAddr.toLowerCase() === ETH_ADDR.toLowerCase() ||
    tokenAddr.toLowerCase() === WETH_ADDRESS.toLowerCase()
    ) {
        return true;
    }

    return false;
};

const convertToWeth = (tokenAddr) => {
    if (isEth(tokenAddr)) {
        return WETH_ADDRESS;
    }

    return tokenAddr;
};

const setNewExchangeWrapper = async (acc, newAddr) => {

    const exchangeOwnerAddr = '0xBc841B0dE0b93205e912CFBBd1D0c160A1ec6F00';
    await sendEther(acc, exchangeOwnerAddr, '1');
    await impersonateAccount(exchangeOwnerAddr);

    const signer = await hre.ethers.provider.getSigner(exchangeOwnerAddr);

    const registryInstance = await hre.ethers.getContractFactory("SaverExchangeRegistry");
    const registry = await registryInstance.attach('0x25dd3F51e0C3c3Ff164DDC02A8E4D65Bb9cBB12D');
    const registryByOwner = registry.connect(signer);

    await registryByOwner.addWrapper(newAddr, {gasLimit: 300000});
    await stopImpersonatingAccount(exchangeOwnerAddr);
};

const depositToWeth = async (amount) => {
    const weth = await hre.ethers.getContractAt("IWETH", WETH_ADDRESS);

    await weth.deposit({value: amount});
};

const impersonateAccount = async (account) => {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [account]}
    );
};

const stopImpersonatingAccount = async (account) => {
    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [account]}
    );
};

const timeTravel = async (timeIncrease) => {
    await hre.network.provider.request({
        method: "evm_increaseTime",
        params: [timeIncrease],
        id: new Date().getTime()
    });
};


module.exports = {
    getAddrFromRegistry,
    getProxy,
    getProxyWithSigner,
    redeploy,
    send,
    approve,
    balanceOf,
    formatExchangeObj,
    isEth,
    sendEther,
    impersonateAccount,
    stopImpersonatingAccount,
    convertToWeth,
    depositToWeth,
    timeTravel,
    fetchStandardAmounts,
    setNewExchangeWrapper,
    standardAmounts,
    nullAddress,
    REGISTRY_ADDR,
    AAVE_MARKET,
    DAI_ADDR,
    KYBER_WRAPPER,
    UNISWAP_WRAPPER,
    OASIS_WRAPPER,
    WETH_ADDRESS,
    ETH_ADDR,
    MAX_UINT,
    OWNER_ACC,
    ADMIN_ACC,
    USDC_ADDR,
    AAVE_FL_FEE,
    MIN_VAULT_DAI_AMOUNT
};
