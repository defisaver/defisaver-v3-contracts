---
icon: code-branch
---

# Core

All recipes and strategies are executed through the Core system of contracts.&#x20;

Core contracts implement actions and triggers alongside authorization handling and other functionalities. All contracts except `DFSRegistry` and auth contracts,`ProxyAuth` and `SafeModuleAuth`, are upgradable (through a time lock), but updates to the core system should not be frequent.
