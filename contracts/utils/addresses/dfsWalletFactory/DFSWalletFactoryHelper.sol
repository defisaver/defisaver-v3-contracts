// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDFSRegistry } from "../../../interfaces/core/IDFSRegistry.sol";
import { MainnetDFSWalletAddresses } from "./MainnetDFSWalletAddresses.sol";
import { DFSIds } from "../../DFSIds.sol";

contract DFSWalletFactoryHelper is MainnetDFSWalletAddresses {
    function _getDFSWalletFactory() internal view returns (address) {
        return IDFSRegistry(DFS_WALLET_REGISTRY_ADDR).getAddr(DFSIds.DFS_WALLET_FACTORY);
    }
}
