// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

/// @title StrategyModel - contract that implements the structs used in the core system
contract StrategyModel {
    /// @dev Template/Class which defines a Strategy
    struct Strategy {
        string name;
        address creator;
        bytes4[] triggerIds; // not optimal for storage
        bytes4[] actionIds;
        uint8[][] paramMapping;
        // TODO: sibling strategies (here || StrategySub)?
    }

    struct Recipe {
        string name;
        bytes[] callData;
        bytes[] subData; // why is this here?
        bytes4[] actionIds;
        uint8[][] paramMapping;
    }

    /// @dev Instance of a strategy, user supplied data
    struct StrategySub {
        uint64 strategyId;
        bool active;
        address userProxy;
        bytes[] triggerData;
        bytes[] recipeData;
    }
}
