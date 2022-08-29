/* eslint-disable no-unused-vars */
/* eslint-disable no-param-reassign */
/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();

const ethers = require('ethers');
const { program } = require('commander');

const { addrs } = require('../test/utils');
const { getAllFiles } = require('../scripts/hardhat-tasks-functions');
const { getNameId } = require('../test/utils');

const registryAbi = require('../artifacts/contracts/core/DFSRegistry.sol/DFSRegistry.json').abi;

const setProviderAndRegistry = async (options) => {
    const network = options.network.length === 0 ? 'mainnet' : options.network;

    const nodeName = network !== 'mainnet' ? `${network.toUpperCase()}_NODE` : 'ETHEREUM_NODE';

    const provider = new ethers.providers.WebSocketProvider(process.env[nodeName]);

    const registry = new ethers.Contract(addrs[network].REGISTRY_ADDR, registryAbi, provider);

    return { provider, registry };
};

const generateIds = () => {
    const idsMap = {};
    const files = getAllFiles('./contracts');

    files.forEach((filePath) => {
        const fileName = filePath.split('/').pop().split('.')[0];
        const id = getNameId(fileName);

        idsMap[id] = fileName;
    });

    return idsMap;
};

const parseAddNewContractEvent = (event) => ({
    id: event.args[1],
    addr: event.args[2],
    waitTime: parseFloat(event.args[3].toString()),
});

const parseApproveContractChangeEvent = (event) => ({
    id: event.args[1],
    oldAddr: event.args[2],
    newAddr: event.args[3],
});

const getEntry = async (registry, id) => {
    const entry = await registry.entries(id);

    return {
        id,
        addr: entry.contractAddr,
        changeTime: entry.waitPeriod.toString(),
    };
};

const getEntryHistory = async (idOrName, options) => {
    const { provider, registry } = await setProviderAndRegistry(options);

    const id = idOrName.startsWith('0x') ? idOrName : getNameId(idOrName);

    let filter = registry.filters.AddNewContract();
    let events = await registry.queryFilter(filter);

    const addNewContractEvent = events.find((e) => parseAddNewContractEvent(e).id === id);

    console.log(parseAddNewContractEvent(addNewContractEvent));

    filter = registry.filters.ApproveContractChange();
    events = await registry.queryFilter(filter);

    const updateEvents = events.filter((e) => e.args[1] === id);

    updateEvents.forEach((e) => {
        console.log(parseApproveContractChangeEvent(e));
    });
};

const getFullEntryData = async (idOrName, options) => {
    const { provider, registry } = await setProviderAndRegistry(options);

    const id = idOrName.startsWith('0x') ? idOrName : getNameId(idOrName);

    const entry = await registry.entries(id);

    return {
        isRegistered: entry.exists,
        id,
        addr: entry.contractAddr,
        changeTime: entry.waitPeriod.toString(),
        inContractChange: entry.inContractChange,
        inWaitPeriodChange: entry.inWaitPeriodChange,
    };
};

const fetchAllContractsInRegistry = async (options) => {
    const { provider, registry } = await setProviderAndRegistry(options);

    // fetch newContract events
    const filter = registry.filters.AddNewContract();
    const events = await registry.queryFilter(filter);

    const idsMap = generateIds();
    let registeredIds = [];

    events.forEach(async (e) => {
        const entry = parseAddNewContractEvent(e);
        registeredIds.push(entry.id);
    });

    // grab latest registry data
    registeredIds = [...new Set(registeredIds)];

    const entryPromises = registeredIds.map((id) => getEntry(registry, id));

    const entries = await Promise.all(entryPromises);

    entries.forEach((entry) => {
        entry.name = idsMap[entry.id];

        console.log(entry);
    });
};

(async () => {
    program
        .command('dump')
        .option('-n, --network <network>', 'Specify network we are calling (defaults to L1)', [])
        .description('Returns all the correctly registered contracts in the registry')
        .action(async (options) => {
            await fetchAllContractsInRegistry(options);
            process.exit(0);
        });

    program
        .command('get-entry <nameOrId>')
        .option('-n, --network <network>', 'Specify network we are calling (defaults to L1)', [])
        .description('Return current state for the entry')
        .action(async (nameOrId, options) => {
            console.log((await getFullEntryData(nameOrId, options)));
            process.exit(0);
        });

    program
        .command('get-entry-history <nameOrId>')
        .option('-n, --network <network>', 'Specify network we are calling (defaults to L1)', [])
        .description('Returns history of changes for the entry')
        .action(async (nameOrId, options) => {
            await getEntryHistory(nameOrId, options);
            process.exit(0);
        });

    program
        .command('get-name <id>')
        .description('Returns a contract name based on registry id')
        .action(async (id) => {
            const idsMap = generateIds();

            console.log(idsMap[id]);
            process.exit(0);
        });

    program
        .command('get-id <name>')
        .description('Returns a contract id based on name')
        .action(async (name) => {
            console.log(getNameId(name));
            process.exit(0);
        });

    program.parse(process.argv);
})();
