/* eslint-disable no-await-in-loop */
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

const setRegistry = async (options) => {
    const network = options.network.length === 0 ? 'mainnet' : options.network;

    const nodeName = network !== 'mainnet' ? `${network.toUpperCase()}_NODE` : 'ETHEREUM_NODE';

    const provider = new ethers.providers.WebSocketProvider(process.env[nodeName]);

    const registry = new ethers.Contract(addrs[network].REGISTRY_ADDR, registryAbi, provider);

    return registry;
};

const generateIds = () => {
    const idsMap = {};
    const files = getAllFiles('./contracts');

    // add extra non-contract name ids
    files.push('/StrategyExecutorID.sol');
    files.push('/FLActionL2.sol');

    files.forEach((filePath) => {
        const fileName = filePath.split('/').pop().split('.')[0];
        const id = getNameId(fileName);

        idsMap[id] = { fileName, filePath };
        // add id if it's contract name + New at the end
        idsMap[`${getNameId(fileName)}New`] = { fileName: `${fileName}New`, filePath };
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
    const registry = await setRegistry(options);

    const id = idOrName.startsWith('0x') ? idOrName : getNameId(idOrName);

    let filter = registry.filters.AddNewContract();
    let events = await registry.queryFilter(filter);

    const addNewContractEvent = events.find((e) => parseAddNewContractEvent(e).id === id);

    const historyArr = [];

    historyArr.push(parseAddNewContractEvent(addNewContractEvent));

    filter = registry.filters.ApproveContractChange();
    events = await registry.queryFilter(filter);

    const updateEvents = events.filter((e) => e.args[1] === id);

    updateEvents.forEach((e) => {
        historyArr.push(parseApproveContractChangeEvent(e));
    });

    return historyArr;
};

const getFullEntryData = async (idOrName, options) => {
    const registry = await setRegistry(options);

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
    const registry = await setRegistry(options);

    // fetch newContract events
    let filter = registry.filters.AddNewContract();
    let events = await registry.queryFilter(filter);

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

    const formattedArr = [];

    filter = registry.filters.ApproveContractChange();
    events = await registry.queryFilter(filter);

    for (let i = 0; i < entries.length; ++i) {
        const entry = entries[i];
        entry.name = idsMap[entry.id]?.fileName;

        let updateEvents = events.filter((e) => e.args[1] === entry.id);
        updateEvents = updateEvents.map((e) => e.args[2]);

        const formattedEntry = {
            name: idsMap[entry.id]?.fileName,
            address: entry.addr,
            id: entry.id,
            path: idsMap[entry.id]?.filePath,
            version: `1.0.${updateEvents.length}`,
            inRegistry: true,
            changeTime: entry.changeTime,
            registryIds: [],
            history: updateEvents,
        };

        formattedArr.push(formattedEntry);
    }

    console.log(JSON.stringify(formattedArr));
};

const addEntryCall = async (idOrName, contractAddr, waitTime, options) => {
    const registry = await setRegistry(options);
    const network = options.network.length === 0 ? 'mainnet' : options.network;

    // validate inputs
    const id = idOrName.startsWith('0x') ? idOrName : getNameId(idOrName);

    console.log('\nId is: ', id);
    console.log('Contract addr: ', contractAddr);
    if (waitTime > 0) {
        console.log('Wait time is: ', waitTime / 8600, 'Days');
    }
    console.log('\n');

    const txData = registry.interface.encodeFunctionData('addNewContract', [id, contractAddr, waitTime]);

    return {
        addr: addrs[network].REGISTRY_ADDR,
        data: txData,
    };
};

const startContractChangeCall = async (idOrName, contractAddr, options) => {
    const registry = await setRegistry(options);
    const network = options.network.length === 0 ? 'mainnet' : options.network;

    // validate inputs
    const id = idOrName.startsWith('0x') ? idOrName : getNameId(idOrName);

    console.log('\nId is: ', id);
    console.log('New contract addr: ', contractAddr);
    console.log('\n');

    const txData = registry.interface.encodeFunctionData('startContractChange', [id, contractAddr]);

    return {
        addr: addrs[network].REGISTRY_ADDR,
        data: txData,
    };
};

const approveContractChangeCall = async (idOrName, options) => {
    const registry = await setRegistry(options);
    const network = options.network.length === 0 ? 'mainnet' : options.network;

    // validate inputs
    const id = idOrName.startsWith('0x') ? idOrName : getNameId(idOrName);

    console.log('\nId is: ', id);

    const txData = registry.interface.encodeFunctionData('approveContractChange', [id]);

    return {
        addr: addrs[network].REGISTRY_ADDR,
        data: txData,
    };
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
        .command('get-entry <idOrName>')
        .option('-n, --network <network>', 'Specify network we are calling (defaults to L1)', [])
        .description('Return current state for the entry')
        .action(async (idOrName, options) => {
            console.log((await getFullEntryData(idOrName, options)));
            process.exit(0);
        });

    program
        .command('get-entry-history <idOrName>')
        .option('-n, --network <network>', 'Specify network we are calling (defaults to L1)', [])
        .description('Returns history of changes for the entry')
        .action(async (idOrName, options) => {
            const historyArr = await getEntryHistory(idOrName, options);

            console.log(historyArr);
            process.exit(0);
        });

    program
        .command('get-name <id>')
        .description('Returns a contract name based on registry id')
        .action(async (id) => {
            const idsMap = generateIds();

            console.log(idsMap[id]?.fileName);
            process.exit(0);
        });

    program
        .command('get-id <name>')
        .description('Returns a contract id based on name')
        .action(async (name) => {
            console.log(getNameId(name));
            process.exit(0);
        });

    program
        .command('add-entry <idOrName> <contractAddr> <waitTime>')
        .option('-n, --network <network>', 'Specify network we are calling (defaults to L1)', [])
        .description('Formats a call to add a new entry to registry')
        .action(async (idOrName, contractAddr, waitTime, options) => {
            const txData = await addEntryCall(idOrName, contractAddr, waitTime, options);

            console.log(txData);
            process.exit(0);
        });

    program
        .command('start-contract-change <idOrName> <contractAddr>')
        .option('-n, --network <network>', 'Specify network we are calling (defaults to L1)', [])
        .description('Formats a call to start contract change to registry')
        .action(async (idOrName, contractAddr, options) => {
            const txData = await startContractChangeCall(idOrName, contractAddr, options);

            console.log(txData);
            process.exit(0);
        });

    program
        .command('approve-contract-change <idOrName>')
        .option('-n, --network <network>', 'Specify network we are calling (defaults to L1)', [])
        .description('Formats a call to approve contract change to registry')
        .action(async (idOrName, options) => {
            const txData = await approveContractChangeCall(idOrName, options);

            console.log(txData);
            process.exit(0);
        });

    program.parse(process.argv);
})();
