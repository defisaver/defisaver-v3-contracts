# ISoloMargin









## Methods

### getAccountBalances

```solidity
function getAccountBalances(Account.Info account) external view returns (address[], struct Types.Par[], struct Types.Wei[])
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | Account.Info | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address[] | undefined
| _1 | Types.Par[] | undefined
| _2 | Types.Wei[] | undefined

### getAccountPar

```solidity
function getAccountPar(Account.Info account, uint256 marketId) external view returns (struct Types.Par)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | Account.Info | undefined
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Types.Par | undefined

### getAccountStatus

```solidity
function getAccountStatus(Account.Info account) external view returns (uint8)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | Account.Info | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### getAccountValues

```solidity
function getAccountValues(Account.Info account) external view returns (struct Monetary.Value, struct Monetary.Value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | Account.Info | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Monetary.Value | undefined
| _1 | Monetary.Value | undefined

### getAccountWei

```solidity
function getAccountWei(Account.Info account, uint256 marketId) external view returns (struct Types.Wei)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | Account.Info | undefined
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Types.Wei | undefined

### getAdjustedAccountValues

```solidity
function getAdjustedAccountValues(Account.Info account) external view returns (struct Monetary.Value, struct Monetary.Value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | Account.Info | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Monetary.Value | undefined
| _1 | Monetary.Value | undefined

### getEarningsRate

```solidity
function getEarningsRate() external view returns (struct Decimal.D256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Decimal.D256 | undefined

### getIsGlobalOperator

```solidity
function getIsGlobalOperator(address operator) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| operator | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### getIsLocalOperator

```solidity
function getIsLocalOperator(address, address) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### getLiquidationSpread

```solidity
function getLiquidationSpread() external view returns (struct Decimal.D256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Decimal.D256 | undefined

### getLiquidationSpreadForPair

```solidity
function getLiquidationSpreadForPair(uint256 heldMarketId, uint256 owedMarketId) external view returns (struct Decimal.D256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| heldMarketId | uint256 | undefined
| owedMarketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Decimal.D256 | undefined

### getMarginRatio

```solidity
function getMarginRatio() external view returns (struct Decimal.D256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Decimal.D256 | undefined

### getMarket

```solidity
function getMarket(uint256 marketId) external view returns (struct Storage.Market)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Storage.Market | undefined

### getMarketCachedIndex

```solidity
function getMarketCachedIndex(uint256 marketId) external view returns (struct Interest.Index)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Interest.Index | undefined

### getMarketCurrentIndex

```solidity
function getMarketCurrentIndex(uint256 marketId) external view returns (struct Interest.Index)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Interest.Index | undefined

### getMarketInterestRate

```solidity
function getMarketInterestRate(uint256 marketId) external view returns (struct Interest.Rate)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Interest.Rate | undefined

### getMarketInterestSetter

```solidity
function getMarketInterestSetter(uint256 marketId) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getMarketIsClosing

```solidity
function getMarketIsClosing(uint256 marketId) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### getMarketMarginPremium

```solidity
function getMarketMarginPremium(uint256 marketId) external view returns (struct Decimal.D256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Decimal.D256 | undefined

### getMarketPrice

```solidity
function getMarketPrice(uint256 marketId) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getMarketPriceOracle

```solidity
function getMarketPriceOracle(uint256 marketId) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getMarketSpreadPremium

```solidity
function getMarketSpreadPremium(uint256 marketId) external view returns (struct Decimal.D256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Decimal.D256 | undefined

### getMarketTokenAddress

```solidity
function getMarketTokenAddress(uint256 marketId) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getMarketTotalPar

```solidity
function getMarketTotalPar(uint256 marketId) external view returns (struct Types.TotalPar)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Types.TotalPar | undefined

### getMarketWithInfo

```solidity
function getMarketWithInfo(uint256 marketId) external view returns (struct Storage.Market, struct Interest.Index, struct Monetary.Price, struct Interest.Rate)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Storage.Market | undefined
| _1 | Interest.Index | undefined
| _2 | Monetary.Price | undefined
| _3 | Interest.Rate | undefined

### getMinBorrowedValue

```solidity
function getMinBorrowedValue() external view returns (struct Monetary.Value)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Monetary.Value | undefined

### getNumExcessTokens

```solidity
function getNumExcessTokens(uint256 marketId) external view returns (struct Types.Wei)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Types.Wei | undefined

### getNumMarkets

```solidity
function getNumMarkets() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getRiskLimits

```solidity
function getRiskLimits() external view returns (struct Storage.RiskLimits)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Storage.RiskLimits | undefined

### getRiskParams

```solidity
function getRiskParams() external view returns (struct Storage.RiskParams)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Storage.RiskParams | undefined

### isOwner

```solidity
function isOwner() external view returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### operate

```solidity
function operate(Account.Info[] accounts, Actions.ActionArgs[] actions) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| accounts | Account.Info[] | undefined
| actions | Actions.ActionArgs[] | undefined

### owner

```solidity
function owner() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### ownerAddMarket

```solidity
function ownerAddMarket(address token, address priceOracle, address interestSetter, Decimal.D256 marginPremium, Decimal.D256 spreadPremium) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined
| priceOracle | address | undefined
| interestSetter | address | undefined
| marginPremium | Decimal.D256 | undefined
| spreadPremium | Decimal.D256 | undefined

### ownerSetEarningsRate

```solidity
function ownerSetEarningsRate(Decimal.D256 earningsRate) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| earningsRate | Decimal.D256 | undefined

### ownerSetGlobalOperator

```solidity
function ownerSetGlobalOperator(address operator, bool approved) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| operator | address | undefined
| approved | bool | undefined

### ownerSetInterestSetter

```solidity
function ownerSetInterestSetter(uint256 marketId, address interestSetter) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined
| interestSetter | address | undefined

### ownerSetIsClosing

```solidity
function ownerSetIsClosing(uint256 marketId, bool isClosing) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined
| isClosing | bool | undefined

### ownerSetLiquidationSpread

```solidity
function ownerSetLiquidationSpread(Decimal.D256 spread) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| spread | Decimal.D256 | undefined

### ownerSetMarginPremium

```solidity
function ownerSetMarginPremium(uint256 marketId, Decimal.D256 marginPremium) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined
| marginPremium | Decimal.D256 | undefined

### ownerSetMarginRatio

```solidity
function ownerSetMarginRatio(Decimal.D256 ratio) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| ratio | Decimal.D256 | undefined

### ownerSetMinBorrowedValue

```solidity
function ownerSetMinBorrowedValue(Monetary.Value minBorrowedValue) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| minBorrowedValue | Monetary.Value | undefined

### ownerSetPriceOracle

```solidity
function ownerSetPriceOracle(uint256 marketId, address priceOracle) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined
| priceOracle | address | undefined

### ownerSetSpreadPremium

```solidity
function ownerSetSpreadPremium(uint256 marketId, Decimal.D256 spreadPremium) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined
| spreadPremium | Decimal.D256 | undefined

### ownerWithdrawExcessTokens

```solidity
function ownerWithdrawExcessTokens(uint256 marketId, address recipient) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined
| recipient | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### ownerWithdrawUnsupportedTokens

```solidity
function ownerWithdrawUnsupportedTokens(address token, address recipient) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined
| recipient | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```






### setOperators

```solidity
function setOperators(ISoloMargin.OperatorArg[] args) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| args | ISoloMargin.OperatorArg[] | undefined

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined




