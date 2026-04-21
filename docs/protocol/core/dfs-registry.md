---
icon: code-branch
---

# DFS Registry

All the contract addresses used in the protocol are registered in the `DFSRegistry` contract.&#x20;

Each contract has an unique ID and the same ID cannot be registered twice. A contract address can be fetched by calling `getAddr(id)`.

{% hint style="info" %}
`ID is a bytes4 value and it is a keccak256 of the contract name and the first 4 bytes from the result.`
{% endhint %}

```javascript
// Example of fetching the contract address
const contractAddr = await registry.getAddr(bytes4(utils.keccak256(utils.toUtf8Bytes(contractName))));
```

The first time a contract address is registered a `waitPeriod` is also set, which represents the number of seconds needed to pass before the contract address can be updated. In order to update the contract address you call `startContractChange` and wait for the entry's `waitPeriod` before you can call `approveContractChange`. This is done so that users have sufficient time to exit the system, or the owners have enough time to react in case of a malicious contract upgrade.

While the contract is in the process of an update, the update can be canceled using `cancelContractChange`.

{% hint style="info" %}
All the state modifying function in this contract are only callable by the owner.
{% endhint %}

Below is the interface of the contract:

```solidity
 
contract DFSRegistry {
    function getAddr(bytes4 _id) public view returns (address);

    function isRegistered(bytes4 _id) public view returns (bool);

    function addNewContract(bytes4 _id, address _contractAddr, uint256 _waitPeriod) public onlyOwner;
    
    function startContractChange(bytes4 _id, address _newContractAddr) public onlyOwner;

    function approveContractChange(bytes4 _id) public onlyOwner;
      
    function cancelContractChange(bytes4 _id) public onlyOwner;
      
    function startWaitPeriodChange(bytes4 _id, uint256 _newWaitPeriod) public onlyOwner;
    
    function approveWaitPeriodChange(bytes4 _id) public onlyOwner;
    
    function cancelWaitPeriodChange(bytes4 _id) public onlyOwner;
}
```
