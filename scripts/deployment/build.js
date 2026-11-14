const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { tokenize } = require('@solidity-parser/parser');
const { networks, solidity } = require('./config');

const ROOT = path.resolve(__dirname, '../..');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function writeJson(file, value, spaces = 2) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    const fd = fs.openSync(temporary, 'w', 0o600);
    try {
        const json = JSON.stringify(value, null, spaces).replace(
            /"history":\s*\[\s*("[^"]*")\s*\]/g,
            '"history": [$1]',
        );
        fs.writeFileSync(fd, `${json}\n`);
        fs.fsyncSync(fd);
    } finally {
        fs.closeSync(fd);
    }
    fs.renameSync(temporary, file);
    const directory = fs.openSync(path.dirname(file), 'r');
    try {
        fs.fsyncSync(directory);
    } finally {
        fs.closeSync(directory);
    }
}

function listSources(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        if (entry.name === 'flattened' || entry.isSymbolicLink()) return [];
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) return listSources(file);
        return entry.name.endsWith('.sol') ? [file] : [];
    });
}

function resolveContracts(names, root = ROOT) {
    if (!names.length || new Set(names).size !== names.length) {
        throw new Error('Supply unique contract names.');
    }
    const files = listSources(path.join(root, 'contracts'));
    return names.map((name) => {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
            throw new Error(`Invalid contract name: ${name}`);
        const matches = files.filter((file) => path.basename(file) === `${name}.sol`);
        if (matches.length !== 1)
            throw new Error(`${name}: expected one source file, found ${matches.length}`);
        return { name, sourceName: path.relative(root, matches[0]).split(path.sep).join('/') };
    });
}

function transformSource(source, sourceName, network) {
    const target = networks[network];
    if (!Object.hasOwn(networks, network)) throw new Error(`Unknown network: ${network}`);
    const prefixes = Object.values(networks)
        .map((n) => n.prefix)
        .join('|');
    const addressName = new RegExp(`^([A-Za-z0-9_]*?)(${prefixes})([A-Za-z0-9_]*Addresses)$`);
    const isAddressFile =
        /Addresses\.sol$/.test(sourceName) && !sourceName.endsWith('/UtilAddresses.sol');
    const fileMatch = path.basename(sourceName, '.sol').match(addressName);
    if (fileMatch && isAddressFile && fileMatch[2] !== target.prefix) {
        throw new Error(`${sourceName}: wrong address variant for ${network}`);
    }
    const tokens = tokenize(source, { range: true }).filter((t) => !/^\/[/*]/.test(t.value));
    const changes = [];
    const imports = [];
    const renamed = new Map();
    let inImport = false;
    let wethCount = 0;
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        let replacement = token.value;
        if (token.value === 'import') inImport = true;
        if (token.value === ';') inImport = false;
        if (inImport && /^["']/.test(token.value)) {
            let imported = token.value.slice(1, -1);
            const basename = path.posix.basename(imported, '.sol');
            const match = basename.match(addressName);
            if (match) {
                const targetName = `${match[1]}${target.prefix}${match[3]}`;
                imported = path.posix.join(path.posix.dirname(imported), `${targetName}.sol`);
                if (token.value.slice(1, -1).startsWith('./')) imported = `./${imported}`;
                renamed.set(basename, targetName);
            }
            imports.push(imported);
            replacement = `${token.value[0]}${imported}${token.value[0]}`;
        }
        if (
            token.type === 'Identifier' &&
            ['contract', 'library', 'interface'].includes(tokens[i - 1]?.value)
        ) {
            const declared = token.value.match(addressName);
            if (declared && declared[2] !== target.prefix) {
                throw new Error(
                    `${sourceName}: wrong address declaration ${token.value} for ${network}`,
                );
            }
        }
        if (
            sourceName === 'contracts/utils/token/TokenUtils.sol' &&
            token.value === 'WETH_ADDR' &&
            tokens[i + 1]?.value === '='
        ) {
            const literal = tokens[i + 2];
            if (
                !literal ||
                !Object.values(networks).some(
                    (n) => n.weth.toLowerCase() === literal.value.toLowerCase(),
                )
            ) {
                throw new Error('TokenUtils.WETH_ADDR must be a known network address');
            }
            changes.push({ range: literal.range, value: target.weth });
            wethCount++;
        }
        if (replacement !== token.value) changes.push({ range: token.range, value: replacement });
    }
    if (sourceName === 'contracts/utils/token/TokenUtils.sol' && wethCount !== 1) {
        throw new Error('Expected exactly one TokenUtils.WETH_ADDR declaration');
    }
    for (const token of tokens) {
        const replacement = token.type === 'Identifier' && renamed.get(token.value);
        if (replacement && replacement !== token.value)
            changes.push({ range: token.range, value: replacement });
    }
    changes.sort((a, b) => b.range[0] - a.range[0]);
    for (const change of changes) {
        source = source.slice(0, change.range[0]) + change.value + source.slice(change.range[1]);
    }
    return { content: source, imports };
}

function collectSources(contracts, network, root = ROOT) {
    const sources = {};
    function visit(sourceName) {
        if (sources[sourceName]) return;
        if (!sourceName.startsWith('contracts/') || sourceName.split('/').includes('..')) {
            throw new Error(`Only repository contract imports are supported: ${sourceName}`);
        }
        const file = path.join(root, sourceName);
        if (!fs.existsSync(file)) throw new Error(`${network}: missing dependency ${sourceName}`);
        const relative = path.relative(
            fs.realpathSync(path.join(root, 'contracts')),
            fs.realpathSync(file),
        );
        if (relative.startsWith('..') || path.isAbsolute(relative))
            throw new Error(`Import escapes contracts/: ${sourceName}`);
        const { content, imports } = transformSource(
            fs.readFileSync(file, 'utf8'),
            sourceName,
            network,
        );
        sources[sourceName] = { content };
        for (const imported of imports) {
            const dependency = imported.startsWith('.')
                ? path.posix.normalize(path.posix.join(path.posix.dirname(sourceName), imported))
                : imported;
            visit(dependency);
        }
    }
    contracts.forEach((c) => visit(c.sourceName));
    return Object.fromEntries(Object.entries(sources).sort(([a], [b]) => a.localeCompare(b)));
}

function validateContract(contract) {
    if (!/^0x[0-9a-f]+$/i.test(contract.bytecode))
        throw new Error(`${contract.name}: empty or unlinked bytecode`);
    if (contract.abi.some((entry) => entry.type === 'constructor' && entry.inputs.length)) {
        throw new Error(`${contract.name}: constructor arguments are not supported by this runner`);
    }
    if ((contract.deployedBytecode.length - 2) / 2 > 24576) {
        throw new Error(`${contract.name}: runtime exceeds the EIP-170 size limit`);
    }
}

function buildNetwork(contracts, network, sources, outputDir) {
    const sourceHash = hash(
        JSON.stringify({
            version: 2,
            chainId: networks[network].chainId,
            hardhat: require('hardhat/package.json').version,
            solidity,
            contracts,
            network,
            sources,
        }),
    );
    const dir = path.join(outputDir, 'builds', network, sourceHash);
    const bundleFile = path.join(dir, 'bundle.json');
    const checksumFile = path.join(dir, 'bundle.sha256');
    if (fs.existsSync(bundleFile) && fs.existsSync(checksumFile)) {
        const bundleHash = fs.readFileSync(checksumFile, 'utf8').trim();
        if (hash(fs.readFileSync(bundleFile)) !== bundleHash)
            throw new Error(`Corrupt cached build: ${bundleFile}`);
        console.log(`${network}: using cached build ${sourceHash.slice(0, 12)}`);
        return { bundleFile, bundleHash };
    }
    fs.rmSync(dir, { recursive: true, force: true });
    for (const [name, { content }] of Object.entries(sources)) {
        const file = path.join(dir, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
    }
    const configFile = path.join(dir, 'hardhat.config.js');
    fs.writeFileSync(configFile, `module.exports = ${JSON.stringify({ solidity })};\n`);
    console.log(`${network}: compiling ${Object.keys(sources).length} source files`);
    execFileSync(
        process.execPath,
        [require.resolve('hardhat/internal/cli/cli'), 'compile', '--config', configFile],
        { cwd: ROOT, stdio: 'inherit' },
    );
    const bundle = {
        network,
        chainId: networks[network].chainId,
        sourceHash,
        builds: {},
        contracts: [],
    };
    for (const { name, sourceName } of contracts) {
        const artifactFile = path.join(dir, 'artifacts', sourceName, `${name}.json`);
        const artifact = readJson(artifactFile);
        const debug = readJson(artifactFile.replace(/\.json$/, '.dbg.json'));
        const info = readJson(path.resolve(path.dirname(artifactFile), debug.buildInfo));
        bundle.builds[info.id] = { input: info.input, solcLongVersion: info.solcLongVersion };
        const definition = info.output.sources[sourceName].ast.nodes.find(
            (node) => node.nodeType === 'ContractDefinition' && node.name === name,
        );
        if (definition?.contractKind !== 'contract')
            throw new Error(`${name}: only deployable contracts are supported`);
        const contract = {
            name,
            sourceName,
            abi: artifact.abi,
            bytecode: artifact.bytecode,
            deployedBytecode: artifact.deployedBytecode,
            immutableReferences:
                info.output.contracts[sourceName][name].evm.deployedBytecode.immutableReferences ||
                {},
            buildId: info.id,
        };
        validateContract(contract);
        bundle.contracts.push(contract);
    }
    writeJson(bundleFile, bundle);
    const bundleHash = hash(fs.readFileSync(bundleFile));
    fs.writeFileSync(checksumFile, `${bundleHash}\n`);
    return { bundleFile, bundleHash };
}

function prepare(names, selectedNetworks, outputDir) {
    const contracts = resolveContracts(names);
    const runsDir = path.join(outputDir, 'runs');
    for (const name of fs.existsSync(runsDir)
        ? fs.readdirSync(runsDir).filter((name) => name.endsWith('.json'))
        : []) {
        const previous = readJson(path.join(runsDir, name));
        const entries = previous.networks || [];
        const records = entries.flatMap((entry) => Object.values(entry.contracts));
        const overlaps = entries.some(
            (entry) =>
                selectedNetworks.includes(entry.network) &&
                names.some((name) => Object.hasOwn(entry.contracts, name)),
        );
        if (
            overlaps &&
            records.some((record) => record.transactionHash) &&
            records.some((record) => !record.verified)
        ) {
            throw new Error(
                `An unfinished deployment overlaps this request; use --resume ${path.join(runsDir, name)}`,
            );
        }
    }
    const snapshots = selectedNetworks.map((network) => ({
        network,
        sources: collectSources(contracts, network),
    }));
    const manifest = { version: 1, createdAt: new Date().toISOString(), networks: [] };
    const manifestFile = path.join(
        outputDir,
        'runs',
        `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`,
    );
    for (const { network, sources } of snapshots) {
        const { bundleFile, bundleHash } = buildNetwork(contracts, network, sources, outputDir);
        manifest.networks.push({
            network,
            bundle: path.relative(path.dirname(manifestFile), bundleFile),
            bundleHash,
            contracts: Object.fromEntries(contracts.map((c) => [c.name, {}])),
        });
    }
    writeJson(manifestFile, manifest);
    return manifestFile;
}

function loadRun(file) {
    const manifest = readJson(file);
    if (manifest.version !== 1 || !Array.isArray(manifest.networks) || !manifest.networks.length)
        throw new Error('Invalid deployment manifest');
    const seen = new Set();
    const bundles = manifest.networks.map((entry) => {
        if (!Object.hasOwn(networks, entry.network) || seen.has(entry.network))
            throw new Error(`Invalid network: ${entry.network}`);
        seen.add(entry.network);
        const data = fs.readFileSync(path.resolve(path.dirname(file), entry.bundle));
        if (hash(data) !== entry.bundleHash)
            throw new Error(`${entry.network}: build checksum mismatch`);
        const bundle = JSON.parse(data);
        if (bundle.network !== entry.network || bundle.chainId !== networks[entry.network].chainId)
            throw new Error('Build network mismatch');
        if (
            JSON.stringify(Object.keys(entry.contracts)) !==
            JSON.stringify(bundle.contracts.map((c) => c.name))
        )
            throw new Error('Manifest contracts differ from saved build');
        for (const build of Object.values(bundle.builds)) {
            for (const [name, source] of Object.entries(build.input.sources)) {
                if (
                    transformSource(source.content, name, entry.network).content !== source.content
                ) {
                    throw new Error(
                        `${entry.network}: saved source has wrong network addresses: ${name}`,
                    );
                }
            }
        }
        bundle.contracts.forEach(validateContract);
        return bundle;
    });
    return { manifest, bundles, save: () => writeJson(file, manifest) };
}

module.exports = {
    ROOT,
    hash,
    readJson,
    writeJson,
    resolveContracts,
    transformSource,
    collectSources,
    buildNetwork,
    prepare,
    loadRun,
};
