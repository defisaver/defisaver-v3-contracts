// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

/// @title Struct Data in a separate contract soit can be used in multiple places
contract StrategyData {
    struct Trigger {
        bytes32 id;
        bytes data;
        uint8[] inputMapping;
    }

    struct Action {
        bytes32 id;
        bytes data;
        uint8[] inputMapping;
    }

    struct Strategy {
        string name;
        address proxy;
        bool active;
        uint256[] triggerIds;
        uint256[] actionIds;
    }
}
