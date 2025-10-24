// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DSProxyPermission } from "../auth/DSProxyPermission.sol";

contract MockDSProxyPermission is DSProxyPermission {
    function giveProxyPermission(address _contractAddr) public {
        super._giveProxyPermission(_contractAddr);
    }

    function removeProxyPermission(address _contractAddr) public {
        super._removeProxyPermission(_contractAddr);
    }
}
