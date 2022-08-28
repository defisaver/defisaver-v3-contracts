/* eslint-disable no-param-reassign */
/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();

const ethers = require('ethers');
const { program } = require('commander');

const { addrs } = require('../test/utils');

const registryAbi = require('../artifacts/contracts/core/DFSRegistry.sol/DFSRegistry.json').abi;

const { getAllFiles } = require('../scripts/hardhat-tasks-functions');

const { getNameId } = require('../test/utils');

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

const getEntry = async (registry, id) => {
    const entry = await registry.entries(id);

    return {
        id,
        addr: entry.contractAddr,
        changeTime: entry.changeStartTime.toString(),
    };
};

const fetchAllContractsInRegistry = async (network) => {
    const nodeName = network !== 'mainnet' ? `${network.toUpperCase()}_NODE` : 'ETHEREUM_NODE';

    const provider = new ethers.providers.WebSocketProvider(process.env[nodeName]);

    const registry = new ethers.Contract(addrs[network].REGISTRY_ADDR, registryAbi, provider);

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
        .option('-n, --network <network>', 'network', [])
        .description('Returns all the correctly registered contracts in the registry')
        .action(async (options) => {
            console.log(options);

            const network = options.network.length === 0 ? 'mainnet' : options.network;

            await fetchAllContractsInRegistry(network);
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
