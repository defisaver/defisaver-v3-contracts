/* eslint-disable no-await-in-loop */
/* eslint-disable eqeqeq */
const { ethers } = require('ethers');
require('dotenv-safe').config();

const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_NODE);

const INSTA_INDEX_ADDRESS = '0x2971AdFa57b20E5a416aE5a708A8655A9c74f723';
const AAVE_V3_VIEW_ADDRESS = '0x3789ae0ea3bC9a4641Ed0C5fd90b51E5ED4a3551';
const AAVE_V3_MARKET = '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e';
const UINT_256_MAX = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

const instaIndexAbi = [
    'event LogAccountCreated(address sender, address indexed owner, address indexed account, address indexed origin)',
];
const aaveV3ViewAbi = require('../../artifacts/contracts/views/AaveV3View.sol/AaveV3View.json').abi;

const instaIndex = new ethers.Contract(INSTA_INDEX_ADDRESS, instaIndexAbi, provider);
const aaveV3View = new ethers.Contract(AAVE_V3_VIEW_ADDRESS, aaveV3ViewAbi, provider);

async function findAaveV3Positions() {
    const currentBlock = await provider.getBlockNumber();

    const blocksToSearch = 1000000;
    const startBlock = currentBlock - blocksToSearch;

    console.log(`Searching for DSA proxy creations from blocks ${startBlock} to ${currentBlock}...`);

    const events = await instaIndex.queryFilter('LogAccountCreated', startBlock, currentBlock);

    console.log(`Found ${events.length} DSA proxies created. Checking positions on Aave V3...`);

    if (events.length === 0) {
        return;
    }
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const { owner, account } = event.args;

        const healthFactor = await aaveV3View.getHealthFactor(AAVE_V3_MARKET, account);
        if (healthFactor != UINT_256_MAX && healthFactor !== 0) {
            console.log(`Owner: ${owner}, Account: ${account}, Health Factor: ${healthFactor}`);
        } else {
            console.log('No positions found');
        }
    }
}

findAaveV3Positions().catch(console.error);
