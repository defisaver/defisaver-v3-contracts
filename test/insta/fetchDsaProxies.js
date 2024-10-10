/* eslint-disable import/no-extraneous-dependencies */
require('dotenv').config();
const { Alchemy, Network, Utils } = require('alchemy-sdk');

const settings = {
    apiKey: '',
    network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(settings);
const instaIndexAddress = '0x2971AdFa57b20E5a416aE5a708A8655A9c74f723';

const abi = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'origin',
                type: 'address',
            },
        ],
        name: 'LogAccountCreated',
        type: 'event',
    },
];

const instIndexInterface = new Utils.Interface(abi);
const createdDsaProxyTopic = instIndexInterface.encodeFilterTopics('LogAccountCreated', []);
const startSearchFromBlock = '0x10b4f40'; // ~ 420 days
const endSearchAtBlock = 'latest';

async function getEvents() {
    const logs = await alchemy.core.getLogs({
        fromBlock: startSearchFromBlock,
        toBlock: endSearchAtBlock,
        address: instaIndexAddress,
        topics: createdDsaProxyTopic,
    });
    for (let i = 0; i < logs.length; ++i) {
        const log = logs[i];
        const owner = log.topics[1].slice(-40);
        const account = log.topics[2].slice(-40);
        console.log(`Owner: ${owner}, Account: ${account}`);
    }
}

getEvents();
