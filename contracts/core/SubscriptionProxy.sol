// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../DS/DSGuard.sol";
import "../DS/DSAuth.sol";
import "./Subscriptions.sol";

/// @title Handles auth and calls subscription contract
contract SubscriptionProxy is StrategyData {
    address public constant FACTORY_ADDRESS = 0x5a15566417e6C1c9546523066500bDDBc53F88C7;

    function subscribe(
        string memory _name,
        address _proxyAuthAddr,
        address _subAddr,
        Trigger[] memory _triggers,
        Action[] memory _actions
    ) public {
        address currAuthority = address(DSAuth(address(this)).authority());
        DSGuard guard = DSGuard(currAuthority);

        if (currAuthority == address(0)) {
            guard = DSGuardFactory(FACTORY_ADDRESS).newGuard();
            DSAuth(address(this)).setAuthority(DSAuthority(address(guard)));
        }

        guard.permit(_proxyAuthAddr, address(this), bytes4(keccak256("execute(address,bytes)")));

        Subscriptions(_subAddr).subscribe(_name, _triggers, _actions);
    }

    function update(
        address _subAddr,
        uint256 _subId,
        Trigger[] memory _triggers,
        Action[] memory _actions
    ) public {
        Subscriptions(_subAddr).update(_subId, _triggers, _actions);
    }

    // TODO: should we remove permission if no more strategies left?
    function unsubscribe(address _subAddr, uint256 _subId) public {
        Subscriptions(_subAddr).unsubscribe(_subId);
    }
}
