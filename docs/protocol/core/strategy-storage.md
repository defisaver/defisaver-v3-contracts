---
description: Record of all the Strategies created
icon: code-branch
---

# Strategy Storage

All the data associated with the Strategies are stored in this contract; users can subscribe to specific strategies that are created.&#x20;

`StrategyStorage` stores an array of strategies (struct detailed below).

```solidity
/// @dev Template/Class which defines a Strategy
/// @param name Name of the strategy useful for logging what strategy is executing
/// @param creator Address of the user which created the strategy
/// @param triggerIds Array of identifiers for trigger - bytes4(keccak256(TriggerName))
/// @param actionIds Array of identifiers for actions - bytes4(keccak256(ActionName))
/// @param paramMapping Describes how inputs to functions are piped from return/subbed values
/// @param continuous If the action is repeated (continuos) or one time
struct Strategy {
    string name;
    address creator;
    bytes4[] triggerIds;
    bytes4[] actionIds;
    uint8[][] paramMapping;
    bool continuous;
}
```

{% hint style="info" %}
Strategies can currently only be created by the owner, but there is a flag to open it so anyone can create strategies.
{% endhint %}

Below is the interface of the contract:

```solidity
contract StrategyStorage {
    /// @notice Creates a new strategy and writes the data in an array
    /// @dev Can only be called by auth addresses if it's not open to public
    /// @param _name Name of the strategy useful for logging what strategy is executing
    /// @param _triggerIds Array of identifiers for trigger - bytes4(keccak256(TriggerName))
    /// @param _actionIds Array of identifiers for actions - bytes4(keccak256(ActionName))
    /// @param _paramMapping Describes how inputs to functions are piped from return/subbed values
    /// @param _continuous If the action is repeated (continuos) or one time
    function createStrategy(
        string memory _name,
        bytes4[] memory _triggerIds,
        bytes4[] memory _actionIds,
        uint8[][] memory _paramMapping,
        bool _continuous
    ) public onlyAuthCreators returns (uint256);
    
    /// @notice Switch to determine if bundles can be created by anyone
    /// @dev Callable only by the owner
    /// @param _openToPublic Flag if true anyone can create bundles
    function changeEditPermission(bool _openToPublic) public onlyOwner;
    
    ////////////////////////////// VIEW METHODS /////////////////////////////////

    function getStrategy(uint _strategyId) public view returns (Strategy memory);
    function getStrategyCount() public view returns (uint256);
    function getPaginatedStrategies(uint _page, uint _perPage) public view returns (Strategy[] memory);
}
```
