// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.24;

import {IERC4626} from "../../interfaces/IERC4626.sol";

/// @author Aave
/// @dev Taken from AaveV3 Umbrella Stake Token
interface IERC4626StakeToken is IERC4626 {
  struct CooldownSnapshot {
    /// @notice Amount of shares available to redeem
    uint192 amount;
    /// @notice Timestamp after which funds will be unlocked for withdrawal
    uint32 endOfCooldown;
    /// @notice Period of time to withdraw funds after end of cooldown
    uint32 withdrawalWindow;
  }

  /**
   * @notice Activates the cooldown period to unstake for `msg.sender`.
   * It can't be called if the user is not staking.
   * Emits a {StakerCooldownUpdated} event.
   */
  function cooldown() external;

  /**
   * @notice Returns current `cooldown` duration.
   * @return _cooldown duration
   */
  function getCooldown() external view returns (uint256);

  /**
   * @notice Returns current `unstakeWindow` duration.
   * @return _unstakeWindow duration
   */
  function getUnstakeWindow() external view returns (uint256);

  /**
   * @notice Returns the last activated user `cooldown`. Contains the amount of tokens and timestamp.
   * May return zero values ​​if all funds have been withdrawn or transferred.
   * @param user Address of user
   * @return User's cooldown snapshot
   */
  function getStakerCooldown(address user) external view returns (CooldownSnapshot memory);
}
