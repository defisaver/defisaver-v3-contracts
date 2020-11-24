// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

/// @title Struct Data in a separate contract soit can be used in multiple places
contract StrategyData {
    struct Template {
        string name;
        bytes32[] triggerIds;
        bytes32[] actionIds;
        uint8[][] paramMapping;
    }

    struct Task {
        string name;
        bytes[][] callData;
        bytes[][] subData;
        bytes32[] ids;
        uint8[][] paramMapping;
    }

    struct Strategy {
        uint templateId;
        address proxy;
        bytes[][] actionData;
        bytes[][] triggerData;
        bool active;

        uint posInUserArr;
    }
}
