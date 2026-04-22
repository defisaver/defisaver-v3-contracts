# Introduction

## What is DeFi Saver?

{% hint style="info" %}
This is technical documentation about the DeFi Saver SDK and smart contracts. If you are looking for information about using the DeFi Saver app, please visit our [help center](https://help.defisaver.com/).
{% endhint %}

[DeFi Saver](https://defisaver.com) is an advanced management dashboard for all your DeFi needs.

The following documentation will go over the Solidity architecture that powers DeFi Saver and provide an in-depth explanation on how it works.

With DeFi Saver you can manage and interact between decentralized finance protocols. By creating strategies you can create advanced actions that will be executed automatically when certain conditions are met. The code is [open source](https://github.com/DecenterApps/defisaver-v3-contracts) and runs on the Ethereum blockchain and other L2 networks.

<figure><img src=".gitbook/assets/strategy-execution (1).png" alt=""><figcaption><p>Overview of main system components for executing strategy</p></figcaption></figure>

### Main concepts

| Term             | Description                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Action**       | A contract which will perform a specific action (e.g. Maker Payback). It inherits the standard ActionBase. Actions are proxy/logic contracts that are called through user's wallet (e.g Safe) and can’t hold any state.                                                                                                             |
| **Trigger**      | A contract which will perform a check if a certain condition is met (e.g. whether Maker Vault's collateralization ratio is lower than specified). It inherits the standard Trigger Interface.                                                                                                                                       |
| **Recipe**       | A recipe is a series of actions that are bundled together and executed in one sequence. Actions can share return values and use them as inputs in next actions.A recipe can be either executed immediately or through a strategy. If a flash loan action is used within a recipe, it must be the first action.                      |
| **Strategy**     | Is the main building block. A Strategy is an array of triggers and a recipe, where the recipe will be executed if all the specified trigger conditions are met. Users build their own strategies which are executed by bots.                                                                                                        |
| **Bundle**       | A list of strategies that have the same triggers but their recipes are different. A good example is a normal repay and a repay with a flash loan, would be in a repay bundle. The bot can choose which recipe is better at time of execution. Users can subscribe to a bundle, rather than multiple strategies to save on gas cost. |
| **Subscription** | Users subscribe to certain strategies and write their own data for that strategy. For instance if a strategy involves MakerDAO, user subscription might include the users vaultId. Users can subscribe to multiple strategies with different subscription data.                                                                     |
