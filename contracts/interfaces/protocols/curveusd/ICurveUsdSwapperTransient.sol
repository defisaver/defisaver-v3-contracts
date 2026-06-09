// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface ICurveUsdSwapperTransient {
    struct CallbackData {
        uint256 stablecoins;
        uint256 collateral;
    }

    function withdrawAll(address _controllerAddress)
        external
        returns (uint256 collBalance, uint256 debtBalance);

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
}
