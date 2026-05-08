---
description: Record of all the Bundles created
icon: code-branch
---

# Bundle Storage

Bundles are grouped strategies that serve the same purpose and have the same triggers are grouped into a bundle. This is used for gas savings where users can subscribe to a bundle and the bundle will contain a few different recipes to accomplish the same goal. An example of this is to use a normal MakerRepay recipe or a Flash loan version; which one is better might vary from user to user or the current market situation. Bot executing the transaction can choose the best strategy from the bundle to which the user subscribed.

{% hint style="info" %}
Bundles can currently only be created by the owner, but there is a flag to open it so anyone can create bundles.
{% endhint %}

BundleStorage stores an array of bundles which are a list of strategies and a creator field.&#x20;

```solidity
/// @dev Group of strategies bundled together so user can sub to multiple strategies at once
/// @param creator Address of the user who created the bundle
/// @param strategyIds Array of strategy ids stored in StrategyStorage
struct StrategyBundle {
    address creator;
    uint64[] strategyIds;
}
```

{% hint style="info" %}
Strategies in a bundle must have the same triggers in their exact order.
{% endhint %}

Below is the interface of the contract:

```solidity
contract BundleStorage {
    /// @notice Adds a new bundle to array
    /// @dev Can only be called by auth addresses if it's not open to public
    /// @dev Strategies need to have the same number of triggers and ids exists
    /// @param _strategyIds Array of strategyIds that go into a bundle
    function createBundle(
        uint64[] memory _strategyIds
    ) public onlyAuthCreators sameTriggers(_strategyIds) returns (uint256);
    
    /// @notice Switch to determine if bundles can be created by anyone
    /// @dev Callable only by the owner
    /// @param _openToPublic Flag if true anyone can create bundles
    function changeEditPermission(bool _openToPublic) public onlyOwner;
    
    ////////////////////////////// VIEW METHODS /////////////////////////////////
    
    function getStrategyId(uint256 _bundleId, uint256 _strategyIndex) public view returns (uint256);
    function getBundle(uint _bundleId) public view returns (StrategyBundle memory);
    function getBundleCount() public view returns (uint256);
    function getPaginatedBundles(uint _page, uint _perPage) public view returns (StrategyBundle[] memory); 
}
```
