require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@tenderly/hardhat-tenderly");
require("@nomiclabs/hardhat-ethers");
require('hardhat-log-remover');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    local: {
			url: 'http://127.0.0.1:8545'
	  },
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_NODE,
        blockNumber: 11171509
      }
    },
    mainnet: {
        url: process.env.ALCHEMY_NODE,
        accounts: [process.env.PRIV_KEY_MAINNET],
        gasPrice: 40000000000
    },
    kovan: {
        url: process.env.INFURA_NODE_KOVAN,
        accounts: [process.env.PRIV_KEY_KOVAN],
        gasPrice: 1600000000
    }
  },
  solidity: "0.7.4",
  settings: {
    optimizer: {
      enabled: false,
      runs: 1000
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
},
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  tenderly: {
    username: process.env.TENDERLY_USERNAME,
    project: process.env.TENDERLY_PROJECT,
    forkNetwork: "1"
  }
};
