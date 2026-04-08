---
icon: chess-knight
---

# Strategies

Strategy is a collection of triggers (conditions) and actions (Recipe) executed once the specified conditions are met. You can think of Strategies as Recipes that are not manually executed by the user but rather executed at some point in the future by bots when the conditions are met. Strategies are executed by Defi Saver backend bots, which themselves do not hold permission to users' funds. All execution is done through the user's wallet (`Safe,DSProxy`), which gives authorization to a smart contract (`SafeModuleAuth, ProxyAuth`) to execute the Strategy once it's possible.&#x20;

An example of a strategy would be a simple Repay strategy for Maker vaults, which would take Dai earning yield in another protocol and pay back the users vault if it goes below a specific ratio. Here we would have a `McdRatioTrigger` as an only trigger to the strategy and a recipe that would withdraw yield and call `McdPayback`.&#x20;

The costs of sending the transaction are taken from the user's position, and each strategy specifies where and in what tokens that fee will come from. The user does not have to give any allowances or maintain any balances in certain wallets, as for instance, dai generated from a Maker vault would be used for payment.&#x20;

There are two types of strategies that can be created:

1. **Continuous** - Can be executed multiple times if the trigger conditions are met. An example is a maker repay strategy that might repay the users various times when price crashes happen
2. **One time** - A strategy triggered only once and after that would be disabled. Users can manually re-enable the action, so it is eligible to execute again.&#x20;

### Roles

* **Strategy designer** - A person who creates a strategy, which will enable other users to subscribe to that strategy. Strategy designer will create a combination of triggers and actions and how values are mapped to it. Only the DFS team will be creating strategies in the first version of the system, but that restriction will be lifted in the next versions.&#x20;
* **Subscribers** - Users who subscribe to a certain strategy provide their own subscription data that represent the positions that they want to automate. Subscribers will be able to choose and subscribe to strategies on the interface easily and it won't require any advanced knowledge.
* **Bots** - Backend code built by the DFS team monitors users' subscriptions to strategies and triggers them accordingly. Bots are the only ones with the authority to trigger actions, but they do not hold user funds or control user positions. Smart contracts hold authority and bots are the only ones that can call the smart contract actions.
