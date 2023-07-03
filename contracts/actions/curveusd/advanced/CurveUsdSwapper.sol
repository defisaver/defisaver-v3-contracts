// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../interfaces/curve/ISwaps.sol";
import "../../../interfaces/IERC20.sol";

import "../../../auth/AdminAuth.sol";
import "../../../utils/SafeERC20.sol";
import "../helpers/CurveUsdHelper.sol";
import "../../../utils/Discount.sol";
import "../../../utils/FeeRecipient.sol";
import "../../../exchangeV3/helpers/ExchangeHelper.sol";

/// @title CurveUsdSwapper Callback contract for CurveUsd extended actions, swaps directly on curve
contract CurveUsdSwapper is CurveUsdHelper, ExchangeHelper, AdminAuth {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

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
        address _user,
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

       uint256 swappedAmount = _curveSwap(_user, swapData, collToken, true);

        // how many crvUsd we got after the trade that will be the repay amount
        cb.stablecoins = swappedAmount;

        // how much collateral we have left
        cb.collateral = IERC20(collToken).balanceOf(address(this));

        // approve the controller to create new position
        IERC20(collToken).safeApprove(controllerAddr, cb.collateral);
        IERC20(CRVUSD_TOKEN_ADDR).safeApprove(controllerAddr, cb.stablecoins);
    }

    function callback_deposit(
        address _user,
        uint256,
        uint256,
        uint256,
        uint256[] memory swapData
    ) external returns (CallbackData memory cb) {
         address controllerAddr = msg.sender; // this should be a callback from the controller

        // check if controller is valid
        if (!isControllerValid(controllerAddr)) revert CurveUsdInvalidController();

        address collToken = ICrvUsdController(controllerAddr).collateral_token();
        // controller sent swapData[0] of crvUSD to swapper
        uint256 swappedAmount = _curveSwap(_user, swapData, collToken, false);

        // set collAmount and approve for controller to pull
        cb.collateral = swappedAmount;
        IERC20(collToken).safeApprove(controllerAddr, cb.collateral);
    }

    function callback_liquidate(
        address _user,
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

        uint256 swappedAmount = _curveSwap(_user, swapData, collToken, true);

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

    /// @dev No funds should be stored on this contract, but if anything is left send back to the user
    function withdrawAll(address _controllerAddress) external {
        address collToken = ICrvUsdController(_controllerAddress).collateral_token();

        CRVUSD_TOKEN_ADDR.withdrawTokens(msg.sender, type(uint256).max);
        collToken.withdrawTokens(msg.sender, type(uint256).max);
    }

    /////////////////////////////// INTERNAL FUNCTIONS ///////////////////////////////

    function _curveSwap(address _user, uint256[] memory _swapData, address _collToken, bool _collToUsd) internal returns (uint256 amountOut) {
        ISwaps exchangeContract = ISwaps(
                addressProvider.get_address(2)
        );

        uint256 swapAmount = _swapData[0];
        uint256 minAmountOut = _swapData[1];

        address srcToken = _collToUsd ? _collToken : CRVUSD_TOKEN_ADDR;

        // get dfs fee and update swap amount
        swapAmount -= getFee(
            swapAmount,
            _user,
            srcToken,
            400
        );

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

    /// @dev Unpack the curve swap path from calldata and additionalRoutes
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

    function getFee(
        uint256 _amount,
        address _user,
        address _token,
        uint256 _dfsFeeDivider
    ) internal returns (uint256 feeAmount) {
        if (_dfsFeeDivider != 0 && Discount(DISCOUNT_ADDRESS).isCustomFeeSet(_user)) {
            _dfsFeeDivider = Discount(DISCOUNT_ADDRESS).getCustomServiceFee(_user);
        }

        if (_dfsFeeDivider == 0) {
            feeAmount = 0;
        } else {
            feeAmount = _amount / _dfsFeeDivider;

            // fee can't go over 10% of the whole amount
            if (feeAmount > (_amount / 10)) {
                feeAmount = _amount / 10;
            }

            address walletAddr = FeeRecipient(FEE_RECIPIENT_ADDRESS).getFeeAddr();

            _token.withdrawTokens(walletAddr, feeAmount);
        }
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
