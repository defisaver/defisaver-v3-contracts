const hre = require('hardhat');

const SAFE_PROXY_FACTORY_ADDR = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67';
const SAFE_SINGLETON_ADDR = '0x41675C099F32341bf84BFc5382aF534df5C7461a';

const createSafe = async (senderAddress) => {
    const abiCoder = new hre.ethers.utils.AbiCoder();

    const safeProxyFactory = await hre.ethers.getContractAt('ISafeProxyFactory', SAFE_PROXY_FACTORY_ADDR);

    const saltNonce = Date.now();
    const setupData = [
        [senderAddress], // owner
        1, // threshold
        hre.ethers.constants.AddressZero, // to module address
        [], // data for module
        hre.ethers.constants.AddressZero, // fallback handler
        hre.ethers.constants.AddressZero, // payment token
        0, // payment
        hre.ethers.constants.AddressZero, // payment receiver
    ];

    const safeInterface = await hre.ethers.getContractAt('ISafe', SAFE_SINGLETON_ADDR);
    const functionData = safeInterface.interface.encodeFunctionData(
        'setup',
        setupData,
    );

    let receipt = await safeProxyFactory.createProxyWithNonce(
        SAFE_SINGLETON_ADDR,
        functionData,
        saltNonce,
    );
    receipt = await receipt.wait();

    // fetch deployed safe addr
    const safeAddr = abiCoder.decode(['address'], receipt.events.reverse()[0].topics[1]);

    return safeAddr[0];
};

// Executes 1/1 safe tx without sig
const executeSafeTx = async (
    senderAddress,
    safeInstance,
    targetAddr,
    calldata,
    callType = 1,
    ethValue = 0,
) => {
    const abiCoder = new hre.ethers.utils.AbiCoder();

    const nonce = await safeInstance.nonce();

    const txHash = await safeInstance.getTransactionHash(
        targetAddr, // to
        ethValue, // eth value
        calldata, // action calldata
        callType, // 1 is delegate call
        0, // safeTxGas
        0, // baseGas
        0, // gasPrice
        hre.ethers.constants.AddressZero, // gasToken
        hre.ethers.constants.AddressZero, // refundReceiver
        nonce, // nonce
    );
    console.log(`Tx hash of safe ${txHash}`);

    // encode r and s
    let sig = abiCoder.encode(['address', 'bytes32'], [senderAddress, '0x0000000000000000000000000000000000000000000000000000000000000000']);

    // add v = 1
    sig += '01';

    // call safe function
    const receipt = await safeInstance.execTransaction(
        targetAddr,
        ethValue,
        calldata,
        callType,
        0,
        0,
        0,
        hre.ethers.constants.AddressZero,
        hre.ethers.constants.AddressZero,
        sig,
        { gasLimit: 8_000_000 },
    );

    return receipt;
};

module.exports = {
    createSafe,
    executeSafeTx,
};
