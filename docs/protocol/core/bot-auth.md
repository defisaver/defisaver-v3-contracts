---
icon: code-branch
---

# Bot Auth

This contract handles authority of who can call strategy executions on `StrategyExecutor`. The contract is registered in the `DFSRegistry` and `isApproved` function of the Bot Auth is called before each strategy execution.

In the current implementation, only DeFi Saver approved bots have access to calling strategy execution. While there are plans to allow other participants to run bots in the future, this is currently not allowed.&#x20;

{% hint style="info" %}
Besides checking the caller, BotAuth also has the `subId` as an input, allowing it to make decisions on who can execute based on the subscription or strategy.
{% endhint %}

Below is the interface of the contract:

```solidity
contract BotAuth {

    /// @notice Checks if the caller is approved for the specific subscription
    /// @dev First param is subId but it's not used in this implementation 
    /// @dev Currently auth callers are approved for all strategies
    /// @param _caller Address of the caller
    function isApproved(uint256, address _caller) public view returns (bool) {
        return approvedCallers[_caller];
    }

    /// @notice Adds a new bot address which will be able to call executeStrategy()
    /// @param _caller Bot address
    function addCaller(address _caller) public onlyOwner;

    /// @notice Removes a bot address so it can't call executeStrategy()
    /// @param _caller Bot address
    function removeCaller(address _caller) public onlyOwner;
}
```
