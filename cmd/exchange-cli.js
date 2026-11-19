const { Command } = require('commander');
const { Contract, ethers } = require('ethers');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const networks = {
    mainnet: 'ETHEREUM_NODE',
    arbitrum: 'ARBITRUM_NODE',
    optimism: 'OPTIMISM_NODE',
    base: 'BASE_NODE',
    linea: 'LINEA_NODE',
    plasma: 'PLASMA_NODE',
};

async function getUpdateLogs(contract, block, network) {
    const topics = Object.keys(contract.interface.events).map((event) =>
        contract.interface.getEventTopic(event),
    );
    const filter = { topics: [topics] };
    if (network !== 'plasma') return contract.queryFilter(filter, 0, block);

    // Plasma caps eth_getLogs at 10,000 blocks. Skip the history before deployment.
    let first = 0;
    let last = block;
    while (first < last) {
        const mid = Math.floor((first + last) / 2);
        if ((await contract.provider.getCode(contract.address, mid)) === '0x') first = mid + 1;
        else last = mid;
    }
    const logs = [];
    for (let start = first; start <= block; start += 10000) {
        logs.push(...(await contract.queryFilter(filter, start, Math.min(start + 9999, block))));
    }
    return logs;
}

async function listMembers(registry, entry, events, blockTag, network) {
    const address = await registry.getAddr(entry.id, { blockTag });
    if ((await registry.provider.getCode(address, blockTag)) === '0x') {
        throw new Error(`${entry.name} has no deployed code at ${address}`);
    }
    const contract = new Contract(address, events, registry.provider);
    const logs = await getUpdateLogs(contract, blockTag, network);
    const members = new Set();
    for (const log of logs) {
        const { name, args } = contract.interface.parseLog(log);
        if (name === 'WrapperRemoved' || args.state === false) members.delete(args[0]);
        else members.add(args[0]);
    }
    return [`${entry.name} ${address} (${members.size})`, ...[...members].sort()].join('\n  ');
}

async function check(network) {
    const url = process.env[networks[network]];
    if (!url) throw new Error(`Missing ${networks[network]}`);
    const provider = new ethers.providers.JsonRpcProvider(url);
    const entries = require(`../addresses/${network}.json`);
    const entry = (name) => entries.find((item) => item.name === name);
    const registry = new Contract(
        entry('DFSRegistry').address,
        ['function getAddr(bytes4) view returns (address)'],
        provider,
    );
    const block = await provider.getBlockNumber();
    const [targets, wrappers] = await Promise.all([
        listMembers(
            registry,
            entry('ExchangeAggregatorRegistry'),
            ['event ExchangeTargetAddrUpdated(address indexed exchangeAddr, bool state)'],
            block,
            network,
        ),
        listMembers(
            registry,
            entry('WrapperExchangeRegistry'),
            [
                'event WrapperAdded(address indexed wrapper)',
                'event WrapperRemoved(address indexed wrapper)',
            ],
            block,
            network,
        ),
    ]);
    console.log(`\n${network} @ ${block}\n${targets}\n${wrappers}`);
}

const program = new Command();
program
    .command('check <network>')
    .description(`List active members on ${Object.keys(networks).join(', ')}, or -all`)
    .allowUnknownOption()
    .action(async (network) => {
        const all = ['-all', '--all'].includes(network);
        if (!all && !Object.hasOwn(networks, network)) {
            console.error(`Unknown network: ${network}`);
            process.exitCode = 1;
            return;
        }
        for (const name of all ? Object.keys(networks) : [network]) {
            try {
                await check(name);
            } catch (err) {
                console.error(
                    `${name}: ${err.error?.message || err.reason || err.code || err.message}`,
                );
                process.exitCode = 1;
            }
        }
    });
program.parseAsync();
