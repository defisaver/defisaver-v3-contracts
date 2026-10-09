const path = require('path');

require('dotenv-safe').config({
    path: path.resolve(__dirname, '../.env'),
    example: path.resolve(__dirname, '../.env.example'),
});

const ethers = require('ethers');

const PAYLOADS_CONTROLLER = '0xdAbad81aF85554E9ae636395611C58F7eC1aAEc5';
const MAINNET_CHAIN_ID = 1;
const IMPERSONATED_ACCOUNT_BALANCE = ethers.utils.parseEther('100');
const MAX_UINT40 = ethers.BigNumber.from(2).pow(40).sub(1);

const PAYLOAD_STATE = {
    None: 0,
    Created: 1,
    Queued: 2,
    Executed: 3,
    Cancelled: 4,
    Expired: 5,
};

const PAYLOAD_STATE_NAME = Object.fromEntries(
    Object.entries(PAYLOAD_STATE).map(([name, value]) => [value, name]),
);

const PAYLOADS_CONTROLLER_ABI = [
    'function getPayloadById(uint40 payloadId) view returns (tuple(address creator, uint8 maximumAccessLevelRequired, uint8 state, uint40 createdAt, uint40 queuedAt, uint40 executedAt, uint40 cancelledAt, uint40 expirationTime, uint40 delay, uint40 gracePeriod, tuple(address target, bool withDelegateCall, uint8 accessLevel, uint256 value, string signature, bytes callData)[] actions) payload)',
    'function CROSS_CHAIN_CONTROLLER() view returns (address)',
    'function MESSAGE_ORIGINATOR() view returns (address)',
    'function ORIGIN_CHAIN_ID() view returns (uint256)',
    'function receiveCrossChainMessage(address originSender, uint256 originChainId, bytes message)',
    'function executePayload(uint40 payloadId) payable',
];

function parsePayloadId(value) {
    if (!value || !/^\d+$/.test(value)) {
        throw new Error('Payload ID must be a non-negative integer.');
    }

    const payloadId = ethers.BigNumber.from(value);
    if (payloadId.gt(MAX_UINT40)) {
        throw new Error('Payload ID exceeds the uint40 range.');
    }

    return payloadId;
}

function getState(payload) {
    return ethers.BigNumber.from(payload.state).toNumber();
}

function printState(payloadId, payload) {
    const state = getState(payload);
    console.log(
        `Payload ${payloadId.toString()}: ${PAYLOAD_STATE_NAME[state] || `Unknown (${state})`}`,
    );
}

async function fundAccount(provider, account) {
    await provider.send('tenderly_setBalance', [
        [account],
        ethers.utils.hexValue(IMPERSONATED_ACCOUNT_BALANCE),
    ]);
}

async function sendTransactionAs(provider, from, data, label) {
    await fundAccount(provider, from);

    const txHash = await provider.send('eth_sendTransaction', [
        {
            from,
            to: PAYLOADS_CONTROLLER,
            data,
        },
    ]);
    console.log(`${label} tx: ${txHash}`);

    const receipt = await provider.waitForTransaction(txHash);
    if (!receipt || receipt.status !== 1) {
        throw new Error(`${label} transaction failed.`);
    }
}

async function queuePayload(provider, controller, payloadId, payload) {
    const [crossChainController, messageOriginator, originChainId] = await Promise.all([
        controller.CROSS_CHAIN_CONTROLLER(),
        controller.MESSAGE_ORIGINATOR(),
        controller.ORIGIN_CHAIN_ID(),
    ]);

    const message = ethers.utils.defaultAbiCoder.encode(
        ['uint40', 'uint8', 'uint40'],
        [
            payloadId,
            payload.maximumAccessLevelRequired,
            ethers.BigNumber.from(payload.createdAt).add(1),
        ],
    );
    const data = controller.interface.encodeFunctionData('receiveCrossChainMessage', [
        messageOriginator,
        originChainId,
        message,
    ]);

    await sendTransactionAs(provider, crossChainController, data, 'Queue');

    const queuedPayload = await controller.getPayloadById(payloadId);
    if (getState(queuedPayload) !== PAYLOAD_STATE.Queued) {
        throw new Error(
            `Payload delivery did not queue the payload; current state is ${
                PAYLOAD_STATE_NAME[getState(queuedPayload)] || getState(queuedPayload)
            }.`,
        );
    }

    printState(payloadId, queuedPayload);
    return queuedPayload;
}

async function advanceToExecutionTime(provider, payload) {
    const block = await provider.getBlock('latest');
    const executionTimestamp = ethers.BigNumber.from(payload.queuedAt)
        .add(payload.delay)
        .add(1)
        .toNumber();

    if (block.timestamp >= executionTimestamp) return;

    const seconds = executionTimestamp - block.timestamp;
    await provider.send('evm_increaseTime', [seconds]);
    await provider.send('evm_mine', []);
    console.log(`Advanced fork time by ${seconds} seconds.`);
}

async function main() {
    if (process.argv.length !== 3) {
        throw new Error('Usage: node ./scripts/execute-aave-proposal.js <payload-id>');
    }

    if (!process.env.FORK_ID) {
        throw new Error('FORK_ID is missing from .env.');
    }

    const payloadId = parsePayloadId(process.argv[2]);
    const rpcUrl = `https://virtual.mainnet.eu.rpc.tenderly.co/${process.env.FORK_ID}`;
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();

    if (network.chainId !== MAINNET_CHAIN_ID) {
        throw new Error(`Expected Ethereum mainnet chain ID 1, received ${network.chainId}.`);
    }

    const controller = new ethers.Contract(PAYLOADS_CONTROLLER, PAYLOADS_CONTROLLER_ABI, provider);
    let payload = await controller.getPayloadById(payloadId);
    const initialState = getState(payload);
    printState(payloadId, payload);

    if (initialState === PAYLOAD_STATE.Executed) {
        console.log('No work needed.');
        return;
    }

    if (initialState === PAYLOAD_STATE.Created) {
        payload = await queuePayload(provider, controller, payloadId, payload);
    } else if (initialState !== PAYLOAD_STATE.Queued) {
        throw new Error(
            `Payload cannot be executed from state ${
                PAYLOAD_STATE_NAME[initialState] || `Unknown (${initialState})`
            }.`,
        );
    }

    await advanceToExecutionTime(provider, payload);

    const executeData = controller.interface.encodeFunctionData('executePayload', [payloadId]);
    await sendTransactionAs(provider, payload.creator, executeData, 'Execute');

    const executedPayload = await controller.getPayloadById(payloadId);
    if (getState(executedPayload) !== PAYLOAD_STATE.Executed) {
        throw new Error(
            'Payload execution transaction succeeded, but the payload is not Executed.',
        );
    }

    printState(payloadId, executedPayload);
}

main().catch((error) => {
    const message =
        (error.error && error.error.data && error.error.data.message) ||
        (error.error && error.error.message) ||
        error.reason ||
        error.message ||
        String(error);

    console.error(`Error: ${message}`);
    process.exitCode = 1;
});
