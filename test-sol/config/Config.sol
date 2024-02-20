// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { Test } from "forge-std/Test.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { console } from "forge-std/console.sol";

contract Config is Test {

    string internal constant IS_SMART_WALLET_SAFE = "$.isSmartWalletSafe";
    string internal constant BLOCK_NUMBER = "$.blockNumber";

    using stdJson for string;

    struct ConfigData {
        string json;
    }
    ConfigData internal configData;

    function initConfig() internal {
        if (bytes(configData.json).length == 0) {
            configData.json = vm.readFile(
                string(abi.encodePacked(vm.projectRoot(), "/test-sol/config/config.json"))
            );
        }
    }

    function isSmartWalletSafe() internal view returns (bool) {
        return configData.json.readBool(IS_SMART_WALLET_SAFE);
    }

    function getBlockNumber() public view returns (uint256) {
        return configData.json.readUint(BLOCK_NUMBER);
    }

    function getBlockNumberForTestIfExist(string memory _testName) public view returns (uint256) {
        string memory testBlockNumberKey = string(abi.encodePacked(".", _testName, ".blockNumber"));

        if (vm.keyExists(configData.json, testBlockNumberKey)) {
            return configData.json.readUint(testBlockNumberKey);
        }
        return getBlockNumber();
    }
}
