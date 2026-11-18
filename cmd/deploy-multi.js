#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const { ethers } = require('ethers');
const readline = require('readline-sync');
const { ROOT, prepare, loadRun, checkPendingDeployments } = require('../scripts/deployment/build');
const { networks } = require('../scripts/deployment/config');
const { executeRun, gasOverrides, unsignedContracts } = require('../scripts/deployment/deploy');
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
        let owner = '';
        try {
            const pid = fs.readFileSync(file, 'utf8').trim();
            if (/^\d+$/.test(pid)) owner = ` (PID ${pid})`;
        } catch {
            // Another process may already have released the lock.
        }
        throw new Error(
            `Deployment lock exists: ${file}${owner}. If its process is no longer running, remove this file and resume.`,
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

function sourceTag(value) {
    if (!/^[A-Za-z0-9_.-]{1,64}$/.test(value)) {
        throw new Error('Source tag must use 1-64 letters, numbers, dots, dashes or underscores');
    }
    return value;
}

function verificationMode(value) {
    if (!['submit', 'wait', 'skip'].includes(value)) {
        throw new Error('Verification mode must be submit, wait or skip');
    }
    return value;
}

function exportVerificationInputs(run, directory) {
    const files = [];
    for (const bundle of run.bundles) {
        const networkDir = path.join(directory, bundle.network);
        fs.mkdirSync(networkDir, { recursive: true });
        for (const contract of bundle.contracts) {
            const file = path.join(networkDir, `${contract.name}.json`);
            const build = bundle.builds[contract.buildId];
            fs.writeFileSync(file, `${JSON.stringify(build.input, null, 2)}\n`, {
                flag: 'wx',
                mode: 0o600,
            });
            files.push(file);
        }
    }
    return files;
}

function confirmDeployment(network, address, gas, contracts, question = readline.question) {
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
    const fee = `${ethers.utils.formatUnits(highestGas, 'gwei')} gwei`;
    console.log(
        `\n${network} (chain ${networks[network].chainId}), signer ${address || 'saved transaction'}, highest fee per gas ${fee}`,
    );
    console.log(`Contracts: ${Object.keys(contracts).join(', ')}`);
    if (question(`Type ${network} to deploy/resume: `) !== network)
        throw new Error('Deployment cancelled');
    if (
        highestGas.gt(ethers.utils.parseUnits('300', 'gwei')) &&
        question(
            `WARNING: ${network} highest fee per gas is ${fee} (above 300). Type YES to accept this high gas price: `,
        ) !== 'YES'
    ) {
        throw new Error('High-gas deployment cancelled');
    }
}

function deploymentKeyEnv(network, env) {
    const { keyEnv } = networks[network];
    if (env[keyEnv]) return keyEnv;
    if (network === 'optimism' && env.ENCRYPTED_KEY_OPTIMISM) return 'ENCRYPTED_KEY_OPTIMISM';
    throw new Error(`Missing ${keyEnv}`);
}

function preflight(entries, options, env) {
    if (options.verification !== 'skip' && !env.ETHERSCAN_API_KEY)
        throw new Error('ETHERSCAN_API_KEY is required');
    const prices = parseGas(
        options.gas,
        entries.map((entry) => entry.network),
    );
    const unsignedTargets = {};
    for (const { network, names, contracts, gas } of entries) {
        const { rpcEnv } = networks[network];
        if (!env[rpcEnv]) throw new Error(`Missing ${rpcEnv}`);
        const unsigned = names ?? unsignedContracts(contracts);
        if (!unsigned.length) continue;
        unsignedTargets[network] = unsigned;
        deploymentKeyEnv(network, env);
        gasOverrides(network, prices[network] || gas);
    }
    return { gasPrices: prices, unsignedTargets };
}

function formatDeploymentError(error, env) {
    if (
        error instanceof AggregateError &&
        error.errors.every((failure) => failure.cause && Object.hasOwn(networks, failure.message))
    ) {
        return [
            error.message,
            ...error.errors.map(
                (failure) => `${failure.message}: ${formatDeploymentError(failure.cause, env)}`,
            ),
        ].join('\n');
    }
    // Ethers may include the full RPC URL and request body in a nested transport error.
    let detail = error;
    while (!detail.requestBody && (detail.error || detail.cause))
        detail = detail.error || detail.cause;
    const network = Object.keys(networks).find((name) => {
        const url = env[networks[name].rpcEnv];
        return url && (detail.url ? detail.url === url : error.message.includes(url));
    });
    if (!network && !detail.url) return error.message;
    const method = /"method"\s*:\s*"(\w+)"/.exec(detail.requestBody)?.[1] || 'request';
    return `${network || 'Deployment'}: RPC ${method} failed (${error.code || detail.code || 'unknown error'})`;
}

async function main(argv = process.argv, env = { ...process.env }) {
    const program = new Command()
        .description('Build and deploy contracts across networks with configurable verification')
        .argument(
            '[contracts...]',
            'Contract names or Contract1,Contract2@mainnet,base (zero-argument constructors only)',
        )
        .option('--networks <list>', 'Default networks for contracts without @networks, or all')
        .option('--build-only', 'Build or validate saved builds without RPCs, keys or transactions')
        .option(
            '--allow-duplicate-bytecode',
            'Allow deployment when identical runtime bytecode already exists in address history',
        )
        .option(
            '--source-tag <tag>',
            'Change only compiler metadata, preserving executable runtime logic',
            sourceTag,
        )
        .option(
            '--verification <mode>',
            'submit GUIDs and exit, wait concurrently for exact matches, or skip',
            verificationMode,
            'submit',
        )
        .option(
            '--export-verification <directory>',
            'Export one uploadable Standard JSON input per contract, then exit',
        )
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
            options.sourceTag ||
            program.getOptionValueSource('output') === 'cli')
    )
        throw new Error(
            '--resume cannot be combined with contracts, --networks, --source-tag or --output',
        );
    const targets = options.resume ? undefined : parseTargets(program.args, options.networks);
    const unlock = lock();
    let unlockRun;
    let unlockSigning;
    let file;
    try {
        let settings;
        if (!options.buildOnly && !options.exportVerification) {
            require('dotenv').config({ path: path.join(ROOT, '.env'), processEnv: env });
            if (targets)
                settings = preflight(
                    Object.entries(targets).map(([network, names]) => ({ network, names })),
                    options,
                    env,
                );
        }
        file = fs.realpathSync(
            options.resume
                ? path.resolve(options.resume)
                : prepare(targets, path.resolve(options.output), options.sourceTag),
        );
        unlockRun = lock(`${file}.lock`);
        const run = loadRun(file);
        console.log(`Manifest: ${file}`);
        for (const bundle of run.bundles)
            console.log(
                `${bundle.network} (${bundle.chainId}): ${bundle.contracts.map((c) => c.name).join(', ')}`,
            );
        if (options.exportVerification) {
            const directory = path.resolve(options.exportVerification);
            const files = exportVerificationInputs(run, directory);
            console.log(`Exported ${files.length} verification input(s) to ${directory}`);
            return directory;
        }
        if (options.buildOnly) {
            console.log('Build-only complete. No RPC connections or transactions.');
            return file;
        }
        const { gasPrices, unsignedTargets } =
            settings ?? preflight(run.manifest.networks, options, env);
        if (Object.keys(unsignedTargets).length) {
            // Different checkouts can share a runs directory and have different repository locks.
            const runsDir = path.dirname(file);
            unlockSigning = lock(path.join(runsDir, '.signing.lock'));
        }
        const providers = {};
        for (const { network } of run.manifest.networks) {
            providers[network] = new ethers.providers.JsonRpcProvider({
                url: env[networks[network].rpcEnv],
                timeout: 30000,
            });
        }
        let password;
        const result = await executeRun(run, {
            providers,
            apiKey: env.ETHERSCAN_API_KEY,
            confirmations: options.confirmations,
            timeoutMs: options.timeout * 1000,
            allowDuplicateBytecode: options.allowDuplicateBytecode,
            verificationMode: options.verification,
            gasPrices,
            checkPending: (signers) =>
                checkPendingDeployments(path.dirname(file), unsignedTargets, file, signers),
            getWallet: async (network, provider) => {
                const keyEnv = deploymentKeyEnv(network, env);
                const encrypted = env[keyEnv];
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
        if (options.verification === 'skip') {
            console.log(`Deployment complete; verification skipped. Manifest: ${file}`);
        } else if (result.failures.length) {
            console.log(
                `Deployment complete; ${result.failures.length} verification submission(s) need retry. Manifest: ${file}`,
            );
        } else if (result.pendingVerifications) {
            console.log(
                `Deployment complete; ${result.pendingVerifications} verification(s) are processing asynchronously.`,
            );
            console.log(
                `Check later with: node ./cmd/deploy-multi.js --resume '${file.replaceAll("'", "'\\''")}' --verification wait`,
            );
        } else {
            console.log(`Deployment and exact verification complete. Manifest: ${file}`);
        }
        return file;
    } catch (error) {
        if (file) console.error(`Manifest: ${file}`);
        throw error;
    } finally {
        unlockSigning?.();
        unlockRun?.();
        unlock();
    }
}

if (require.main === module) {
    process.once('SIGINT', () => process.exit(130));
    process.once('SIGTERM', () => process.exit(143));
    const env = { ...process.env };
    main(process.argv, env).catch((error) => {
        console.error(formatDeploymentError(error, env));
        process.exitCode = 1;
    });
}

module.exports = {
    main,
    parseNetworks,
    parseTargets,
    parseGas,
    sourceTag,
    verificationMode,
    lock,
    confirmDeployment,
    exportVerificationInputs,
};
