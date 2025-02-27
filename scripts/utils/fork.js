/* eslint-disable import/no-extraneous-dependencies */

const axios = require('axios');

const chainIds = {
    mainnet: 1,
    optimism: 10,
    arbitrum: 42161,
};

const createFork = async (network) => {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-Access-Key': process.env.TENDERLY_ACCESS_KEY,
        };

        let chainId = '1';

        if (network) {
            chainId = chainIds[network];
        }

        const body = { network_id: chainId };

        const forkRes = await axios.post('https://api.tenderly.co/api/v1/account/defisaver-v2/project/strategies/fork', body, { headers });

        return forkRes.data.simulation_fork.id;
    } catch (err) {
        console.log(err);
        return -1;
    }
};

const topUp = async (account) => {
    const body = {
        jsonrpc: '2.0',
        method: 'tenderly_setBalance',
        params: [[account], '0xFFFFFFFFFFFFFFFFFF'], // ~4700 ETH
        id: '1234',
    };

    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        await axios.post(`https://virtual.mainnet.rpc.tenderly.co/${process.env.FORK_ID}`, body, { headers });
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
};

module.exports = {
    createFork,
    topUp,
    chainIds,
};
