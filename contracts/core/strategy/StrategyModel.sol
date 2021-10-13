// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

/// @title StrategyModel - contract that implements the structs used in the core system
contract StrategyModel {
    /// @dev Template/Class which defines a Strategy
    struct Strategy {
        string name;
        address creator;
        bytes4[] triggerIds;
        bytes4[] actionIds;
        uint8[][] paramMapping;
        bool continuous; // if the action is repeated (continous) or one time
        uint64[] sibblingStrategies;
    }

    struct Recipe {
        string name;
        bytes[] callData;
        bytes32[] subData;
        bytes4[] actionIds;
        uint8[][] paramMapping;
    }

    /// @dev Instance of a strategy, user supplied data
    struct StrategySub {
        uint64 strategyId;
        bool active;
        address userProxy;
        bytes[] triggerData;
        bytes32[] subData;
    }
}
