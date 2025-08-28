/* eslint-disable import/no-extraneous-dependencies */

const axios = require("axios");
const { randomUUID } = require("crypto");

const chainIds = {
    mainnet: 1,
    optimism: 10,
    arbitrum: 42161,
    base: 8453,
};

const createFork = async (network) => {
    try {
        const headers = {
            "Content-Type": "application/json",
            "X-Access-Key": process.env.TENDERLY_ACCESS_KEY,
        };
        const chainId = network ? chainIds[network] : 1;
        const body = {
            slug: randomUUID(),
            fork_config: {
                network_id: chainId,
                block_number: "latest",
            },
            virtual_network_config: {
                chain_config: {
                    chain_id: chainId,
                },
            },
            sync_state_config: {
                enabled: false,
            },
            explorer_page_config: {
                enabled: true,
                verification_visibility: "src",
            },
        };
        const forkRes = await axios.post(
            "https://api.tenderly.co/api/v1/account/defisaver-v2/project/strategies/vnets",
            body,
            { headers }
        );
        const rpcUrl = forkRes.data.rpcs.find((e) => e.name === "Admin RPC").url;
        return rpcUrl;
    } catch (err) {
        console.log(err);
        return -1;
    }
};

const topUp = async (account, network = "mainnet") => {
    const body = {
        jsonrpc: "2.0",
        method: "tenderly_setBalance",
        params: [[account], "0x3635C9ADC5DEA00000"], // 1000 ETH
        id: "1234",
    };

    const headers = {
        "Content-Type": "application/json",
    };

    try {
        await axios.post(
            `https://virtual.${network}.rpc.tenderly.co/${process.env.FORK_ID}`,
            body,
            { headers }
        );
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
};

module.exports = {
    createFork,
    topUp,
    chainIds,
};
