/* eslint-disable max-len */
/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
const { ethers } = require('hardhat');
const { nullAddress } = require('./utils');

const safeSetupTopic0 = '0x141df868a6331af528e38c83b7aa03edc19be66e37ae67f9285bf4f8e3c6a1a8';

const encodeSetupArgs = async (setupArgs) => {
    const safeInterface = await ethers.getContractAt('ISafe', nullAddress).then((safe) => safe.interface);
    return safeInterface.encodeFunctionData('setup', setupArgs);
};

exports.proxyCreatedTopic0 = '0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235';

exports.proxyFactoryAddress = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67';

exports.masterCopyVersions = {
    // V100: '0xb6029EA3B2c51D09a50B53CA8012FeEB05bDa35A',
    // V110: '0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F',
    // V120: '0x6851D6fDFAfD08c0295C392436245E5bc78B0185', // no SafeSetup event
    V130: '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552',
    V130L2: '0x3E5c63644E683549055b9Be8653de26E0B4CD36E',
    V141: '0x41675C099F32341bf84BFc5382aF534df5C7461a',
    V141L2: '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762',
};

exports.deploySafe = async (
    masterCopyAddress,
    setupArgs,
    saltNonce,
) => {
    const setupArgsEncoded = await encodeSetupArgs(setupArgs);
    const proxyFactory = await ethers.getContractAt('ISafeProxyFactory', exports.proxyFactoryAddress);
    return proxyFactory.createProxyWithNonce(
        masterCopyAddress,
        setupArgsEncoded,
        saltNonce,
    ).then((e) => e.wait());
};

exports.predictSafeAddress = async (
    masterCopyAddress,
    setupArgs,
    saltNonce,
) => {
    const setupArgsEncoded = await encodeSetupArgs(setupArgs);

    const safeProxyFactory = await ethers.getContractAt('ISafeProxyFactory', exports.proxyFactoryAddress);
    const proxyCreationCode = await safeProxyFactory.proxyCreationCode(); // can cache
    const salt = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes', 'uint256'], [ethers.utils.keccak256(setupArgsEncoded), saltNonce]));

    return ethers.utils.getCreate2Address(
        exports.proxyFactoryAddress,
        salt,
        ethers.utils.keccak256(
            proxyCreationCode.concat(masterCopyAddress.slice(2).padStart(64, '0')),
        ),
    );
};

exports.getSafeCreationArgs = async (safeAddress) => {
    const [setupEvent] = await ethers.provider.getLogs({
        address: safeAddress,
        fromBlock: 0,
        toBlock: 'latest',
        topics: [safeSetupTopic0],
    });
    if (!setupEvent) return;
    const [
        owners,
        threshold,
        _,
        fallbackHandler,
    ] = ethers.utils.defaultAbiCoder.decode(['address[]', 'uint256', 'address', 'address'], setupEvent.data);

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

    const createTx = await ethers.provider.getTransaction(setupEvent.transactionHash);
    const masterCopyAddress = `0x${createTx.data.slice(34, 74)}`;
    const saltNonce = `0x${createTx.data.slice(138, 202)}`;

    return {
        masterCopyAddress,
        setupArgs,
        saltNonce,
    };
};
