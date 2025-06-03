// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.24;

import {IERC4626} from '../../interfaces/IERC4626.sol';

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

  struct SignatureParams {
    uint8 v;
    bytes32 r;
    bytes32 s;
  }

  /**
   * @notice Event is emitted when a cooldown of staker is changed.
   * @param user Staker address
   * @param amount Amount of shares on the time cooldown is changed
   * @param endOfCooldown Future timestamp, from which funds can be withdrawn
   * @param unstakeWindow Duration of time to withdraw funds
   */
  event StakerCooldownUpdated(
    address indexed user,
    uint256 amount,
    uint256 endOfCooldown,
    uint256 unstakeWindow
  );

  /**
   * @notice Event is emitted when a user installs/disables the operator for cooldown.
   * @param user User address
   * @param operator Address of operator to install/disable
   * @param flag Flag responsible for setting/disabling operator
   */
  event CooldownOperatorSet(address indexed user, address indexed operator, bool flag);

  /**
   * @notice Event is emitted when a successful slash occurs
   * @param destination Address, where funds transferred to
   * @param amount Amount of funds transferred
   */
  event Slashed(address indexed destination, uint256 amount);

  /**
   * @notice Event is emitted when `cooldown` is changed to the new one
   * @param oldCooldown Old `cooldown` duration
   * @param newCooldown New `cooldown` duration
   */
  event CooldownChanged(uint256 oldCooldown, uint256 newCooldown);

  /**
   * @notice Event is emitted when `unstakeWindow` is changed to the new one
   * @param oldUnstakeWindow Old `unstakeWindow` duration
   * @param newUnstakeWindow new `unstakeWindow` duration
   */
  event UnstakeWindowChanged(uint256 oldUnstakeWindow, uint256 newUnstakeWindow);

  /**
   * @dev Attempted to set zero address as a variable.
   */
  error ZeroAddress();

  /**
   * @dev Attempted to call cooldown without locked liquidity.
   */
  error ZeroBalanceInStaking();

  /**
   * @dev Attempted to slash for zero amount of assets.
   */
  error ZeroAmountSlashing();

  /**
   * @dev Attempted to slash with insufficient funds in staking.
   */
  error ZeroFundsAvailable();

  /**
   * @dev Attempted to call cooldown without approval for `cooldownOnBehalf`.
   * @param owner Address of user, which cooldown wasn't triggered
   * @param spender Address of `msg.sender`
   */
  error NotApprovedForCooldown(address owner, address spender);

  /**
   * @notice Deposits by issuing approval for the required number of tokens (if `asset` supports the `permit` function).
   * Emits a {Deposit} event.
   * @param assets Amount of assets to be deposited
   * @param receiver Receiver of shares
   * @param deadline Signature deadline for issuing approve
   * @param sig Signature parameters
   * @return Amount of shares received
   */
  function depositWithPermit(
    uint256 assets,
    address receiver,
    uint256 deadline,
    SignatureParams calldata sig
  ) external returns (uint256);

  /**
   * @notice Triggers user's `cooldown` using signature.
   * Emits a {StakerCooldownUpdated} event.
   * @param user The address, which `cooldown` will be triggered
   * @param deadline Signature deadline for issuing approve
   * @param sig Signature parameters
   */
  function cooldownWithPermit(
    address user,
    uint256 deadline,
    SignatureParams calldata sig
  ) external;

  /**
   * @notice Activates the cooldown period to unstake for `msg.sender`.
   * It can't be called if the user is not staking.
   * Emits a {StakerCooldownUpdated} event.
   */
  function cooldown() external;

  /**
   * @notice Activates the cooldown period to unstake for a certain user.
   * It can't be called if the user is not staking.
   * `from` must set as `cooldownOperator` for `msg.sender` so that he can activate the cooldown on his behalf.
   * Emits a {StakerCooldownUpdated} event.
   * @param from Address at which the `cooldown` will be activated
   */
  function cooldownOnBehalfOf(address from) external;

  /**
   * @notice Sets the ability to call `cooldownOnBehalf` for `msg.sender` by specified `operator` to `true` or `false`.
   * Doesn't revert if the new `flag` value is the same as the old one.
   * Emits a {CooldownOnBehalfChanged} event.
   * @param operator The address that the ability to call `cooldownOnBehalf` for `msg.sender` can be changed
   * @param flag True - to activate this ability, false - to deactivate
   */
  function setCooldownOperator(address operator, bool flag) external;

  /**
   * @notice Executes a slashing of the asset of a certain amount, transferring the seized funds
   * to destination. Decreasing the amount of underlying will automatically adjust the exchange rate.
   * If the amount exceeds maxSlashableAmount then the second one is taken.
   * Can only be called by the `owner`.
   * Emits a {Slashed} event.
   * @param destination Address where seized funds will be transferred
   * @param amount Amount to be slashed
   * @return amount Amount slashed
   */
  function slash(address destination, uint256 amount) external returns (uint256);

  /**
   * @notice Pauses the contract, can be called by `owner`.
   * Emits a {Paused} event.
   */
  function pause() external;

  /**
   * @notice Unpauses the contract, can be called by `owner`.
   * Emits a {Unpaused} event.
   */
  function unpause() external;

  /**
   * @notice Sets a new `cooldown` duration.
   * Can only be called by the `owner`.
   * Emits a {CooldownChanged} event.
   * @param cooldown Amount of seconds users have to wait between starting the `cooldown` and being able to withdraw funds
   */
  function setCooldown(uint256 cooldown) external;

  /**
   * @notice Sets a new `unstakeWindow` duration.
   * Can only be called by the `owner`.
   * Emits a {UnstakeWindowChanged} event.
   * @param newUnstakeWindow Amount of seconds users have to withdraw after `cooldown`
   */
  function setUnstakeWindow(uint256 newUnstakeWindow) external;

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

  /**
   * @notice Returns true if the user's cooldown can be triggered by an operator, false - otherwise.
   * @param user Address of the user.
   * @param operator Address of an operator.
   * @return Is operator set for `cooldownOnBehalf`
   */
  function isCooldownOperator(address user, address operator) external view returns (bool);

  /**
   * @notice Returns the next unused nonce for an address, which could be used inside signature for `cooldownWithPermit()` function.
   * @param owner Address for which unused `cooldown` nonce will be returned
   * @return The next unused `cooldown` nonce
   */
  function cooldownNonces(address owner) external view returns (uint256);

  /**
   * @notice Returns the maximum slashable assets available for now.
   * @return Maximum assets available for slash
   */
  function getMaxSlashableAssets() external view returns (uint256);

  /**
   * @notice Returns the minimum amount of assets, which can't be slashed.
   * @return Minimum assets value that cannot be slashed
   */
  function MIN_ASSETS_REMAINING() external view returns (uint256);
}
