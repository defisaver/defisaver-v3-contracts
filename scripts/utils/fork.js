/* eslint-disable import/no-extraneous-dependencies */

const axios = require('axios');

const createFork = async () => {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-Access-Key': process.env.TENDERLY_ACCESS_KEY,
        };

        const body = { network_id: '1' };

        const forkRes = await axios.post('https://api.tenderly.co/api/v1/account/defisaver-v2/project/strategies/fork', body, { headers });

        return forkRes.data.simulation_fork.id;
    } catch (err) {
        console.log(err);
    }
};

const topUp = async (account) => {
    const headers = {
        'Content-Type': 'application/json',
        'X-Access-Key': process.env.TENDERLY_ACCESS_KEY,
    };

    const body = { accounts: [account], amount: 100000 };

    await axios.post(`https://api.tenderly.co/api/v1/account/defisaver-v2/project/strategies/fork/${process.env.FORK_ID}/balance`, body, { headers });
};

module.exports = {
    createFork,
    topUp,
};
