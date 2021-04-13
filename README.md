# defisaver-v3-contracts
All the contracts related to the Defi Saver ecosystem.

Detailed overview about that code can be found https://docs.defisaver.com

## To install
Run `npm install` or `yarn` in the repo folder.
You will also need to create a .env file as in the .env.example and fill it in with appropriate api keys.

## How to run tests

All of the tests are ran from the forked state of the mainnet. In the hardhat config you can change the 
block number the fork starts from. If it starts from an old state some tests might not work.

1. You first need to start a hardhat node from the forked mainnet with the following command:

`npx hardhat node --max-memory 8192  --fork ETHEREUM_NODE_URL`

2. In a different terminal window you can now deploy the recipe system:

`npm run deploy local deploy-core`

3. After that you can run the tests, for example:

`npm run test local ./mcd/mcd-supply.js`

## Common commands

`npm run compile` -  will compile all the contracts

`npm run deploy [network] [deploy-script]` - will deploy to the specified network by calling the script from the `/scripts` folder

`npm run test [network] [test-file]` - will run a test to the specified network by calling the script from the `/test` folder

`npm run verify [network] [contract-name]` - will verify contract based on address and arguments from `/deployments` folder
