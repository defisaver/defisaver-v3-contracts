# defisaver-v3-contracts
All the contracts related to the Defi Saver ecosystem.

A detailed overview of the code can be found at [Defi Saver Docs](https://docs.defisaver.com).

### Install
Run `yarn` in the repository folder.  
You will also need to create a `.env` file based on `.env.example` and fill it in with the appropriate API keys.  
For a quick start, you can copy `.env.example` (which contains default values) and rename it to `.env`.

### Foundry tests

1. Ensure you have Foundry installed (check with `forge --version`).
2. Set the `ETHEREUM_NODE` variable in the `.env` file with a mainnet RPC URL.
3. Install dependencies:
   ```sh
   forge install foundry-rs/forge-std dapphub/ds-test --no-commit
    ```
4. Run tests:
    ```sh
    forge test
    ```

All tests are run from a forked state of mainnet.
You can specify the block number in `test-sol/config/config.json`.

To run only core tests:
```sh
forge test --mc TestCore
```
To run coverage on core:
```sh
bash run-core-coverage.sh
```


### Hardhat tests

Before running tests, compile all contracts:
```sh
npx hardhat compile
```
In `hardhat.config.js` hardhat network will fork mainnet by default.

You can change the block number from which the fork starts in the Hardhat config; note that if it starts from an old state, some tests might not work.

Running core tests:
```sh
npx hardhat test ./test/run-core-tests.js
```

Example of running tests with a specified network:
```sh
npx hardhat test ./test/aaveV3/full-test.js --network hardhat
```

### Custom hardhat tasks

`npx hardhat changeRepoNetwork [current-network-name] [new-network-name]` -  will change which contract the helper contracts import and extend

`npx hardhat customFlatten [contract-name]` -  will flatten contract that is ready for deployment and put it in contracts/flattened folder

`npx hardhat customVerify [contract-address] [contract-name] --network [hardhat-settings-network-name]`  - will verify on etherscan if a contract was deployed using a single file from customFlatten task 

`npx hardhat fladepver [contract-name] [gas-in-gwei] [nonce (optional)] --network [hardhat-settings-network-name]` - will flatten to a single file (save it in contracts/flattened), deploy from it and then verify it on etherscan

`npx hardhat encryptPrivateKey` - will encrypt the key with the secretWord. Put the output in .env as ENCRYPTED_KEY. Later on during deployment process it will ask you for secret word to decrypt the key for deployment use.

`npx hardhat deployOnFork [Contract1] [Contract2] [ContractN]` - deploys the specified contracts on a Tenderly fork. Before running this command, add the Tenderly fork ID to the .env file where you want to deploy.