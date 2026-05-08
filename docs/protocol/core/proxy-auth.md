---
icon: code-branch
---

# Proxy Auth

This contract receives the user's `DSProxy` permission to perform actions on their behalf.&#x20;

Each user that has their positions managed by a `DSProxy,` is permitting other contracts to perform actions on their behalf. In DeFi Saver the `ProxyAuth` contract receives that permission.

{% hint style="info" %}
Due to having permission for users' proxies, ProxyAuth is an immutable contract.
{% endhint %}

The `ProxyAuth` has only one function `callExecute` which is only callable by the `StrategyExecutor` contract. The function calls the users `DSProxy` and performs the configured actions. This allows for the rest of the system to change while keeping the proxy permission in a fixed contract.

Below is the interface of the contract:

```solidity
contract ProxyAuth {
    function callExecute(
        address _proxyAddr,
        address _contractAddr,
        bytes memory _callData
    ) public payable onlyExecutor;
}
```

