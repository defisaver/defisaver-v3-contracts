// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { Test } from "forge-std/Test.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { console } from "forge-std/console.sol";
import { Tokens } from "../utils/Tokens.sol";

contract Config is Tokens {

    string internal constant IS_SMART_WALLET_SAFE = "$.isSmartWalletSafe";
    string internal constant BLOCK_NUMBER = "$.blockNumber";

    using stdJson for string;

    struct ConfigData {
        string json;
    }

    struct TestPair {
        address supplyAsset;
        address borrowAsset;
    }

    /// @dev Fields have to be placed in alphabetical order for foundry parser to work 
    struct TestPairConfig {
        string borrowAsset;
        string supplyAsset;
    }
    struct ProtocolTestPairsConfig {
        TestPairConfig[] fullPairs;
        TestPairConfig[] lightPairs;
        bool lightTesting;
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

    function getTestPairsForProtocol(string memory _protocol) public returns (TestPair[] memory) {
        string memory testPairsKey = string(abi.encodePacked(".", _protocol));
        bytes memory testPairsEncoded = configData.json.parseRaw(testPairsKey);
        ProtocolTestPairsConfig memory t = abi.decode(testPairsEncoded, (ProtocolTestPairsConfig));
        if (t.lightTesting) {
            return _convertTestPairConfigToTestPair(t.lightPairs);    
        }
        return _convertTestPairConfigToTestPair(t.fullPairs);
    }

    function _convertTestPairConfigToTestPair(TestPairConfig[] memory _testPairConfigs) internal returns (TestPair[] memory) {
        TestPair[] memory testPairs = new TestPair[](_testPairConfigs.length);
        for (uint256 i = 0; i < _testPairConfigs.length; ++i) {
            testPairs[i] = TestPair({
                supplyAsset: getTokenAddressFromName( _testPairConfigs[i].supplyAsset),
                borrowAsset: getTokenAddressFromName(_testPairConfigs[i].borrowAsset)
            });
        }
        return testPairs;
    }
}
