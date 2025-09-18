/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { program } = require('commander');
const { createFork, topUp } = require('../scripts/utils/fork');

const supportedNetworks = {
    mainnet: '1',
    arbitrum: '42161',
    optimism: '10',
    base: '8453',
    linea: '59144',
};

const getNetworkId = (network) => supportedNetworks[network];

const isNetworkSupported = (network) => Object.keys(supportedNetworks).includes(network);

const readContractsFromJson = (network) => {
    try {
        const filePath = path.join(__dirname, '..', 'addresses', `${network}.json`);
        const data = fs.readFileSync(filePath, 'utf8');
        const contracts = JSON.parse(data);
        return contracts;
    } catch (error) {
        console.error('Error reading or parsing the file', error);
        return [];
    }
};

const getContractsFromTenderly = async (networkId) => {
    const url = 'https://api.tenderly.co/api/v1/account/defisaver-v2/project/strategies/contracts';
    const headersParams = {
        'Content-Type': 'application/json',
        'X-Access-Key': process.env.TENDERLY_ACCESS_KEY,
    };
    try {
        const response = await axios.get(url, { headers: headersParams });
        return response.data
            .filter((c) => c.contract.network_id === networkId)
            .map((c) => ({
                address: c.contract.address,
                display_name: c.display_name,
            }));
    } catch (error) {
        console.error('Error getting contracts from tenderly', error);
        return null;
    }
};

const sendContractsToTenderly = async (formattedContractsToSend) => {
    const url = 'https://api.tenderly.co/api/v2/accounts/defisaver-v2/projects/Strategies/contracts';
    const headersParams = {
        'Content-Type': 'application/json',
        'X-Access-Key': process.env.TENDERLY_ACCESS_KEY,
    };
    for (let i = 0; i < formattedContractsToSend.length; i += 1) {
        const body = { contracts: [formattedContractsToSend[i]] };
        try {
            await axios.post(url, body, { headers: headersParams });
            console.log('Contract successfully sent to Tenderly');
        } catch (error) {
            console.error('Error sending contracts to Tenderly', error.response.data);
        }
    }
};

const getFormattedContractsWithHistoryIncluded = (contract, networkId) => {
    const formattedContracts = [];

    formattedContracts.push({
        network_id: networkId,
        address: contract.address,
        display_name: contract.name,
    });
    // oldest contract will have the lowest index in display name, starting with _1
    for (let i = contract.history?.length - 1; i >= 0; i -= 1) {
        formattedContracts.push({
            network_id: networkId,
            address: contract.history[i],
            display_name: `${contract.name}_${contract.history.length - i}`,
        });
    }
    return formattedContracts;
};

const sync = async (idOrNameOrAddress, options) => {
    const network = options.network.length === 0 ? 'mainnet' : options.network;

    if (!isNetworkSupported(network.toLowerCase())) {
        console.error(`Error: Network '${network}' not supported`);
        return;
    }

    const contracts = readContractsFromJson(network);

    const found = contracts.find(
        (c) => c.name === idOrNameOrAddress
        || c.address === idOrNameOrAddress
        || c.id === idOrNameOrAddress
        || c.history.includes(idOrNameOrAddress),
    );

    if (!found) {
        console.error(`Error: Contract '${idOrNameOrAddress}' not found in '${network}.json'`);
        return;
    }

    const networkId = getNetworkId(network);
    const formattedContractsToSend = getFormattedContractsWithHistoryIncluded(found, networkId);
    console.log('Sending contract(s) to Tenderly...');
    await sendContractsToTenderly(formattedContractsToSend);
};

const findContractsToSync = (contractsFromJson, contractsFromTenderly, networkId) => {
    const contractsFromTenderlyMap = {};
    contractsFromTenderly.forEach((contract) => {
        const key = `${contract.address.toLowerCase()}${contract.display_name}`;
        contractsFromTenderlyMap[key] = contract;
    });

    const contractsToSync = [];
    contractsFromJson.forEach((contract) => {
        const contractsWithHistory = getFormattedContractsWithHistoryIncluded(contract, networkId);
        contractsWithHistory.forEach((c) => {
            const key = `${c.address.toLowerCase()}${c.display_name}`;
            if (!contractsFromTenderlyMap[key]) {
                contractsToSync.push(c);
            }
        });
    });

    return contractsToSync;
};

const syncAll = async (options) => {
    const network = options.network.length === 0 ? 'mainnet' : options.network;

    if (!isNetworkSupported(network.toLowerCase())) {
        console.error(`Error: Network '${network}' not supported`);
        return;
    }

    const networkId = getNetworkId(network);

    const contractsFromTenderly = await getContractsFromTenderly(networkId);

    if (contractsFromTenderly === null) {
        return;
    }

    const contractsFromJson = readContractsFromJson(network);

    const contractsToSync = findContractsToSync(
        contractsFromJson, contractsFromTenderly, networkId,
    );

    if (contractsToSync.length === 0) {
        console.log(`All contracts from ${network}.json are already in Tenderly`);
        return;
    }

    console.log(`Syncing ${contractsToSync.length} contracts to Tenderly...`);

    await sendContractsToTenderly(contractsToSync);
};

(async () => {
    program
        .command('sync <idOrNameOrAddress>')
        .option('-n, --network <network>', 'Specify network (defaults to mainnet)', [])
        .description('Add contract to tenderly project')
        .action(async (idOrNameOrAddress, options) => {
            await sync(idOrNameOrAddress, options);
            process.exit(0);
        });

    program
        .command('syncAll')
        .option('-n, --network <network>', 'Specify network (defaults to mainnet)', [])
        .description('Add all missing contracts to tenderly project')
        .action(async (options) => {
            await syncAll(options);
            process.exit(0);
        });

    program
        .command('createFork')
        .option('-n, --network <network>', 'Specify network (defaults to mainnet)', [])
        .description('Creates a new tenderly vnet fork')
        .action(async (options) => {
            const network = options.network.length === 0 ? 'mainnet' : options.network;
            const rpcUrl = await createFork(network);
            console.log(`Rpc url: ${rpcUrl}`);
            process.exit(0);
        });

    program
        .command('gibMoney <account>')
        .option('-n, --network <network>', 'Specify network (defaults to mainnet)', [])
        .description('Gives 1000 Eth to account on vnet')
        .action(async (account, options) => {
            const network = options.network.length === 0 ? 'mainnet' : options.network;
            await topUp(account, network);
            console.log(`Acc: ${account} credited with 1000 Eth on ${network} vnet`);
            process.exit(0);
        });

    program.parse(process.argv);
})();
