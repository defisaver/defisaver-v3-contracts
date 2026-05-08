# ➰ CurveWithdraw

Action that withdraws `tokens` from the pool via the `depositTarget` burning `lpToken`.

{% hint style="info" %}
User needs to approve the its wallet to pull `lpToken`.
{% endhint %}

{% hint style="info" %}
If one of the tokens  == `0xEeee...` the receiver will receive `WETH` instead of native `ETH`.
{% endhint %}

#### Parameters:

* `address from` - address where the LP tokens are pulled from.
* `address to` - address that will receive withdrawn tokens.
* `address depositTarget` - pool contract or zap deposit contract from which to withdraw.
* `uint256 burnAmount` - amount of LP tokens to burn for withdrawal.
* `uint8 flags` - _explained on the previous page_
* `uint256[] amounts` - amount of each token to withdraw.
