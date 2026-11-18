const axios = require('axios');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let nextRequestAt = 0;

async function explorerRequest(parameters) {
    // Share the request budget across concurrent network verifications.
    const delay = Math.max(0, nextRequestAt - Date.now());
    nextRequestAt = Date.now() + delay + 500;
    if (delay) await sleep(delay);
    try {
        const { chainid, module, action, apikey, ...body } = parameters;
        const options = { timeout: 30000, params: { chainid, module, action, apikey } };
        const url = 'https://api.etherscan.io/v2/api';
        const response =
            action === 'checkverifystatus' || action === 'getsourcecode'
                ? await axios.get(url, { ...options, params: { ...options.params, ...body } })
                : await axios.post(url, new URLSearchParams(body), options);
        return response.data;
    } catch (error) {
        throw new Error(
            `Explorer request failed (${error.response?.status || error.code || 'connection error'}); resume to retry`,
        );
    }
}

async function confirmExactSource({
    common,
    address,
    name,
    deadline,
    pollMs,
    request,
    wait,
    report,
}) {
    while (Date.now() < deadline) {
        const result = await request({ ...common, action: 'getsourcecode', address });
        const hasSourceList = result?.status === '1' && Array.isArray(result.result);
        const source = hasSourceList ? result.result[0] : undefined;
        const similarMatch = String(source?.SimilarMatch || '').trim();
        if (similarMatch) {
            throw new Error(
                `${name}: explorer only has Similar Match source from ${similarMatch}, not this exact compiler input`,
            );
        }
        if (source?.SourceCode && source?.ContractName) {
            if (source.ContractName !== name) {
                throw new Error(
                    `${name}: explorer published source as unexpected contract ${source.ContractName}`,
                );
            }
            report('exact verification confirmed');
            return;
        }
        const message = String(result?.result || result?.message || 'Unknown explorer response');
        if (
            !hasSourceList &&
            (result?.status !== '0' ||
                !/pending|queue|rate limit|unable to locate|not verified|try again|temporarily/i.test(
                    message,
                ))
        ) {
            throw new Error(`${name}: could not confirm exact verification: ${message}`);
        }
        report('waiting for exact verification status');
        await wait(pollMs);
    }
    throw new Error(`${name}: exact verification status timed out; resume to continue`);
}

async function verifySource(
    {
        chainId,
        address,
        sourceName,
        name,
        input,
        solcLongVersion,
        apiKey,
        guid,
        onGuid = () => {},
        onStatus = () => {},
        timeoutMs = 300000,
        pollMs = 5000,
        verificationMode = 'wait',
    },
    request = explorerRequest,
    wait = sleep,
) {
    if (!apiKey) throw new Error('ETHERSCAN_API_KEY is required');
    const common = { chainid: chainId, module: 'contract', apikey: apiKey };
    const deadline = Date.now() + timeoutMs;
    const reported = new Set();
    const report = (message) => {
        if (!reported.has(message)) {
            reported.add(message);
            onStatus(message);
        }
    };
    report(guid ? 'resuming verification' : 'submitting verification');
    let accepted = false;
    while (Date.now() < deadline) {
        const checking = Boolean(guid);
        const result = await request(
            checking
                ? { ...common, action: 'checkverifystatus', guid }
                : {
                      ...common,
                      action: 'verifysourcecode',
                      contractaddress: address,
                      sourceCode: JSON.stringify(input),
                      codeformat: 'solidity-standard-json-input',
                      contractname: `${sourceName}:${name}`,
                      compilerversion: `v${solcLongVersion}`,
                      constructorArguments: '',
                      licenseType: 3,
                  },
        );
        const message = typeof result?.result === 'string' && result.result.trim();
        if (!message || !['0', '1'].includes(result.status)) {
            throw new Error(`${name}: invalid explorer verification response`);
        }
        const failed = /^fail(?:ed|ure)?\b/i.test(message);
        if (
            /^(Pass - Verified|Already Verified|Contract source code already verified)/i.test(
                message,
            )
        ) {
            accepted = true;
            break;
        }
        if (!checking && result.status === '1') {
            guid = message;
            onGuid(guid);
            if (verificationMode === 'submit') {
                report('verification submitted; explorer processing continues asynchronously');
                return { submitted: true, verified: false };
            }
            report('verification submitted; waiting for explorer');
        } else if (
            checking &&
            /unable to locate.*guid|guid.*(?:not found|expired)|unknown g?uid/i.test(message)
        ) {
            guid = undefined;
            onGuid(null);
            report('verification receipt expired; resubmitting');
        } else if (checking && /^(?:pending(?: in queue)?|queued)$/i.test(message)) {
            report('verification queued at explorer');
            if (verificationMode === 'submit') return { submitted: true, verified: false };
        } else if (
            failed ||
            !/pending|queue|rate limit|unable to locate.*(contract|code)|does not have bytecode|not deployed|try again|temporarily/i.test(
                message,
            )
        ) {
            if (checking && failed) onGuid(null);
            throw new Error(`${name}: verification failed: ${message}`);
        } else if (/rate limit/i.test(message)) report('explorer rate limit; retrying');
        else if (!checking) report('waiting for explorer to index the deployment');
        else report('retrying verification status');
        await wait(pollMs);
    }
    if (!accepted) throw new Error(`${name}: verification timed out; resume to continue`);
    await confirmExactSource({
        common,
        address,
        name,
        deadline,
        pollMs,
        request,
        wait,
        report,
    });
    return { submitted: true, verified: true };
}

module.exports = { verifySource, confirmExactSource };
