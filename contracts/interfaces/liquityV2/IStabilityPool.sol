// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IStabilityPool {
    /*  provideToSP():
    * - Calculates depositor's Coll gain
    * - Calculates the compounded deposit
    * - Increases deposit, and takes new snapshots of accumulators P and S
    * - Sends depositor's accumulated Coll gains to depositor
    */
    function provideToSP(uint256 _amount, bool _doClaim) external;

    /*  withdrawFromSP():
    * - Calculates depositor's Coll gain
    * - Calculates the compounded deposit
    * - Sends the requested BOLD withdrawal to depositor
    * - (If _amount > userDeposit, the user withdraws all of their compounded deposit)
    * - Decreases deposit by withdrawn amount and takes new snapshots of accumulators P and S
    */
    function withdrawFromSP(uint256 _amount, bool doClaim) external;

    function claimAllCollGains() external;

    /*
     * Initial checks:
     * - Caller is TroveManager
     * ---
     * Cancels out the specified debt against the Bold contained in the Stability Pool (as far as possible)
     * and transfers the Trove's collateral from ActivePool to StabilityPool.
     * Only called by liquidation functions in the TroveManager.
     */
    function offset(uint256 _debt, uint256 _coll) external;

    function deposits(address _depositor) external view returns (uint256 initialValue);
    function stashedColl(address _depositor) external view returns (uint256);

    /*
     * Returns the total amount of Coll held by the pool, accounted in an internal variable instead of `balance`,
     * to exclude edge cases like Coll received from a self-destruct.
     */
    function getCollBalance() external view returns (uint256);

    /*
     * Returns Bold held in the pool. Changes when users deposit/withdraw, and when Trove debt is offset.
     */
    function getTotalBoldDeposits() external view returns (uint256);

    function getYieldGainsOwed() external view returns (uint256);
    function getYieldGainsPending() external view returns (uint256);

    /*
     * Calculates the Coll gain earned by the deposit since its last snapshots were taken.
     */
    function getDepositorCollGain(address _depositor) external view returns (uint256);

    /*
     * Calculates the BOLD yield gain earned by the deposit since its last snapshots were taken.
     */
    function getDepositorYieldGain(address _depositor) external view returns (uint256);

    /*
     * Calculates what `getDepositorYieldGain` will be if interest is minted now.
     */
    function getDepositorYieldGainWithPending(address _depositor) external view returns (uint256);

    /*
     * Return the user's compounded deposit.
     */
    function getCompoundedBoldDeposit(address _depositor) external view returns (uint256);

    function epochToScaleToS(uint128 _epoch, uint128 _scale) external view returns (uint256);

    function epochToScaleToB(uint128 _epoch, uint128 _scale) external view returns (uint256);

    function P() external view returns (uint256);
    function currentScale() external view returns (uint128);
    function currentEpoch() external view returns (uint128);
}
