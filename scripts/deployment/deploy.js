const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const { networks } = require('./config');
const { ROOT, readJson, writeJson } = require('./build');
const { verifySource } = require('./verify');

function gasOverrides(network, gas) {
    if (typeof gas !== 'string' || !/^\d+(\.\d+)?$/.test(gas))
        throw new Error(`${network}: supply a positive gas price in gwei`);
    const price = ethers.utils.parseUnits(gas, 'gwei');
    if (price.lte(0)) throw new Error(`${network}: gas price must be positive`);
    if (networks[network].txType === 0) return { type: 0, gasPrice: price };
    const tip = ethers.utils.parseUnits('0.05', 'gwei');
    return { type: 2, maxFeePerGas: price, maxPriorityFeePerGas: price.lt(tip) ? price : tip };
}

async function checkChain(provider, network) {
    const chainId = Number(await provider.send('eth_chainId', []));
    if (chainId !== networks[network].chainId)
        throw new Error(
            `${network}: RPC chain ID ${chainId}, expected ${networks[network].chainId}`,
        );
}

function checkRuntime(code, contract) {
    const mask = (value) => {
        let result = value.slice(2).toLowerCase();
        for (const refs of Object.values(contract.immutableReferences)) {
            for (const { start, length } of refs)
                result =
                    result.slice(0, start * 2) +
                    '0'.repeat(length * 2) +
                    result.slice((start + length) * 2);
        }
        return result;
    };
    if (
        code === '0x' ||
        code.length !== contract.deployedBytecode.length ||
        mask(code) !== mask(contract.deployedBytecode)
    ) {
        throw new Error(`${contract.name}: on-chain runtime does not match the saved build`);
    }
}

async function waitForRuntime(
    provider,
    address,
    contract,
    blockNumber,
    timeoutMs = 60000,
    pollMs = 1000,
) {
    const deadline = Date.now() + timeoutMs;
    let lastError;
    do {
        for (const blockTag of [blockNumber, undefined]) {
            try {
                const code = await provider.getCode(address, blockTag);
                checkRuntime(code, contract);
                return;
            } catch (error) {
                lastError = error;
            }
        }
        await new Promise((resolve) => setTimeout(resolve, pollMs));
    } while (Date.now() < deadline);
    throw new Error(
        `${contract.name}: on-chain runtime did not become available from the receipt block (${lastError?.message || 'unknown RPC error'})`,
    );
}

function checkTransaction(transaction, record, network, contract) {
    if (
        !transaction ||
        transaction.hash !== record.transactionHash ||
        transaction.chainId !== networks[network].chainId ||
        transaction.to !== null ||
        transaction.data.toLowerCase() !== contract.bytecode.toLowerCase() ||
        !ethers.BigNumber.from(transaction.value || 0).isZero() ||
        transaction.from !== record.deployer ||
        transaction.nonce !== record.nonce ||
        ethers.utils.getContractAddress({ from: transaction.from, nonce: transaction.nonce }) !==
            record.address
    ) {
        throw new Error(`${contract.name}: saved transaction does not match the deployment`);
    }
}

async function findDuplicateDeployment(provider, network, contract, root = ROOT) {
    const file = path.join(root, 'addresses', `${network}.json`);
    if (!fs.existsSync(file)) return undefined;
    const entries = readJson(file);
    if (!Array.isArray(entries)) throw new Error(`${file}: expected an array`);
    const entry = entries.find((item) => item.name === contract.name);
    if (!entry) return undefined;
    const candidates = [entry.address, ...(entry.history || [])].filter(Boolean);
    for (const address of candidates) {
        const code = await provider.getCode(address);
        if (code.toLowerCase() === contract.deployedBytecode.toLowerCase()) return address;
    }
    return undefined;
}

async function deployContract({
    provider,
    wallet,
    network,
    contract,
    record,
    gas,
    save,
    confirmations = 1,
    timeoutMs = 300000,
}) {
    const started = Date.now();
    const wasConfirmed = record.confirmed;
    await checkChain(provider, network);
    if (!record.transactionHash) {
        if (Object.keys(record).length)
            throw new Error(`${contract.name}: inconsistent deployment state`);
        const factory = new ethers.ContractFactory(contract.abi, contract.bytecode, wallet);
        const nonce = await provider.getTransactionCount(wallet.address, 'pending');
        const transaction = await wallet.populateTransaction({
            ...factory.getDeployTransaction(),
            ...gasOverrides(network, gas),
            nonce,
            chainId: networks[network].chainId,
        });
        transaction.gasLimit = transaction.gasLimit.mul(120).div(100);
        const maxCost = transaction.gasLimit.mul(transaction.gasPrice || transaction.maxFeePerGas);
        if ((await provider.getBalance(wallet.address)).lt(maxCost))
            throw new Error(`${network}: insufficient balance for maximum deployment cost`);
        const rawTransaction = await wallet.signTransaction(transaction);
        Object.assign(record, {
            rawTransaction,
            transactionHash: ethers.utils.keccak256(rawTransaction),
            address: ethers.utils.getContractAddress({ from: wallet.address, nonce }),
            deployer: wallet.address,
            nonce,
        });
        // Persist the signed transaction before sending: retries can only rebroadcast this hash.
        save();
    }
    if (!record.rawTransaction && !record.confirmed) {
        throw new Error(`${contract.name}: missing signed transaction; refusing to redeploy`);
    }
    const transaction = record.rawTransaction
        ? ethers.utils.parseTransaction(record.rawTransaction)
        : await provider.getTransaction(record.transactionHash);
    checkTransaction(transaction, record, network, contract);
    let receipt = await provider.getTransactionReceipt(record.transactionHash);
    if (!receipt) {
        if (record.confirmed || record.verified) {
            throw new Error(
                `${contract.name}: previously confirmed transaction is missing; inspect the chain before continuing`,
            );
        }
        const pending = await provider.getTransaction(record.transactionHash);
        if (!pending) {
            if ((await provider.getTransactionCount(record.deployer, 'pending')) > record.nonce) {
                throw new Error(
                    `${contract.name}: deployment nonce was consumed or reserved by another transaction; inspect it manually`,
                );
            }
            await checkChain(provider, network);
            try {
                await provider.sendTransaction(record.rawTransaction);
            } catch (error) {
                // The RPC may have accepted the transaction even when its response was lost.
                if (!(await provider.getTransaction(record.transactionHash))) {
                    throw new Error(
                        `${contract.name}: broadcast not confirmed (${error.code || 'RPC error'}); resume to recover ${record.transactionHash}`,
                    );
                }
            }
        }
        console.log(
            `${network}/${contract.name}: https://${networks[network].explorer}/tx/${record.transactionHash}`,
        );
    }
    if (!receipt || receipt.confirmations < confirmations) {
        console.log(`${network}/${contract.name}: waiting for ${confirmations} confirmation(s)`);
        receipt = await provider.waitForTransaction(
            record.transactionHash,
            confirmations,
            timeoutMs,
        );
    }
    if (!receipt) throw new Error(`${contract.name}: confirmation timed out; resume to continue`);
    if (
        receipt.transactionHash !== record.transactionHash ||
        !Number.isSafeInteger(receipt.confirmations) ||
        receipt.confirmations < confirmations ||
        receipt.status !== 1 ||
        receipt.contractAddress?.toLowerCase() !== record.address.toLowerCase()
    ) {
        throw new Error(
            `${contract.name}: deployment failed or receipt address differs; refusing to redeploy`,
        );
    }
    await checkChain(provider, network);
    await waitForRuntime(
        provider,
        record.address,
        contract,
        receipt.blockNumber,
        Math.min(timeoutMs, 60000),
    );
    record.confirmed = true;
    if (!wasConfirmed) record.confirmedAt = new Date().toISOString();
    delete record.rawTransaction;
    save();
    if (!wasConfirmed)
        console.log(
            `${network}/${contract.name}: confirmed at ${record.address} (${Math.round((Date.now() - started) / 1000)}s)`,
        );
}

function updateAddress(network, contract, address, root = ROOT) {
    const file = path.join(root, 'addresses', `${network}.json`);
    const entries = fs.existsSync(file) ? readJson(file) : [];
    if (!Array.isArray(entries)) throw new Error(`${file}: expected an array`);
    const previous = entries.find((entry) => entry.name === contract.name);
    if (previous?.address?.toLowerCase() === address.toLowerCase()) return;
    if (previous?.history?.some((old) => old.toLowerCase() === address.toLowerCase())) {
        throw new Error(
            `${contract.name}: address is already historical; refusing to overwrite a newer deployment`,
        );
    }
    if (previous) {
        const version = previous.version.match(/^(\d+)\.(\d+)\.(\d+)$/);
        if (!version) throw new Error(`${contract.name}: invalid address-file version`);
        previous.version = `${version[1]}.${version[2]}.${Number(version[3]) + 1}`;
        previous.history = [
            ...(previous.address ? [previous.address] : []),
            ...(previous.history || []),
        ];
        previous.address = address;
    } else {
        const inRegistry = contract.sourceName.startsWith('contracts/actions/');
        entries.push({
            name: contract.name,
            address,
            id: ethers.utils.id(contract.name).slice(0, 10),
            path: contract.sourceName,
            version: '1.0.0',
            inRegistry,
            changeTime: inRegistry ? '86400' : 0,
            registryIds: [],
            history: [],
        });
    }
    writeJson(file, entries, 4);
}

async function executeRun(
    run,
    {
        providers,
        getWallet,
        confirm,
        gasPrices,
        apiKey,
        confirmations = 1,
        timeoutMs = 300000,
        verify = verifySource,
        recordAddress = updateAddress,
        allowDuplicateBytecode = false,
        verificationMode = 'submit',
    },
) {
    const { manifest, bundles, save } = run;
    if (verificationMode !== 'skip' && !apiKey) throw new Error('ETHERSCAN_API_KEY is required');
    confirmations = Math.max(confirmations, manifest.confirmations || 1);
    manifest.confirmations = confirmations;
    for (let i = 0; i < manifest.networks.length; i++) {
        const entry = manifest.networks[i];
        await checkChain(providers[entry.network], entry.network);
        if (Object.values(entry.contracts).some((record) => !record.transactionHash)) {
            if (!allowDuplicateBytecode) {
                for (const contract of bundles[i].contracts) {
                    if (entry.contracts[contract.name].transactionHash) continue;
                    const duplicate = await findDuplicateDeployment(
                        providers[entry.network],
                        entry.network,
                        contract,
                    );
                    if (duplicate) {
                        throw new Error(
                            `${entry.network}/${contract.name}: identical runtime bytecode already exists at ${duplicate}; refusing a duplicate deployment because the explorer can reuse its Similar Match source. Use --allow-duplicate-bytecode only if this is intentional.`,
                        );
                    }
                }
            }
            const gas = gasPrices[entry.network] || entry.gas;
            gasOverrides(entry.network, gas);
            entry.gas = gas;
        }
    }
    save();
    const jobs = [];
    const failures = [];
    let pending = 0;
    try {
        for (let i = 0; i < manifest.networks.length; i++) {
            const entry = manifest.networks[i];
            const bundle = bundles[i];
            const provider = providers[entry.network];
            const needsWallet = Object.values(entry.contracts).some(
                (record) => !record.transactionHash,
            );
            const wallet = needsWallet ? await getWallet(entry.network, provider) : undefined;
            if (
                wallet &&
                Object.values(entry.contracts).some(
                    (record) => record.deployer && record.deployer !== wallet.address,
                )
            ) {
                throw new Error(
                    `${entry.network}: signer differs from earlier deployments in this run`,
                );
            }
            if (Object.values(entry.contracts).some((record) => !record.confirmed)) {
                const signer =
                    wallet?.address ||
                    Object.values(entry.contracts).find((record) => record.deployer)?.deployer;
                await confirm(entry.network, signer, entry.gas, entry.contracts);
            }
            for (const contract of bundle.contracts) {
                const record = entry.contracts[contract.name];
                await deployContract({
                    provider,
                    wallet,
                    network: entry.network,
                    contract,
                    record,
                    gas: entry.gas,
                    save,
                    confirmations,
                    timeoutMs,
                });
                if (!record.addressRecorded) {
                    recordAddress(entry.network, contract, record.address);
                    record.addressRecorded = true;
                    save();
                }
                if (!record.verified && verificationMode !== 'skip') {
                    const started = Date.now();
                    record.verificationStartedAt = new Date().toISOString();
                    save();
                    pending++;
                    const job = (async () => {
                        const result = await verify({
                            chainId: bundle.chainId,
                            address: record.address,
                            ...contract,
                            ...bundle.builds[contract.buildId],
                            apiKey,
                            guid: record.guid,
                            onGuid: (guid) => {
                                record.guid = guid;
                                if (guid) record.verificationSubmittedAt = new Date().toISOString();
                                save();
                            },
                            onStatus: (status) =>
                                console.log(`${entry.network}/${contract.name}: ${status}`),
                            timeoutMs,
                            verificationMode,
                        });
                        if (result?.verified) {
                            record.verified = true;
                            record.verifiedAt = new Date().toISOString();
                        }
                        save();
                        if (result?.verified) {
                            console.log(
                                `${entry.network}/${contract.name}: verified (${Math.round((Date.now() - started) / 1000)}s)`,
                            );
                        }
                    })();
                    const trackedJob = job.then(
                        () => {
                            pending--;
                        },
                        (error) => {
                            pending--;
                            failures.push(`${entry.network}/${contract.name}: ${error.message}`);
                            console.error(
                                `${entry.network}/${contract.name}: verification incomplete; resume to retry (${error.message})`,
                            );
                        },
                    );
                    jobs.push(trackedJob);
                }
            }
        }
    } finally {
        if (pending)
            console.log(`Waiting for ${pending} verification submission/status request(s).`);
        await Promise.all(jobs);
    }
    if (failures.length && verificationMode === 'wait')
        throw new Error(`Verification incomplete; use --resume to retry:\n${failures.join('\n')}`);
    if (failures.length) {
        console.error(
            `Verification submission incomplete for ${failures.length} contract(s); deployment succeeded and --resume can retry.`,
        );
    }
    return {
        failures,
        pendingVerifications: manifest.networks.reduce(
            (count, entry) =>
                count +
                Object.values(entry.contracts).filter((record) => record.guid && !record.verified)
                    .length,
            0,
        ),
    };
}

module.exports = {
    gasOverrides,
    checkChain,
    checkRuntime,
    waitForRuntime,
    findDuplicateDeployment,
    deployContract,
    updateAddress,
    executeRun,
};
