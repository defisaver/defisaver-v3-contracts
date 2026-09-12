# ftDNMM circuit-breaker sizing

`FtDnmmWithdraw` and `FtDnmmBorrow` keep exact requested amounts and propagate
protocol reverts. `FtDnmmWithdraw(uint256.max)` requests the wallet's full
available (unreserved) collateral. It does not cap that amount to breaker capacity.
This follows the existing Aave V3 and Morpho Blue actions, which pass requested
amounts to their lending protocols without silently reducing them to liquidity.

Use `FtDnmmView.getOutflowCapacity(asset, wallet)` when sizing a recipe. The result
is the current circuit-breaker allowance in underlying token units. Both withdraw
and borrow consume this allowance. Pass the DFS wallet, since PositionsManager
sends assets to that wallet before the action forwards them to its final `to`.
The CB's recipient whitelist applies to the wallet at that intermediate step.

The view discovers the wrapper through PositionsManager's config and reads
`wrapper.circuitBreaker()` at runtime. It normalizes each strategy's capital to
underlying decimals exactly as the wrapper does. It uses the CB's time-adjusted
buffers except when `lastUpdate == block.timestamp`: the outflow path then uses
raw buffers, while the CB's own `withdrawalCapacity()` still clamps the main
buffer to the current TVL cap. This distinction matters within multi-action
recipes and after a same-timestamp TVL or configuration change.

`uint256.max` means no CB limit: no configured breaker, a paused breaker, a
whitelisted wallet, an unprotected wrapper (the CB call reverts and the wrapper
fails open), or buffer overflow that likewise makes the CB call revert. An
unavailable or incompatible view read reverts; callers must not treat a failed
read as unlimited capacity.

Capacity is shared by all users of an asset within that CB instance. It is a
snapshot, not a reservation or a guarantee of executable size. It excludes the
wallet's collateral balance, health factor, PM cash, borrow cap, asset flags and
strategy liquidity. Read and simulate the complete recipe against fresh state.
For withdrawing collateral, `min(wallet avail, CB capacity)` is only an upper
bound; the other protocol constraints still apply. There is no CB-capped max
action or helper that promises an executable maximum.

Silently reducing a close recipe's withdrawal could leave `DFSSell` short of its
input or leave too little debt asset to repay a loan. A ratio check can reject an
invalid final ratio, but it does not guarantee that a position is fully closed.
Keep a full-close recipe atomic; explicitly size a partial repay recipe or retry
after capacity replenishes. A repayment before a withdrawal adds elastic
capacity only for the repaid asset, not for a different collateral asset.

Supply and payback call wrapper `deposit`, whose `recordInflow` call is wrapped in
`try/catch`. Exhausted outflow buffers and CB call reverts do not block those
inflows. `FtDnmmPayback` still caps its pull to current debt before transferring
funds. Other deposit requirements, including the wrapper's TVL read outside the
CB `try/catch`, can still revert. The liquidation-only PM path uses
`withdrawBypassCB`; these user actions do not take that path.

Fork regressions in `test-sol/views/FtDnmmCircuitBreaker.t.sol` compare the view to
the real wrapper's `ftYieldWrapperRateLimitExceeded(requested, available)` error
and the real CB's accept/reject boundary at the same block. They cover elapsed
time, elastic inflows, same-timestamp state, decimal normalization, bypass cases,
and unchanged withdraw/borrow/payback semantics. To measure a reproducible
mainnet snapshot using the worktree's authenticated RPC:

```sh
FTDNMM_CB_BLOCK=<block> forge test --match-contract TestFtDnmmCircuitBreaker \
  --match-test test_live_capacities_match_wrapper_rejection_and_cb_boundary -vv
```
