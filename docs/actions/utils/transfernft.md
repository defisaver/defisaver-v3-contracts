---
icon: hammer
---

# TransferNFT

### Description

Helper action to transfer a NFT token to the specified address.

> **Notes**
>
> The user's wallet must have approve if \_from != user's wallet.

### Action ID

`0xa3443678`

### SDK Action

```ts
const transferNFTAction = new dfs.actions.basic.TransferNFTAction(
    nftAddr,
    from,
    to,
    nftId
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param nftAddr Address of the NFT contract
    /// @param from Address of the sender
    /// @param to Address of the recipient
    /// @param nftId ID of the NFT to transfer
    struct Params {
        address nftAddr;
        address from;
        address to;
        uint256 nftId;
    }
```

### Return Value

```solidity
return bytes32(inputData.nftId);
```

### Events and Logs

```solidity
```
