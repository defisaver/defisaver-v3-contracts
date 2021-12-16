# IAaveIncentivesController









## Methods

### REWARD_TOKEN

```solidity
function REWARD_TOKEN() external view returns (address)
```



*for backward compatibility with previous implementation of the Incentives controller*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### claimRewards

```solidity
function claimRewards(address[] assets, uint256 amount, address to) external nonpayable returns (uint256)
```



*Claims reward for an user, on all the assets of the lending pool, accumulating the pending rewards*

#### Parameters

| Name | Type | Description |
|---|---|---|
| assets | address[] | undefined
| amount | uint256 | Amount of rewards to claim
| to | address | Address that will be receiving the rewards

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | Rewards claimed*

### claimRewardsOnBehalf

```solidity
function claimRewardsOnBehalf(address[] assets, uint256 amount, address user, address to) external nonpayable returns (uint256)
```



*Claims reward for an user on behalf, on all the assets of the lending pool, accumulating the pending rewards. The caller must be whitelisted via &quot;allowClaimOnBehalf&quot; function by the RewardsAdmin role manager*

#### Parameters

| Name | Type | Description |
|---|---|---|
| assets | address[] | undefined
| amount | uint256 | Amount of rewards to claim
| user | address | Address to check and claim rewards
| to | address | Address that will be receiving the rewards

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | Rewards claimed*

### configureAssets

```solidity
function configureAssets(address[] assets, uint256[] emissionsPerSecond) external nonpayable
```



*Configure assets for a certain rewards emission*

#### Parameters

| Name | Type | Description |
|---|---|---|
| assets | address[] | The assets to incentivize
| emissionsPerSecond | uint256[] | The emission for each asset

### getClaimer

```solidity
function getClaimer(address user) external view returns (address)
```



*Returns the whitelisted claimer for a certain address (0x0 if not set)*

#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The address of the user

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | The claimer address

### getRewardsBalance

```solidity
function getRewardsBalance(address[] assets, address user) external view returns (uint256)
```



*Returns the total of rewards of an user, already accrued + not yet accrued*

#### Parameters

| Name | Type | Description |
|---|---|---|
| assets | address[] | undefined
| user | address | The address of the user

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | The rewards*

### getUserUnclaimedRewards

```solidity
function getUserUnclaimedRewards(address user) external view returns (uint256)
```



*returns the unclaimed rewards of the user*

#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | the address of the user

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | the unclaimed user rewards

### handleAction

```solidity
function handleAction(address asset, uint256 userBalance, uint256 totalSupply) external nonpayable
```



*Called by the corresponding asset on any update that affects the rewards distribution*

#### Parameters

| Name | Type | Description |
|---|---|---|
| asset | address | The address of the user
| userBalance | uint256 | The balance of the user of the asset in the lending pool
| totalSupply | uint256 | The total supply of the asset in the lending pool*

### setClaimer

```solidity
function setClaimer(address user, address claimer) external nonpayable
```



*Whitelists an address to claim the rewards on behalf of another address*

#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The address of the user
| claimer | address | The address of the claimer



## Events

### ClaimerSet

```solidity
event ClaimerSet(address indexed user, address indexed claimer)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user `indexed` | address | undefined |
| claimer `indexed` | address | undefined |

### RewardsAccrued

```solidity
event RewardsAccrued(address indexed user, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user `indexed` | address | undefined |
| amount  | uint256 | undefined |

### RewardsClaimed

```solidity
event RewardsClaimed(address indexed user, address indexed to, address indexed claimer, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user `indexed` | address | undefined |
| to `indexed` | address | undefined |
| claimer `indexed` | address | undefined |
| amount  | uint256 | undefined |



