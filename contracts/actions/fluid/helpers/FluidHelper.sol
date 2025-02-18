// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {MainnetFluidAddresses} from "./MainnetFluidAddresses.sol";
import {DFSMath} from "../../../utils/math/DFSMath.sol";

//solhint-disable-next-line no-empty-blocks
contract FluidHelper is DFSMath, MainnetFluidAddresses {

    uint256 internal constant T1_VAULT_TYPE = 1e4; // 1_coll:1_debt
    uint256 internal constant T2_VAULT_TYPE = 2e4; // 2_coll:1_debt (smart coll)
    uint256 internal constant T3_VAULT_TYPE = 3e4; // 1_coll:2_debt (smart debt)
    uint256 internal constant T4_VAULT_TYPE = 4e4; // 2_coll:2_debt (smart coll, smart debt)
}
