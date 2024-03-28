/* eslint-disable max-len */
/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
const hre = require('hardhat');
const { nullAddress } = require('./utils');

const SAFE_PROXY_FACTORY_ADDR = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67';
const SAFE_SINGLETON_ADDR = '0x41675C099F32341bf84BFc5382aF534df5C7461a';
const SAFE_CONSTANTS = {
    SENTINEL_MODULE: '0x0000000000000000000000000000000000000001',
    PROXY_CREATED_TOPIC_0: '0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235',
    SAFE_SETUP_TOPIC_0: '0x141df868a6331af528e38c83b7aa03edc19be66e37ae67f9285bf4f8e3c6a1a8',
};
const SAFE_MASTER_COPY_VERSIONS = {
    // V100: '0xb6029EA3B2c51D09a50B53CA8012FeEB05bDa35A',
    // V110: '0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F',
    // V120: '0x6851D6fDFAfD08c0295C392436245E5bc78B0185', // no SafeSetup event
    V130: '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552',
    V130L2: '0x3E5c63644E683549055b9Be8653de26E0B4CD36E',
    V141: '0x41675C099F32341bf84BFc5382aF534df5C7461a',
    V141L2: '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762',
};

const encodeSetupArgs = async (setupArgs) => {
    const safeInterface = await hre.ethers.getContractAt('ISafe', nullAddress).then((safe) => safe.interface);
    return safeInterface.encodeFunctionData('setup', setupArgs);
};

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

const getSafeCreationArgs = async (safeAddress) => {
    const [setupEvent] = await hre.ethers.provider.getLogs({
        address: safeAddress,
        fromBlock: 0,
        toBlock: 'latest',
        topics: [SAFE_CONSTANTS.SAFE_SETUP_TOPIC_0],
    });
    if (!setupEvent) return;
    const [
        owners,
        threshold,
        _,
        fallbackHandler,
    ] = hre.ethers.utils.defaultAbiCoder.decode(['address[]', 'uint256', 'address', 'address'], setupEvent.data);

    const setupArgs = [
        owners, // _owners - List of Safe owners.
        threshold, // _threshold - Number of required confirmations for a Safe transaction.
        nullAddress, // to - Contract address for optional delegate call.
        '0x', // data - Data payload for optional delegate call.
        fallbackHandler, // fallbackHandler - Handler for fallback calls to this contract.
        nullAddress, // paymentToken - Token that should be used for the payment (0 is ETH)
        0, // payment - Value that should be paid.
        nullAddress, // paymentReceiver - Address that should receive the payment (or 0 if tx.origin)
    ];

    const createTx = await hre.ethers.provider.getTransaction(setupEvent.transactionHash);
    const masterCopyAddress = `0x${createTx.data.slice(34, 74)}`;
    const saltNonce = `0x${createTx.data.slice(138, 202)}`;

    return {
        masterCopyAddress,
        setupArgs,
        saltNonce,
    };
};

const predictSafeAddress = async (
    masterCopyAddress,
    setupArgs,
    saltNonce,
) => {
    const setupArgsEncoded = await encodeSetupArgs(setupArgs);

    const safeProxyFactory = await hre.ethers.getContractAt('ISafeProxyFactory', SAFE_PROXY_FACTORY_ADDR);
    const proxyCreationCode = await safeProxyFactory.proxyCreationCode(); // can cache
    const salt = hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes', 'uint256'], [hre.ethers.utils.keccak256(setupArgsEncoded), saltNonce]));

    return hre.ethers.utils.getCreate2Address(
        SAFE_PROXY_FACTORY_ADDR,
        salt,
        hre.ethers.utils.keccak256(
            proxyCreationCode.concat(masterCopyAddress.slice(2).padStart(64, '0')),
        ),
    );
};

const deploySafe = async (
    masterCopyAddress,
    setupArgs,
    saltNonce,
) => {
    const setupArgsEncoded = await encodeSetupArgs(setupArgs);
    const proxyFactory = await hre.ethers.getContractAt('ISafeProxyFactory', SAFE_PROXY_FACTORY_ADDR);
    return proxyFactory.createProxyWithNonce(
        masterCopyAddress,
        setupArgsEncoded,
        saltNonce,
    ).then((e) => e.wait());
};

/**
 * Sign a safe tx with one signer
 * @param safeInstance instance of the safe wallet
 * @param safeTx safe tx params {to,value,data,operation,safeTxGas,baseGas,gasPrice,gasToken,refundReceiver,nonce}
 * @param signer signer  of the safe tx
 */
const signSafeTx = async (safeInstance, safeTx, signer) => {
    const EIP712_SAFE_TX_TYPE = {
        SafeTx: [
            { type: 'address', name: 'to' },
            { type: 'uint256', name: 'value' },
            { type: 'bytes', name: 'data' },
            { type: 'uint8', name: 'operation' },
            { type: 'uint256', name: 'safeTxGas' },
            { type: 'uint256', name: 'baseGas' },
            { type: 'uint256', name: 'gasPrice' },
            { type: 'address', name: 'gasToken' },
            { type: 'address', name: 'refundReceiver' },
            { type: 'uint256', name: 'nonce' },
        ],
    };
    const domain = {
        chainId: await hre.ethers.provider.getNetwork().then((e) => e.chainId),
        verifyingContract: safeInstance.address,
    };
    // @dev - _signTypedData will be renamed to signTypedData in future ethers versions
    // eslint-disable-next-line no-underscore-dangle
    const signature = await signer._signTypedData(domain, EIP712_SAFE_TX_TYPE, safeTx);
    return signature;
};

module.exports = {
    createSafe,
    executeSafeTx,
    SAFE_CONSTANTS,
    getSafeCreationArgs,
    predictSafeAddress,
    deploySafe,
    SAFE_MASTER_COPY_VERSIONS,
    signSafeTx,
};
