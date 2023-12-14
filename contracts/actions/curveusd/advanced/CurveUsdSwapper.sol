// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../interfaces/curve/ISwapRouterNG.sol";
import "../../../interfaces/IERC20.sol";

import "../../../auth/AdminAuth.sol";
import "../../../utils/SafeERC20.sol";
import "../helpers/CurveUsdHelper.sol";
import "../../../utils/Discount.sol";
import "../../../utils/FeeRecipient.sol";
import "../../../actions/fee/helpers/GasFeeHelper.sol";
import "../../../exchangeV3/helpers/ExchangeHelper.sol";
import "../../../exchangeV3/TokenGroupRegistry.sol";

/// @title CurveUsdSwapper Callback contract for CurveUsd extended actions, swaps directly on curve
contract CurveUsdSwapper is CurveUsdHelper, ExchangeHelper, GasFeeHelper, AdminAuth {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    ISwapRouterNG internal constant exchangeContract = ISwapRouterNG(CURVE_ROUTER_NG);
    uint256 internal constant STANDARD_DFS_FEE = 400;

    event LogCurveUsdSwapper(
        address indexed user,
        address srcToken,
        address dstToken,
        uint256 srcAmount,
        uint256 destAmount,
        uint256 minPrice
    );

    struct CallbackData {
        uint256 stablecoins;
        uint256 collateral;
    }

    struct SwapRoutes {
        address[11] route;
        uint256[5][5] swap_params;
        address[5] pools;
    }

    /// @dev Transient store of curve swap routes and zap pools as we can"t fit whole data in callback params
    address[8] internal additionalRoutes;
    address[5] internal swapZapPools;

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

        // if we want to sell the whole coll amount we take the whole balance
        if (swapData[0] == type(uint256).max) {
            swapData[0] = IERC20(collToken).balanceOf(address(this));
        }

        uint256 swappedAmount = _curveSwap(_user, swapData, collToken, true);

        // how many crvUsd we got after the trade that will be the repay amount
        cb.stablecoins = swappedAmount;
        IERC20(CRVUSD_TOKEN_ADDR).safeApprove(controllerAddr, cb.stablecoins);

        // approve to pick up extra coll and send to user
        cb.collateral = IERC20(collToken).balanceOf(address(this));
        IERC20(collToken).safeApprove(controllerAddr, cb.collateral);
    }

    /// @dev Called by our actions to transiently store curve swap routes and zap pools
    /// @param _additionalRoutes Array of 8 addresses to store in transient storage
    /// @param _swapZapPools Array of 5 addresses to store in transient storage
    function setAdditionalRoutes(address[8] memory _additionalRoutes, address[5] memory _swapZapPools) external {
        additionalRoutes = _additionalRoutes;
        swapZapPools = _swapZapPools;
    }

    /// @dev No funds should be stored on this contract, but if anything is left send back to the user
    function withdrawAll(address _controllerAddress) external {
        address collToken = ICrvUsdController(_controllerAddress).collateral_token();

        CRVUSD_TOKEN_ADDR.withdrawTokens(msg.sender, type(uint256).max);
        collToken.withdrawTokens(msg.sender, type(uint256).max);
    }

    /////////////////////////////// INTERNAL FUNCTIONS ///////////////////////////////

    function _curveSwap(
        address _user,
        uint256[] memory _swapData,
        address _collToken,
        bool _collToUsd
    ) internal returns (uint256 amountOut) {
        // get swap params
        uint256 swapAmount = _swapData[0];
        uint256 minAmountOut = _swapData[1];

        address srcToken = _collToUsd ? _collToken : CRVUSD_TOKEN_ADDR;
        address destToken = _collToUsd ? CRVUSD_TOKEN_ADDR : _collToken;

        (
            SwapRoutes memory swapRoutes,
            uint32 gasUsed,
            uint24 dfsFeeDivider
        ) = getSwapPath(_swapData, _collToken, _collToUsd);

        // check custom fee if front sends a non standard fee param
        if (dfsFeeDivider != STANDARD_DFS_FEE) {
            dfsFeeDivider = uint24(
                TokenGroupRegistry(TOKEN_GROUP_REGISTRY).getFeeForTokens(srcToken, destToken)
            );
        }

        // get dfs fee and update swap amount
        swapAmount -= takeSwapAndGasCostFee(swapAmount, _user, srcToken, dfsFeeDivider, gasUsed);

        IERC20(srcToken).safeApprove(address(exchangeContract), swapAmount);

        amountOut = exchangeContract.exchange(
            swapRoutes.route,
            swapRoutes.swap_params,
            swapAmount,
            minAmountOut,
            swapRoutes.pools,
            address(this)
        );

        // free the storage only needed inside tx as transient storage
        delete additionalRoutes;
        delete swapZapPools;

        emit LogCurveUsdSwapper(_user, srcToken, destToken, swapAmount, amountOut, minAmountOut);
    }

    /// @dev Unpack the curve swap path from calldata and additionalRoutes
    function getSwapPath(
        uint256[] memory swapData,
        address _collToken,
        bool _collToUsd
    )
        public
        view
        returns (SwapRoutes memory swapRoutes, uint32 gasUsed, uint24 dfsFeeDivider)
    {
        (swapRoutes.swap_params, gasUsed, dfsFeeDivider) = decodeSwapParams(swapData[2]);

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
        swapRoutes.route[9] = additionalRoutes[6];
        swapRoutes.route[10] = additionalRoutes[7];

        swapRoutes.pools[0] = swapZapPools[0];
        swapRoutes.pools[1] = swapZapPools[1];
        swapRoutes.pools[2] = swapZapPools[2];
        swapRoutes.pools[3] = swapZapPools[3];
        swapRoutes.pools[4] = swapZapPools[4];
    }

    function takeSwapAndGasCostFee(
        uint256 _amount,
        address _user,
        address _token,
        uint256 _dfsFeeDivider,
        uint32 _gasUsed
    ) internal returns (uint256 feeAmount) {
        if (_dfsFeeDivider != 0 && Discount(DISCOUNT_ADDRESS).isCustomFeeSet(_user)) {
            _dfsFeeDivider = Discount(DISCOUNT_ADDRESS).getCustomServiceFee(_user);
        }

        // we need to take the fee for tx cost as well, as it"s in a strategy
        if (_gasUsed != 0) {
            feeAmount += calcGasCost(_gasUsed, _token, 0);
        }

        // take dfs fee if set, and add to feeAmount
        if (_dfsFeeDivider != 0) {
            feeAmount += _amount / _dfsFeeDivider;
        }

        // fee can"t go over 10% of the whole amount
        if (feeAmount > (_amount / 10)) {
            feeAmount = _amount / 10;
        }

        address walletAddr = FeeRecipient(FEE_RECIPIENT_ADDRESS).getFeeAddr();
        _token.withdrawTokens(walletAddr, feeAmount);
    }

    /// @dev Encode swapParams in 1 uint256 as the values are small
    function encodeSwapParams(
        uint256[5][5] memory swapParams,
        uint32 gasUsed,
        uint24 dfsFeeDivider
    ) public pure returns (uint256 encoded) {
        uint256 maskOffset;

        for (uint256 i; i < 5; i++) {
            for (uint256 j; j < 5; j++) {
                encoded |= (swapParams[i][j] << maskOffset);
                maskOffset += 8;
            }
        }
        encoded |= uint256(gasUsed) << maskOffset;
        maskOffset += 32;
        encoded |= uint256(dfsFeeDivider) << maskOffset;
    }

    /// @dev Decode swapParams from 1 uint256
    function decodeSwapParams(
        uint256 swapParamEncoded
    )
        public
        pure
        returns (
            uint256[5][5] memory swapParams,
            uint32 gasUsed,
            uint24 dfsFeeDivider
        )
    {
        uint256 maskOffset;
        for (uint256 i; i < 5; i++) {
            for (uint256 j; j < 5; j++) {
                swapParams[i][j] = uint256(uint8(swapParamEncoded >> maskOffset));
                maskOffset += 8;
            }
        }
        gasUsed = uint32(swapParamEncoded >> maskOffset);
        maskOffset += 32;
        dfsFeeDivider = uint24(swapParamEncoded >> maskOffset);
    }
}
