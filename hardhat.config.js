require('dotenv').config();
require("@nomiclabs/hardhat-waffle");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_NODE,
        blockNumber: 11112401
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
    },
  },
  solidity: "0.7.3",
  settings: {
    optimizer: {
      enabled: false,
      runs: 1000
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
