---
icon: timer
---

# Triggers

A Trigger is a contract that will perform a check if certain conditions are met. It is used as a part of a Strategy to check when to execute a defined Recipe. Before executing recipe from a strategy RecipeExecutor contracts checks if every trigger in strategy is triggered and if needed rewrites some of the trigger parameters (e.g. updating to a new timestamp in the TimestampTrigger)

There is only one function that needs to be implemented and that is `isTriggered()` which returns a `bool` of the state of the trigger. When used within a strategy, all triggers need to return true for the Task to be executed.&#x20;

Functions that need to be implemented are:&#x20;

* `isTriggered()` which returns a `bool` of the state of the trigger. When used within a strategy, all triggers need to return true for the Task to be executed.&#x20;
* `isChangeable()` which returns a `bool` if the trigger can have it's sub data changed during a strategy execution.
* `changedSubData()` which returns `bytes` that the RecipeExecutor contract can overwrite the existing triggerData with. (RecipeExecutor line 116) This needs to be implemented only if isChangeable() returns true.

Triggers can accept external data from the bot caller if needed, but will generally rely on the subscription data.

{% hint style="info" %}
Triggers like actions can only be added by the admin through the DFSRegistry contract
{% endhint %}

Below is the interface of the TriggerInterface:

```solidity
abstract contract ITrigger {
    function isTriggered(bytes memory, bytes memory) public virtual returns (bool);
    function isChangeable() public virtual returns (bool);
    function changedSubData(bytes memory) public virtual returns (bytes memory);
}

```
