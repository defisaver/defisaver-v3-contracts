const solidity = {
    compilers: [
        {
            version: '0.8.24',
            settings: { optimizer: { enabled: true, runs: 1000 }, evmVersion: 'cancun' },
        },
    ],
};

const networks = {
    mainnet: {
        prefix: 'Mainnet',
        chainId: 1,
        rpcEnv: 'ETHEREUM_NODE',
        txType: 2,
        explorer: 'etherscan.io',
        keyEnv: 'ENCRYPTED_KEY',
        weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
    arbitrum: {
        prefix: 'Arbitrum',
        chainId: 42161,
        rpcEnv: 'ARBITRUM_NODE',
        txType: 0,
        explorer: 'arbiscan.io',
        keyEnv: 'ENCRYPTED_KEY_ARBITRUM',
        weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    },
    optimism: {
        prefix: 'Optimism',
        chainId: 10,
        rpcEnv: 'OPTIMISM_NODE',
        txType: 2,
        explorer: 'optimistic.etherscan.io',
        keyEnv: 'ENCRYPTED_KEY_OPTIMISTIC',
        weth: '0x4200000000000000000000000000000000000006',
    },
    base: {
        prefix: 'Base',
        chainId: 8453,
        rpcEnv: 'BASE_NODE',
        txType: 2,
        explorer: 'basescan.org',
        keyEnv: 'ENCRYPTED_KEY_BASE',
        weth: '0x4200000000000000000000000000000000000006',
    },
    linea: {
        prefix: 'Linea',
        chainId: 59144,
        rpcEnv: 'LINEA_NODE',
        txType: 0,
        explorer: 'lineascan.build',
        keyEnv: 'ENCRYPTED_KEY_LINEA',
        weth: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
    },
    plasma: {
        prefix: 'Plasma',
        chainId: 9745,
        rpcEnv: 'PLASMA_NODE',
        txType: 2,
        explorer: 'plasmascan.to',
        keyEnv: 'ENCRYPTED_KEY_PLASMA',
        weth: '0x6100E367285b01F48D07953803A2d8dCA5D19873',
    },
};

const wethAddress = Object.fromEntries(Object.values(networks).map((n) => [n.prefix, n.weth]));
const hardhatNetworks = () =>
    Object.fromEntries(
        Object.entries(networks).map(([name, n]) => [
            name,
            {
                url: process.env[n.rpcEnv],
                accounts: [process.env[`PRIV_KEY_${name.toUpperCase()}`]],
                chainId: n.chainId,
                name: name === 'optimism' ? 'optimistic' : name,
                txType: n.txType,
                blockExplorer: n.explorer,
                contractVerification: true,
            },
        ]),
    );

module.exports = { solidity, networks, wethAddress, hardhatNetworks };
