---
icon: sack-dollar
---

# TxSaver

TxSaver is a service that executes transactions on behalf of users. Users using the DefiSaver frontend sign their transaction, that will be executed through their own personal safe wallet. Signature validation is done by the safe wallet. Given that anyone can execute a signed safe transaction, we execute that tx for the user, sending the signed tx to our backend that calls the `TxSaverExecutor` contract. It enables us to offer MEV protection and protection against failed tx, better price and order routes and also remove the complexity of sending a tx from the user. Users sign a maximum amount of fee tokens they are willing to pay for a transaction. Current contract architecture supports paying fees in various form:

* From the user’s position, when executing recipes that has a sell action.
* From the smart wallet owner's EOA (Externally Owned Account), if the safe wallet is a 1/1 wallet.
* From the smart wallet itself, if the safe wallet is an n/m wallet.

{% hint style="info" %}
From the release only first option will be enabled and supported, meaning users will have option to send transactions when executing advanced DefSaver actions and paying gas cost from their position. Also, transactions that have msg.value will not be sent through TxSaver.
{% endhint %}

### Notice

* TxSaver **only** works with the safe wallet, as we take a safe tx that the user signs and execute it for the user.
* It requires no additional authorization as anyone can execute a signed safe tx on behalf of the user.
* Main and the only entry point is **TxSaverExecutor** which later on calls the already existing system of the **RecipeExecutor** with addition of handling fee taking and order injection.
*   Backend has an option to inject a new exchange route if the old one is outdated or if we can fetch a

    better one (only the route is injected, amount and minPrice from the user signed tx are

    **immutable**).
* Fee for the tx execution is taken from the user position in source token before swap execution inside contracts.
*   Backend send the gasUsed for the tx as there is no way on the solidity side to calculate the exact

    amount spent (with gas refunds taken into account). There are limits that the fee can't be larger

    than the maximum signed by the user.
* Our own backend is the only one sending the tx, and has necessary checks that the fee and gasCost are correct.
* Tx has a deadline parameter so we can't send signed tx later in time.
* For tx that take fee from the position, fee taking is inside **DFSSell** action.

### TxSaver Smart Contracts

<figure><img src="../.gitbook/assets/txSaverDiagram.png" alt=""><figcaption><p>TxSaver Smart Contracts Architecture With Existing Recipe System</p></figcaption></figure>

**TxSaverExecutor**

This is the main entry point for executing TxSaver transactions, with one `executeTx` function that can only be called by our bots:

```solidity
/// @notice Execute a TxSaver transaction signed by user
/// @notice When taking fee from position, gas fee is taken inside sell action.
/// @notice Right now, we only support fee taking from position if recipe has sell action
///
/// @notice when fee is taken from EOA/wallet:
/// @notice If wallet is 1/1, gas fee is taken from eoa
/// @notice If wallet is n/m, gas fee is taken from wallet itself
///
/// @param _params SafeTxParams data needed to execute safe tx
/// @param _estimatedGas Estimated gas usage for the transaction
/// @param _l1GasCostInEth Additional gas cost added for Optimism based L2s
/// @param _injectedExchangeData Exchange data injected by backend
function executeTx(
    SafeTxParams calldata _params,
    uint256 _estimatedGas,
    uint256 _l1GasCostInEth,
    DFSExchangeData.InjectedExchangeData calldata _injectedExchangeData
) external {
```

**BotAuthForTxSaver**

Handles authorization of who can call TxSaverExecutor.

**TxSaverBytesTransientStorage**

Helper contract used for storing injected order and params for gas fee taking. This contract is part of TxSaverExecutor.

### Additional signature data

Data for safe transaction is represented in struct `SafeParams` :

```solidity
/// @notice Data needed to execute a Safe transaction
/// @param safe Address of the Safe wallet
/// @param refundReceiver Injected address to track safe points
/// @param data Data payload of Safe transaction
/// @param signatures Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
struct SafeTxParams {
    address safe;
    address refundReceiver;
    bytes data;
    bytes signatures;
}
```

`Data` field represents encoded call to function `executeRecipeFromTxSaver`  inside `RecipeExecutor` :

```solidity
/// @notice Called by TxSaverExecutor through safe wallet
/// @param _currRecipe Recipe to be executed
/// @param _txSaverData TxSaver data signed by user
function executeRecipeFromTxSaver(
    Recipe calldata _currRecipe,
    TxSaverSignedData calldata _txSaverData
) public payable {
```

Besides the regular recipe, the tx will have additional data represented in a struct `TxSaverSignedData` :

```solidity
/// @dev Data needed when signing tx saver transaction
/// @param maxTxCostInFeeToken Max tx cost user is willing to pay in fee token
/// @param feeToken Address of the token user is willing to pay fee in
/// @param tokenPriceInEth Price of the token in ETH
/// @param deadline Deadline for the relay transaction to be executed
/// @param shouldTakeFeeFromPosition Flag to indicate if fee should be taken from position, otherwise from EOA/wallet
struct TxSaverSignedData {
    uint256 maxTxCostInFeeToken;
    address feeToken;
    uint256 tokenPriceInEth;
    uint256 deadline;
    bool shouldTakeFeeFromPosition;
}
```

Since only taking the fee from the position is enabled in the first iteration, `shouldTakeFeeFromPosition` will be set to `true`. Additionally, `feeToken` will not be used, as the fee will be taken from the source token from position anyway.

### Security

The system is both internally and externally audited, with the audit available at: [security-and-audits](security-and-audits/ "mention")
