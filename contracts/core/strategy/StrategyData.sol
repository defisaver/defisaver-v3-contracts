// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

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
        uint64 templateId;
        uint64 posInUserArr;
        bytes[] subData;
        bytes[] triggerData;
    }
}
