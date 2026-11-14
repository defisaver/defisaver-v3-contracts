#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const { ethers } = require('ethers');
const readline = require('readline-sync');
const { ROOT, prepare, loadRun } = require('../scripts/deployment/build');
const { networks } = require('../scripts/deployment/config');
const { executeRun } = require('../scripts/deployment/deploy');
const { decrypt } = require('../scripts/utils/crypto');

function parseNetworks(value) {
    const names = value === 'all' ? Object.keys(networks) : value.split(',');
    if (
        !names.length ||
        new Set(names).size !== names.length ||
        names.some((name) => !Object.hasOwn(networks, name))
    ) {
        throw new Error(`Use unique networks from: ${Object.keys(networks).join(',')}`);
    }
    return names;
}

function parseTargets(groups, defaultNetworks) {
    if (!groups.length) throw new Error('Supply contracts, or --resume');
    const defaults = defaultNetworks === undefined ? undefined : parseNetworks(defaultNetworks);
    const targets = {};
    for (const group of groups) {
        const [contracts, networkList, extra] = group.split('@');
        const names = contracts.split(',');
        if (extra !== undefined || names.some((name) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)))
            throw new Error(
                `Invalid contract group: ${group}. Use Contract1,Contract2@mainnet,base`,
            );
        const selected = networkList === undefined ? defaults : parseNetworks(networkList);
        if (!selected) throw new Error(`${group}: supply --networks or append @mainnet,base`);
        for (const network of selected) {
            targets[network] = [...new Set([...(targets[network] || []), ...names])];
        }
    }
    return targets;
}

function parseGas(value, selected) {
    if (!value) return {};
    if (!value.includes('=')) return Object.fromEntries(selected.map((n) => [n, value]));
    const result = {};
    for (const part of value.split(',')) {
        const [network, gas, extra] = part.split('=');
        if (
            (network !== 'all' && !selected.includes(network)) ||
            Object.hasOwn(result, network) ||
            !gas ||
            extra !== undefined
        )
            throw new Error(`Invalid gas setting: ${part}`);
        result[network] = gas;
    }
    return Object.fromEntries(
        selected
            .filter((network) => result[network] !== undefined || result.all !== undefined)
            .map((network) => [network, result[network] ?? result.all]),
    );
}

function lock(file = path.join(ROOT, 'deployments', 'multi.lock')) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
        fs.writeFileSync(file, String(process.pid), { flag: 'wx', mode: 0o600 });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        throw new Error(
            `Deployment lock exists: ${file}. If its process is no longer running, remove this file and resume.`,
        );
    }
    const release = () => {
        fs.rmSync(file, { force: true });
    };
    process.once('exit', release);
    return () => {
        process.removeListener('exit', release);
        release();
    };
}

function positiveInteger(value) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1) throw new Error('Expected a positive integer');
    return number;
}

function confirmDeployment(network, address, gas, contracts, question = readline.question) {
    console.log(
        `\n${network} (chain ${networks[network].chainId}), signer ${address || 'saved transaction'}, gas cap ${gas || 'saved transaction'} gwei`,
    );
    console.log(`Contracts: ${Object.keys(contracts).join(', ')}`);
    if (question(`Type ${network} to deploy/resume: `) !== network)
        throw new Error('Deployment cancelled');

    let highestGas = ethers.constants.Zero;
    for (const record of Object.values(contracts)) {
        if (record.confirmed) continue;
        const transaction =
            record.rawTransaction && ethers.utils.parseTransaction(record.rawTransaction);
        const price = transaction
            ? transaction.gasPrice || transaction.maxFeePerGas
            : ethers.utils.parseUnits(gas, 'gwei');
        if (price.gt(highestGas)) highestGas = price;
    }
    if (
        highestGas.gt(ethers.utils.parseUnits('300', 'gwei')) &&
        question(
            `WARNING: ${network} gas cap is ${ethers.utils.formatUnits(highestGas, 'gwei')} gwei (above 300). Type YES to accept this high gas price: `,
        ) !== 'YES'
    ) {
        throw new Error('High-gas deployment cancelled');
    }
}

async function main(argv = process.argv) {
    const program = new Command()
        .description('Build, deploy and verify selected contracts sequentially across networks')
        .argument(
            '[contracts...]',
            'Contract names or Contract1,Contract2@mainnet,base (zero-argument constructors only)',
        )
        .option('--networks <list>', 'Default networks for contracts without @networks, or all')
        .option('--build-only', 'Build or validate saved builds without RPCs, keys or transactions')
        .option('--resume <manifest>', 'Resume an existing run using its saved builds')
        .option(
            '--output <directory>',
            'Build cache and run directory',
            path.join(ROOT, 'deployments/multi'),
        )
        .option('--gas <prices>', 'Gwei cap: 1.1, all=1.1, or all=1.1,mainnet=3 (overrides)')
        .option(
            '--confirmations <count>',
            'Receipt confirmations before verification',
            positiveInteger,
            1,
        )
        .option(
            '--timeout <seconds>',
            'Timeout for each receipt or verification',
            positiveInteger,
            300,
        );
    program.parse(argv);
    const options = program.opts();
    if (
        options.resume &&
        (program.args.length ||
            options.networks ||
            program.getOptionValueSource('output') === 'cli')
    )
        throw new Error('--resume cannot be combined with contracts, --networks or --output');
    const targets = options.resume ? undefined : parseTargets(program.args, options.networks);
    const unlock = lock();
    let unlockRun;
    try {
        const requestedFile = options.resume
            ? path.resolve(options.resume)
            : prepare(targets, path.resolve(options.output));
        const file = fs.realpathSync(requestedFile);
        unlockRun = lock(`${file}.lock`);
        const run = loadRun(file);
        console.log(`Manifest: ${file}`);
        for (const bundle of run.bundles)
            console.log(
                `${bundle.network} (${bundle.chainId}): ${bundle.contracts.map((c) => c.name).join(', ')}`,
            );
        if (options.buildOnly) {
            console.log('Build-only complete. No RPC connections or transactions.');
            return file;
        }
        require('dotenv').config({ path: path.join(ROOT, '.env') });
        const providers = {};
        for (const entry of run.manifest.networks) {
            const config = networks[entry.network];
            if (
                Object.values(entry.contracts).some((record) => !record.transactionHash) &&
                !process.env[config.keyEnv] &&
                !(entry.network === 'optimism' && process.env.ENCRYPTED_KEY_OPTIMISM)
            ) {
                throw new Error(`Missing ${config.keyEnv}`);
            }
            const rpc = process.env[config.rpcEnv];
            if (!rpc) throw new Error(`Missing ${networks[entry.network].rpcEnv}`);
            providers[entry.network] = new ethers.providers.JsonRpcProvider({
                url: rpc,
                timeout: 30000,
            });
        }
        let password;
        await executeRun(run, {
            providers,
            apiKey: process.env.ETHERSCAN_API_KEY,
            confirmations: options.confirmations,
            timeoutMs: options.timeout * 1000,
            gasPrices: parseGas(
                options.gas,
                run.manifest.networks.map((n) => n.network),
            ),
            getWallet: async (network, provider) => {
                const keyEnv = networks[network].keyEnv;
                const encrypted =
                    process.env[keyEnv] ||
                    (network === 'optimism' && process.env.ENCRYPTED_KEY_OPTIMISM);
                if (!encrypted) throw new Error(`Missing ${keyEnv}`);
                if (password) {
                    try {
                        return new ethers.Wallet(decrypt(encrypted, password), provider);
                    } catch {
                        password = undefined;
                    }
                }
                password = readline.question(`${network}: password for ${keyEnv}: `, {
                    hideEchoBack: true,
                    mask: '',
                });
                try {
                    return new ethers.Wallet(decrypt(encrypted, password), provider);
                } catch {
                    throw new Error(`${network}: could not decrypt the deployment key`);
                }
            },
            confirm: confirmDeployment,
        });
        password = undefined;
        console.log(`Deployment and verification complete. Manifest: ${file}`);
        return file;
    } finally {
        unlockRun?.();
        unlock();
    }
}

if (require.main === module) {
    process.once('SIGINT', () => process.exit(130));
    process.once('SIGTERM', () => process.exit(143));
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = { main, parseNetworks, parseTargets, parseGas, lock, confirmDeployment };
