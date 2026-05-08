---
description: Storage of users subscriptions to strategies/bundles
icon: code-branch
---

# Sub Storage

Users can subscribe to different strategies by providing their specific data and giving the necessary authorizations. `SubStorage` contract keeps track of all the users' subscriptions and provides ways for users to edit their subscriptions.

{% hint style="info" %}
In order to save on gas costs, the whole user subscription struct is not stored on chain. A hash is stored, user wallet address, and if the subscription is enabled.
{% endhint %}

The stored struct on `SubStorage` contract is `StoredSubData` and it's stored in an array. There is no way to change the ordering of the array and delete elements.

```solidity
/// @dev Actual data of the sub we store on-chain
/// @dev In order to save on gas we store a keccak256(StrategySub) and verify later on
/// @param userProxy Address of the users smart wallet/proxy
/// @param isEnabled Toggle if the subscription is active
/// @param strategySubHash Hash of the StrategySub data the user inputted
struct StoredSubData {
    bytes20 userProxy; // address but put in bytes20 for gas savings
    bool isEnabled;
    bytes32 strategySubHash;
}
```

The struct that is sent as calldata and hashed is:

```solidity
/// @dev Instance of a strategy, user supplied data
/// @param id Id of the strategy or bundle, depending on the isBundle bool
/// @param isBundle If true the id points to bundle, if false points directly to strategyId
/// @param triggerData User supplied data needed for checking trigger conditions
/// @param subData User supplied data used in recipe
struct StrategySub {
    uint64 id;
    bool isBundle;
    bytes[] triggerData;
    bytes32[] subData;
}
```

Below is the interface of the contract:

```solidity
contract SubStorage {
    /// @notice Adds users info and records StoredSubData, logs StrategySub
    /// @dev To save on gas we don't store the whole struct but rather the hash of the struct
    /// @param _sub Subscription struct of the user (is not stored on chain, only the hash)
    function subscribeToStrategy(
        StrategySub memory _sub
    ) public isValidId(_sub.id, _sub.isBundle) returns (uint256);
    
    /// @notice Updates the users subscription data
    /// @dev Only callable by proxy who created the sub.
    /// @param _subId Id of the subscription to update
    /// @param _sub Subscription struct of the user (needs whole struct so we can hash it)
    function updateSubData(
        uint256 _subId,
        StrategySub calldata _sub
    ) public onlySubOwner(_subId) isValidId(_sub.id, _sub.isBundle);
    
    /// @notice Enables the subscription for execution if disabled
    /// @dev Must own the sub. to be able to enable it
    /// @param _subId Id of subscription to enable
    function activateSub(
        uint _subId
    ) public onlySubOwner(_subId);
    
    /// @notice Disables the subscription (will not be able to execute the strategy for the user)
    /// @dev Must own the sub. to be able to disable it
    /// @param _subId Id of subscription to disable
    function deactivateSub(
        uint _subId
    ) public onlySubOwner(_subId);
    
    ///////////////////// VIEW ONLY FUNCTIONS ////////////////////////////
    
    function getSub(uint _subId) public view returns (StoredSubData memory);
    function getSubsCount() public view returns (uint256);
}
```
