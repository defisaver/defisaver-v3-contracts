// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

/// @title StrategyModel - contract that implements the structs used in the core system
contract StrategyModel {
    struct StrategyBundle {
        address creator;
        uint64[] strategyIds;
    }

    /// @dev Template/Class which defines a Strategy
    struct Strategy {
        string name;
        address creator;
        bytes4[] triggerIds;
        bytes4[] actionIds;
        uint8[][] paramMapping;
        bool continuous; // if the action is repeated (continous) or one time
    }

    struct Recipe {
        string name;
        bytes[] callData;
        bytes32[] subData;
        bytes4[] actionIds;
        uint8[][] paramMapping;
    }

    /// @dev Instance of a strategy, user supplied data
    struct SubApproval {
        address userProxy;
        uint256 lastUpdateBlock;    // used to fetch event quicker, adds 20k gas on subscribe and updateSubData
        bytes32 strategySubHash;
    }

    struct StrategySub {
        uint64 strategyId;
        bool active;
        bool isBundle; // if true, id points to a bundle id
        address userProxy;
        bytes[] triggerData;
        bytes32[] subData;
    }
}
