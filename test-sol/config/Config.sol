// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { Test } from "forge-std/Test.sol";
import { stdJson } from "forge-std/StdJson.sol";

contract Config is Test {

    string internal constant IS_SMART_WALLET_SAFE = "$.isSmartWalletSafe";

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
}
