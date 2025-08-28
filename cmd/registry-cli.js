/* eslint-disable no-await-in-loop */
/* eslint-disable no-unused-vars */
/* eslint-disable no-param-reassign */
/* eslint-disable import/no-extraneous-dependencies */
require("dotenv-safe").config();

const ethers = require("ethers");
const { program } = require("commander");
const { readFileSync, existsSync, writeFileSync } = require("fs");
const { join } = require("path");
const { createInterface } = require("readline");

const { addrs } = require("../test/utils/utils");
const { getNameId, generateIds } = require("../test/utils/utils");

const registryAbi = require("../artifacts/contracts/core/DFSRegistry.sol/DFSRegistry.json").abi;

const setRegistry = async (options) => {
    const network = options.network.length === 0 ? "mainnet" : options.network;

    const nodeName = network !== "mainnet" ? `${network.toUpperCase()}_NODE` : "ETHEREUM_NODE";

    const provider = new ethers.providers.WebSocketProvider(process.env[nodeName]);

    const registry = new ethers.Contract(addrs[network].REGISTRY_ADDR, registryAbi, provider);

    return registry;
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

    const id = idOrName.startsWith("0x") ? idOrName : getNameId(idOrName);

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

    const id = idOrName.startsWith("0x") ? idOrName : getNameId(idOrName);

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
    const network = options.network.length === 0 ? "mainnet" : options.network;

    // validate inputs
    const id = idOrName.startsWith("0x") ? idOrName : getNameId(idOrName);

    console.log("\nId is: ", id);
    console.log("Contract addr: ", contractAddr);
    if (waitTime > 0) {
        console.log("Wait time is: ", waitTime / 8600, "Days");
    }
    console.log("\n");

    const txData = registry.interface.encodeFunctionData("addNewContract", [
        id,
        contractAddr,
        waitTime,
    ]);

    return {
        addr: addrs[network].REGISTRY_ADDR,
        data: txData,
    };
};

const startContractChangeCall = async (idOrName, contractAddr, options) => {
    const registry = await setRegistry(options);
    const network = options.network.length === 0 ? "mainnet" : options.network;

    // validate inputs
    const id = idOrName.startsWith("0x") ? idOrName : getNameId(idOrName);

    console.log("\nId is: ", id);
    console.log("New contract addr: ", contractAddr);
    console.log("\n");

    const txData = registry.interface.encodeFunctionData("startContractChange", [id, contractAddr]);

    return {
        addr: addrs[network].REGISTRY_ADDR,
        data: txData,
    };
};

const approveContractChangeCall = async (idOrName, options) => {
    const registry = await setRegistry(options);
    const network = options.network.length === 0 ? "mainnet" : options.network;

    // validate inputs
    const id = idOrName.startsWith("0x") ? idOrName : getNameId(idOrName);

    console.log("\nId is: ", id);

    const txData = registry.interface.encodeFunctionData("approveContractChange", [id]);

    return {
        addr: addrs[network].REGISTRY_ADDR,
        data: txData,
    };
};

const registryDeploymentBlocks = {
    mainnet: 14171278,
    arbitrum: 12302244,
    base: 3654462,
    optimism: 8515878,
};

const compareRegistryWithJson = async (options) => {
    const registry = await setRegistry(options);

    // Get the network name
    const network = options.network.length === 0 ? "mainnet" : options.network;

    const startingBlock = registryDeploymentBlocks[network];

    // fetch newContract events
    const filter = registry.filters.AddNewContract();
    const events = await registry.queryFilter(filter, startingBlock);

    // Get all registered contracts from on-chain events
    let registeredContracts = [];
    events.forEach(async (e) => {
        const entry = parseAddNewContractEvent(e);
        registeredContracts.push(entry);
    });

    // Remove duplicates by id
    registeredContracts = registeredContracts.filter(
        (contract, index, self) => index === self.findIndex((c) => c.id === contract.id)
    );

    // Read the JSON file for the network
    const jsonPath = join(__dirname, "..", "addresses", `${network}.json`);
    if (!existsSync(jsonPath)) {
        console.log(`No JSON file found for network ${network}`);
        return;
    }

    const fileContent = readFileSync(jsonPath, "utf8");
    const jsonData = JSON.parse(fileContent);

    // Get the mapping of all contract IDs to their file info
    const idsMap = generateIds();

    // Find contracts that are in registry but not in JSON
    const missingContracts = [];
    const addressMatchContracts = [];
    registeredContracts.forEach((contract) => {
        const jsonContract = jsonData.find((c) => c.id === contract.id);
        const hasMatchingAddr = (c) => c.address.toLowerCase() === contract.addr.toLowerCase();
        const addrInHistory = (c) =>
            c.history &&
            c.history.some((addr) => addr.toLowerCase() === contract.addr.toLowerCase());
        const addressExists = jsonData.some((c) => hasMatchingAddr(c) || addrInHistory(c));

        if (!jsonContract) {
            // The contract info is directly stored in idsMap[id]
            const contractInfo = idsMap[contract.id];
            const entry = {
                name: contractInfo ? contractInfo.fileName : "Unknown",
                address: contract.addr,
                id: contract.id,
                path: contractInfo ? contractInfo.filePath : "",
                version: "1.0.0",
                inRegistry: true,
                changeTime: contract.waitTime.toString(),
                registryIds: [],
                history: [],
            };

            if (addressExists) {
                // Find where this address exists
                const existingEntry = jsonData.find((c) => hasMatchingAddr(c) || addrInHistory(c));
                addressMatchContracts.push({
                    newEntry: entry,
                    existingEntry: {
                        name: existingEntry.name,
                        address: existingEntry.address,
                        id: existingEntry.id,
                    },
                });
            } else {
                missingContracts.push(entry);
            }
        }
    });

    if (missingContracts.length === 0 && addressMatchContracts.length === 0) {
        console.log("All registry contracts are properly documented in JSON file");
        return;
    }

    if (addressMatchContracts.length > 0) {
        console.log("\nWARNING: Found contracts with same address but different IDs/names:");
        addressMatchContracts.forEach((match) => {
            console.log("\nRegistry entry:");
            console.log(JSON.stringify(match.newEntry, null, 2));
            console.log("Matches existing JSON entry:");
            console.log(JSON.stringify(match.existingEntry, null, 2));
        });
    }

    if (missingContracts.length > 0) {
        console.log("\nContracts that exist on-chain but missing from JSON:");
        console.log(JSON.stringify(missingContracts, null, 2));

        // Ask for confirmation before updating the file
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const answer = await new Promise((resolve) => {
            rl.question(
                "\nDo you want to update the JSON file with these entries? (y/N): ",
                resolve
            );
        });
        rl.close();

        if (answer.toLowerCase() === "y") {
            // Find the last closing bracket in the file
            const lastBracketIndex = fileContent.lastIndexOf("]");
            if (lastBracketIndex === -1) {
                console.log("Error: Invalid JSON file format");
                return;
            }

            // Insert the new entries before the last bracket
            const newContent = fileContent.slice(0, lastBracketIndex).trimEnd();
            const entriesString = missingContracts
                .map((entry) => JSON.stringify(entry, null, 4))
                .join(",\n");

            const updatedContent = `${newContent},\n${entriesString}\n]`;

            // Write back to file
            writeFileSync(jsonPath, updatedContent);
            console.log(`\nUpdated ${jsonPath} with ${missingContracts.length} new entries`);
        }
    }
};

const checkChangeTimeMismatches = async (options) => {
    const registry = await setRegistry(options);

    // Get the network name
    const network = options.network.length === 0 ? "mainnet" : options.network;

    const startingBlock = registryDeploymentBlocks[network];

    // fetch newContract events
    const filter = registry.filters.AddNewContract();
    const events = await registry.queryFilter(filter, startingBlock);

    // Get all registered contracts from on-chain events
    let registeredContracts = [];
    events.forEach(async (e) => {
        const entry = parseAddNewContractEvent(e);
        registeredContracts.push(entry);
    });

    // Remove duplicates by id
    registeredContracts = registeredContracts.filter(
        (contract, index, self) => index === self.findIndex((c) => c.id === contract.id)
    );

    // Read the JSON file for the network
    const jsonPath = join(__dirname, "..", "addresses", `${network}.json`);
    if (!existsSync(jsonPath)) {
        console.log(`No JSON file found for network ${network}`);
        return;
    }

    const fileContent = readFileSync(jsonPath, "utf8");
    const jsonData = JSON.parse(fileContent);

    const changeTimeMismatches = [];
    jsonData.forEach((jsonContract) => {
        if (jsonContract.inRegistry) {
            const registryEntry = registeredContracts.find((c) => c.id === jsonContract.id);
            if (registryEntry && registryEntry.waitTime.toString() !== jsonContract.changeTime) {
                changeTimeMismatches.push({
                    id: jsonContract.id,
                    name: jsonContract.name,
                    jsonChangeTime: jsonContract.changeTime,
                    registryChangeTime: registryEntry.waitTime.toString(),
                });
            }
        }
    });

    // Filter changeTimeMismatches by doing actual on-chain check
    if (changeTimeMismatches.length > 0) {
        const verificationPromises = changeTimeMismatches.map(async (mismatch) => {
            try {
                const entryData = await registry.entries(mismatch.id);
                const waitPeriod = entryData.waitPeriod || entryData[1];
                if (waitPeriod.toString() === "0") return mismatch;
                return null;
            } catch (error) {
                console.log(`Error checking on-chain data for ID ${mismatch.id}: ${error.message}`);
                return mismatch;
            }
        });
        const verificationResults = await Promise.all(verificationPromises);
        const verifiedMismatches = verificationResults.filter((result) => result !== null);
        changeTimeMismatches.length = 0;
        changeTimeMismatches.push(...verifiedMismatches);
    }

    if (changeTimeMismatches.length > 0) {
        console.log("\nEntries with changeTime mismatches:");
        changeTimeMismatches.forEach((mismatch) => {
            console.log(`\nID: ${mismatch.id}`);
            console.log(`Name: ${mismatch.name}`);
            console.log(`JSON changeTime: ${mismatch.jsonChangeTime}`);
            console.log(`Registry changeTime: ${mismatch.registryChangeTime}`);
        });
    } else {
        console.log("\nAll entries have matching changeTime values.");
    }

    process.exit(0);
};

(async () => {
    program
        .command("dump")
        .option("-n, --network <network>", "Specify network we are calling (defaults to L1)", [])
        .description("Returns all the correctly registered contracts in the registry")
        .action(async (options) => {
            await fetchAllContractsInRegistry(options);
            process.exit(0);
        });

    program
        .command("check-missing-contracts")
        .option("-n, --network <network>", "Specify network we are calling (defaults to L1)", [])
        .description("Checks for contracts that are in registry but missing from JSON files")
        .action(async (options) => {
            await compareRegistryWithJson(options);
            process.exit(0);
        });

    program
        .command("get-entry <idOrName>")
        .option("-n, --network <network>", "Specify network we are calling (defaults to L1)", [])
        .description("Return current state for the entry")
        .action(async (idOrName, options) => {
            console.log(await getFullEntryData(idOrName, options));
            process.exit(0);
        });

    program
        .command("get-entry-history <idOrName>")
        .option("-n, --network <network>", "Specify network we are calling (defaults to L1)", [])
        .description("Returns history of changes for the entry")
        .action(async (idOrName, options) => {
            const historyArr = await getEntryHistory(idOrName, options);

            console.log(historyArr);
            process.exit(0);
        });

    program
        .command("get-name <id>")
        .description("Returns a contract name based on registry id")
        .action(async (id) => {
            const idsMap = generateIds();

            console.log(idsMap[id]?.fileName);
            process.exit(0);
        });

    program
        .command("get-id <name>")
        .description("Returns a contract id based on name")
        .action(async (name) => {
            console.log(getNameId(name));
            process.exit(0);
        });

    program
        .command("add-entry <idOrName> <contractAddr> <waitTime>")
        .option("-n, --network <network>", "Specify network we are calling (defaults to L1)", [])
        .description("Formats a call to add a new entry to registry")
        .action(async (idOrName, contractAddr, waitTime, options) => {
            const txData = await addEntryCall(idOrName, contractAddr, waitTime, options);

            console.log(txData);
            process.exit(0);
        });

    program
        .command("start-contract-change <idOrName> <contractAddr>")
        .option("-n, --network <network>", "Specify network we are calling (defaults to L1)", [])
        .description("Formats a call to start contract change to registry")
        .action(async (idOrName, contractAddr, options) => {
            const txData = await startContractChangeCall(idOrName, contractAddr, options);

            console.log(txData);
            process.exit(0);
        });

    program
        .command("approve-contract-change <idOrName>")
        .option("-n, --network <network>", "Specify network we are calling (defaults to L1)", [])
        .description("Formats a call to approve contract change to registry")
        .action(async (idOrName, options) => {
            const txData = await approveContractChangeCall(idOrName, options);

            console.log(txData);
            process.exit(0);
        });

    program
        .command("check-change-time")
        .option("-n, --network <network>", "Specify network we are calling (defaults to L1)", [])
        .description("Checks for changeTime mismatches between JSON and registry")
        .action(async (options) => {
            await checkChangeTimeMismatches(options);
            process.exit(0);
        });

    program.parse(process.argv);
})();
