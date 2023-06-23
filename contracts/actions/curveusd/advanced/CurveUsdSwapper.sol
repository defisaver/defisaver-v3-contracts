// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { ICrvUsdController, ICrvUsdControllerFactory } from "../../../interfaces/curveusd/ICurveUsd.sol";
import "../../../interfaces/curve/ISwaps.sol";
import "../../../interfaces/IERC20.sol";

import "../../../utils/SafeERC20.sol";
import "../helpers/CurveUsdHelper.sol";

/// @title CurveUsdSwapper Callback contract for CurveUsd extended actions, swaps directly on curve
contract CurveUsdSwapper is CurveUsdHelper {
    using SafeERC20 for IERC20;

    struct CallbackData {
        uint256 stablecoins;
        uint256 collateral;
    }

    struct SwapRoutes {
        address[9] route;
        uint256[3][4] swap_params;
    }

    /// @dev Transient store of curve swap routes as we can't fit whole data in callback params
    address[6] internal additionalRoutes;

    ///@dev Called by curve controller from repay_extended method, sends collateral tokens to this contract
    function callback_repay(
        address,
        uint256,
        uint256,
        uint256,
        uint256[] memory swapData
    ) external returns (CallbackData memory cb) {
        address controllerAddr = msg.sender; // this should be a callback from the controller

        // check if controller is valid
        if (!isControllerValid(controllerAddr)) revert CurveUsdInvalidController();

        // we get _ethCollAmount in tokens from curve
        address collToken = ICrvUsdController(controllerAddr).collateral_token();

       uint256 swappedAmount = _curveSwap(swapData, collToken, true);

        // how many crvUsd we got after the trade that will be the repay amount
        cb.stablecoins = swappedAmount;

        // how much collateral we have left
        cb.collateral = IERC20(collToken).balanceOf(address(this));

        // approve the controller to create new position
        IERC20(collToken).safeApprove(controllerAddr, cb.collateral);
        IERC20(CRVUSD_TOKEN_ADDR).safeApprove(controllerAddr, cb.stablecoins);
    }

    function callback_deposit(
        address,
        uint256,
        uint256,
        uint256,
        uint256[] memory swapData
    ) external returns (CallbackData memory cb) {
         address controllerAddr = msg.sender; // this should be a callback from the controller

        // check if controller is valid
        if (!isControllerValid(controllerAddr)) revert CurveUsdInvalidController();

        // we get _ethCollAmount in tokens from curve
        address collToken = ICrvUsdController(controllerAddr).collateral_token();

        uint256 swappedAmount = _curveSwap(swapData, collToken, false);

        // set collAmount and approve for controller to pull
        cb.collateral = swappedAmount;
        IERC20(collToken).safeApprove(controllerAddr, cb.collateral);
    }

    function callback_liquidate(
        address,
        uint256,
        uint256,
        uint256,
        uint256[] memory swapData
    ) external returns (CallbackData memory cb) { 
        address controllerAddr = msg.sender;

        // check if controller is valid
        if (!isControllerValid(controllerAddr)) revert CurveUsdInvalidController();

        // we get _ethCollAmount in tokens from curve
        address collToken = ICrvUsdController(controllerAddr).collateral_token();

        uint256 swappedAmount = _curveSwap(swapData, collToken, true);

        // how many crvUsd we got after the trade that will be the repay amount
        cb.stablecoins = swappedAmount;
        IERC20(CRVUSD_TOKEN_ADDR).safeApprove(controllerAddr, cb.stablecoins);

        // approve to pick up extra coll and send to user
        cb.collateral = IERC20(collToken).balanceOf(address(this));
        IERC20(collToken).safeApprove(controllerAddr, cb.collateral);
    }

    /// @dev Called by our actions to transiently store curve swap routes
    /// @param _additionalRoutes Array of 6 addresses to store in transient storage
    function setAdditionalRoutes(address[6] memory _additionalRoutes) external {
        additionalRoutes = _additionalRoutes;
    }

    /////////////////////////////// INTERNAL FUNCTIONS ///////////////////////////////

    function _curveSwap(uint256[] memory _swapData, address _collToken, bool _collToUsd) internal returns (uint256 amountOut) {
        ISwaps exchangeContract = ISwaps(
                addressProvider.get_address(2)
        );

        uint256 swapAmount = _swapData[0];
        uint256 minAmountOut = _swapData[1];

        address srcToken = _collToUsd ? _collToken : CRVUSD_TOKEN_ADDR;
        IERC20(srcToken).safeApprove(address(exchangeContract), swapAmount);

        SwapRoutes memory swapRoutes = getSwapPath(_swapData, _collToken, _collToUsd);

        amountOut = exchangeContract.exchange_multiple(
            swapRoutes.route,
            swapRoutes.swap_params,
            swapAmount,
            minAmountOut
        );

        // free the storage only needed inside tx as transient storage
        delete additionalRoutes;
    }

    /// @dev Unpack the curve swap path from calldata and additonalRoutes
    function getSwapPath(uint256[] memory swapData, address _collToken, bool _collToUsd) public view returns (SwapRoutes memory swapRoutes) {
        swapRoutes.swap_params = decodeSwapParams(swapData[2]);

        address firstAddr = _collToUsd ? _collToken : CRVUSD_TOKEN_ADDR;

        swapRoutes.route[0] = firstAddr;
        swapRoutes.route[1] = address(uint160(swapData[3]));
        swapRoutes.route[2] = address(uint160(swapData[4]));

        swapRoutes.route[3] = additionalRoutes[0];
        swapRoutes.route[4] = additionalRoutes[1];
        swapRoutes.route[5] = additionalRoutes[2];
        swapRoutes.route[6] = additionalRoutes[3];
        swapRoutes.route[7] = additionalRoutes[4];
        swapRoutes.route[8] = additionalRoutes[5];
    }

    /// @dev Encode swapParams in 1 uint256 as the values are small
    function encodeSwapParams(uint256[3][4] memory swapParams) public pure returns (uint256 encoded) {
        encoded = swapParams[0][0] + (swapParams[0][1] << 16) + (swapParams[0][2] << 32) +
                  (swapParams[1][0] << 48) + (swapParams[1][1] << 64) + (swapParams[1][2] << 80) +
                  (swapParams[2][0] << 96) + (swapParams[2][1] << 112) + (swapParams[2][2] << 128) +
                  (swapParams[3][0] << 144) + (swapParams[3][1] << 160) + (swapParams[3][2] << 176);
    }

    /// @dev Decode swapParams from 1 uint256
    function decodeSwapParams(uint256 swapParamEncoded) public pure returns (uint256[3][4] memory swapParams) {
        swapParams[0] = [uint256(uint16(swapParamEncoded)), uint256(uint16(swapParamEncoded >> 16)), uint256(uint16(swapParamEncoded >> 32))];
        swapParams[1] = [uint256(uint16(swapParamEncoded >> 48)), uint256(uint16(swapParamEncoded >> 64)), uint256(uint16(swapParamEncoded >> 80))];
        swapParams[2] = [uint256(uint16(swapParamEncoded >> 96)), uint256(uint16(swapParamEncoded >> 112)), uint256(uint16(swapParamEncoded >> 128))];
        swapParams[3] = [uint256(uint16(swapParamEncoded >> 144)), uint256(uint16(swapParamEncoded >> 160)), uint256(uint16(swapParamEncoded >> 176))];
    }
}
