// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface ILlamaLendSwapper {
    struct CallbackData {
        uint256 stablecoins;
        uint256 collateral;
    }

    function callback_repay(
        address _user,
        uint256 _stablecoins,
        uint256 _collateral,
        uint256 _debt,
        uint256[] memory _callbackArgs
    ) external returns (CallbackData memory cb);

    function callback_deposit(
        address _user,
        uint256 _stablecoins,
        uint256 _collateral,
        uint256 _debt,
        uint256[] memory _callbackArgs
    ) external returns (CallbackData memory cb);

    function callback_liquidate(
        address _user,
        uint256 _stablecoins,
        uint256 _collateral,
        uint256 _debt,
        uint256[] memory _callbackArgs
    ) external returns (CallbackData memory cb);

    /// @notice Sends remaining collateral and debt tokens to the caller
    /// @dev Returns without transferring unless the caller is callbackUser() in this tx
    function withdrawAll(address _controllerAddress) external;

    /// @notice Wallet the last callback in this tx ran for, zero if no callback ran
    function callbackUser() external view returns (address);
}
