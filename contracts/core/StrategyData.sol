// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

/// @title Struct Data in a separate contract soit can be used in multiple places
contract StrategyData {
    // struct Trigger {
    //     bytes32 id;
    //     bytes data;
    // }

    // struct Action {
    //     bytes32 id;
    //     bytes data;
    // }

    struct StrategyTemplate {
        string name;
        bytes32[] triggerIds;
        bytes32[] actionIds;

        uint8[][] paramMapping;
    }

    struct Strategy {
        uint templateId;
        address proxy;
        bool active;

        bytes[][] actionData;
        bytes[][] triggerData;
    }
}
