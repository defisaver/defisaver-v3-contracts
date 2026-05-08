---
icon: lock-keyhole
---

# Pause Control

Each contract can be killed (destroyed) by the Owner multisig, which effectively pauses any execution until further investigation is done. All of the contracts that can be self destructed don't hold any funds so there is no risk of locking user funds in that way.

In the DFSRegistry, the Owner multisig can revert the contract address to the previous one without any timelock. If the current contract has a fault, it's a quick way to fall back to the earlier version.

Enough signers for multisig can be assembled in less than one hour for any emergencies.
