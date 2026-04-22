---
icon: lock-keyhole
---

# Admin access control

DeFi Saver is a management app for decentralized finance positions with a varying level of admin controllable elements depending on the part of the app used.&#x20;

We want to highlight different layers of smart contracts that should be distinguished.

### 1 - User's Smart Wallet (Safe, DSProxy)

Each user has their own wallet through which they interact with the DFS contracts. Most contracts in the DFS system are logic/target contracts that don't hold and state or funds and are called through the users wallet. In order to execute actions for the user (strategy system) `auth` permission is given to the auth contract (`SafeModuleAuth` in case of Safe, `ProxyAuth` in case of DSProxy) which are immutable.

### 2 - Protocol actions smart contracts

All contracts are found [here](https://github.com/defisaver/defisaver-v3-contracts).

These are the smart contracts used by our recipe architecture and utilized by users when using the DeFi Saver interface (application).&#x20;

While these contracts are, for the most part, immutable, that isn't a specifically relevant characteristic, as they can be replaced in the registry and consequently in the UI when updating is needed due to adding support for more protocol interactions, optimising gas usage, or other reasons.&#x20;

These contracts have been audited by ConsenSys Diligence and Dedaub, with reports available [here](https://github.com/DecenterApps/defisaver-v3-contracts/tree/main/audits).

### 3 - DFS Registry

This smart contract holds the addresses of live DFS contracts retrievable by hashed contract name. With only the multisig owner being able to add new contracts, change existing ones or revert to the old one. When adding a new contract to the registry, a time lock can be added, so every time a new change of that contract is requested, it's locked from executing until enough time has passed. **Core contracts have the timelock time set to 7 days while other action contracts that are used in strategies have a set change time of 1 day.**

### 4 - Exchange Wrapper Allowlist

In order to validate wrapper exchange addresses this is a contract where we keep track of them. This contract holds the addresses of wrapper contracts (found [here](https://github.com/defisaver/defisaver-v3-contracts/tree/main/contracts/exchangeV3)) that can be added/removed from the contracts via the multisig owner. These wrapper contracts are used when swapping tokens via DFSSell action, which can only be done via pre-approved wrappers.

### 5 - Recipe Executor Contract

This contract is the starting point for executing recipes.&#x20;

It's a contract that doesn't hold state, owned by the multisig, which can kill or withdraw leftover funds from it. The functions on it are to be called through users wallet, along with all the necessary calldata. During recipe execution, the Action addresses that the proxy will execute are found through DFSRegistry, a state-holding contract that returns an address via bytes32 id (hashed name of the action).

### 6 - Automation smart contracts

Automation is a trustless, non-custodial service for management of collateralized debt positions.

The logic for executing user configured actions is contained within Automation smart contracts and user configurations are stored on chain.

Automation contracts are upgradeable, with any upgrades being locked behind a 24h timelock which can be activated by a 2/3 multisig (Admin) with actual upgrades initiable by a different 3/5 multisig (Owner).

For more information about the security of Automation, we recommend visiting our security audit report summary post [here](https://medium.com/defi-saver/defi-saver-automation-security-audit-summary-a883d4fde1b).

Automation smart contracts have been audited by Dedaub with the report available [here](https://github.com/DecenterApps/defisaver-contracts/blob/master/audits/Dedaub%20-%20DeFi%20Saver%20Automation%20Audit%20-%20February%202021.pdf).<br>
