# McdHelper



> Helper methods for MCDSaverProxy





## Methods

### getCdpInfo

```solidity
function getCdpInfo(contract IManager _manager, uint256 _cdpId, bytes32 _ilk) external view returns (uint256, uint256)
```

Gets CDP info (collateral, debt)



#### Parameters

| Name | Type | Description |
|---|---|---|
| _manager | contract IManager | Manager contract
| _cdpId | uint256 | Id of the CDP
| _ilk | bytes32 | Ilk of the CDP

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined
| _1 | uint256 | undefined

### getOwner

```solidity
function getOwner(contract IManager _manager, uint256 _cdpId) external view returns (address)
```

Address that owns the DSProxy that owns the CDP



#### Parameters

| Name | Type | Description |
|---|---|---|
| _manager | contract IManager | Manager contract
| _cdpId | uint256 | Id of the CDP

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### vat

```solidity
function vat() external view returns (contract IVat)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IVat | undefined




