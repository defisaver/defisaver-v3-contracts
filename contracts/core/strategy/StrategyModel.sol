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

    /// @dev Actual data of the sub we store on-chain
    /// @dev In order to save on gas we store a keccak256(StrategySub) and verify later on
    struct StoredSubData {
        bytes20 userProxy; // address but put in bytes20 for gas savings
        bool isEnabled;
        bytes32 strategySubHash;
    }

    /// @dev Instance of a strategy, user supplied data
    struct StrategySub {
        uint64 strategyId;
        bool isBundle; // if true, id points to a bundle id
        address userProxy;
        bytes[] triggerData;
        bytes32[] subData;
    }
}
