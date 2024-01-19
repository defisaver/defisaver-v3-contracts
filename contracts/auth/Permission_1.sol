// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./SafeModulePermission.sol";
import "./DSProxyPermission.sol";
import "../interfaces/IDSProxyFactory.sol";
import "../utils/ds-proxy-factory/DSProxyFactoryHelper.sol";

///@dev Duplicate of Permission contract without CheckWalletType inheritance
///@dev Used to avoid Linearization graph problem in some actions that require regular Permission contract
contract Permission_1 is DSProxyPermission, SafeModulePermission, DSProxyFactoryHelper  {   
    /// @dev Called from the context of the wallet we are using
    function giveWalletPermission() public {
        bool isDSProxy = isWalletDSProxy(address(this));

        address authContract = isDSProxy ? PROXY_AUTH_ADDRESS : MODULE_AUTH_ADDRESS;

        isDSProxy ? giveProxyPermission(authContract) : enableModule(authContract);
    }

    function isWalletDSProxy(address _proxy) public view returns (bool) {
        return IDSProxyFactory(PROXY_FACTORY_ADDR).isProxy(_proxy);
    }
}