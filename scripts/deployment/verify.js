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
            action === 'checkverifystatus'
                ? await axios.get(url, { ...options, params: { ...options.params, ...body } })
                : await axios.post(url, new URLSearchParams(body), options);
        return response.data;
    } catch (error) {
        throw new Error(
            `Explorer request failed (${error.response?.status || error.code || 'connection error'}); resume to retry`,
        );
    }
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
        const message = String(result.result || 'Unknown explorer response');
        if (
            /^(Pass - Verified|Already Verified|Contract source code already verified)/i.test(
                message,
            )
        )
            return;
        if (!checking && result.status === '1') {
            guid = message;
            onGuid(guid);
            report('verification submitted; waiting for explorer');
        } else if (checking && /unable to locate.*guid|guid.*not found/i.test(message)) {
            guid = undefined;
            onGuid(null);
            report('verification receipt expired; resubmitting');
        } else if (
            !/pending|queue|rate limit|unable to locate.*(contract|code)|does not have bytecode|not deployed|try again|temporarily/i.test(
                message,
            )
        ) {
            if (checking) onGuid(null);
            throw new Error(`${name}: verification failed: ${message}`);
        } else if (/rate limit/i.test(message)) report('explorer rate limit; retrying');
        else if (!checking) report('waiting for explorer to index the deployment');
        else report('verification queued at explorer');
        await wait(pollMs);
    }
    throw new Error(`${name}: verification timed out; resume to continue`);
}

module.exports = { verifySource };
