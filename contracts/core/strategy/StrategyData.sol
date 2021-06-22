// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

/// @title Struct data in a separate contract so it can be used in multiple places
contract StrategyData {
    struct Template {
        string name;
        bytes4[] triggerIds;
        bytes4[] actionIds;
        uint8[][] paramMapping;
    }

    struct Recipe {
        string name;
        bytes[] callData;
        bytes[] subData;
        bytes4[] actionIds;
        uint8[][] paramMapping;
    }

    struct Strategy {
        address proxy;
        bool active;
        uint64[] templateIds;
        uint64 posInUserArr;
        bytes[] subData;
        bytes[] triggerData;
    }
}
