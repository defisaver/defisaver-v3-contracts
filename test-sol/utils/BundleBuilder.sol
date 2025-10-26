// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { BundleStorage } from "../../contracts/core/strategy/BundleStorage.sol";
import { IAdminVault } from "../../contracts/interfaces/auth/IAdminVault.sol";
import { Addresses } from "./Addresses.sol";
import { CheatCodes } from "./CheatCodes.sol";

contract BundleBuilder is CheatCodes {
    function init(uint64[] memory _strategyIds) public returns (uint256 bundleId) {
        BundleStorage bundle = BundleStorage(Addresses.BUNDLE_ADDR);

        cheats.startPrank(IAdminVault(bundle.adminVault()).owner());
        bundleId = bundle.createBundle(_strategyIds);
        cheats.stopPrank();
    }
}
