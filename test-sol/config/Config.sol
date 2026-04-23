// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { stdJson } from "forge-std/StdJson.sol";
import { Tokens } from "../utils/Tokens.sol";

contract Config is Tokens {
    string internal constant IS_SMART_WALLET_SAFE = "$.isSmartWalletSafe";

    using stdJson for string;

    struct ConfigData {
        string json;
    }

    struct TestPair {
        address supplyAsset;
        address borrowAsset;
    }

    /// @dev Fields have to be placed in alphabetical order for foundry parser to work
    /// @dev Seems that the comment above is not true anymore, but leaving comments here in case we need to revert to it. Currently on version 1.6.1 of foundry.
    struct TestPairConfig {
        string supplyAsset;
        string borrowAsset;
    }

    struct ProtocolTestPairsConfig {
        TestPairConfig[] fullPairs;
        TestPairConfig[] lightPairs;
        bool lightTesting;
    }

    ConfigData internal configData;

    function initConfig() internal {
        if (bytes(configData.json).length == 0) {
            // forge-lint: disable-next-line(unsafe-cheatcode)
            configData.json = vm.readFile(
                string(abi.encodePacked(vm.projectRoot(), "/test-sol/config/config.json"))
            );
        }
    }

    function isSmartWalletSafe() internal view returns (bool) {
        return configData.json.readBool(IS_SMART_WALLET_SAFE);
    }

    /// @notice Block for (chain, testName). 0 = fork latest. Lookup: .<testName>.<chain> then .defaultBlocks.<chain> (fallback for tests not in config).
    function getBlockNumberForChainAndTest(string memory _chain, string memory _testName)
        public
        view
        returns (uint256)
    {
        if (bytes(_testName).length == 0) return 0;
        string memory path = string(abi.encodePacked(".", _testName, ".", _chain));
        if (vm.keyExistsJson(configData.json, path)) {
            return configData.json.readUint(string(abi.encodePacked("$", path)));
        }
        string memory defaultPath = string(abi.encodePacked(".defaultBlocks.", _chain));
        if (vm.keyExistsJson(configData.json, defaultPath)) {
            return configData.json.readUint(string(abi.encodePacked("$", defaultPath)));
        }
        return 0;
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

    function _convertTestPairConfigToTestPair(TestPairConfig[] memory _testPairConfigs)
        internal
        returns (TestPair[] memory)
    {
        TestPair[] memory testPairs = new TestPair[](_testPairConfigs.length);
        for (uint256 i = 0; i < _testPairConfigs.length; ++i) {
            testPairs[i] = TestPair({
                supplyAsset: getTokenAddressFromName(_testPairConfigs[i].supplyAsset),
                borrowAsset: getTokenAddressFromName(_testPairConfigs[i].borrowAsset)
            });
        }
        return testPairs;
    }
}
