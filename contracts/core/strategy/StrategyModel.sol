// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

/// @title StrategyModel - contract that implements the structs used in the core system
contract StrategyModel {
    struct Template {
        string name;
        bytes4[] triggerIds;
        bytes4[] actionIds;
        uint8[][] paramMapping;
    }

    struct Recipe {
        string name;
        bytes[] callData;
        bytes[] subData; // why is this here?
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
