// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import {
    ICrvUsdController,
    ILLAMMA,
    ICrvUsdControllerFactory,
    ICurveUsdSwapper
} from "../../../interfaces/protocols/curveusd/ICurveUsd.sol";

import { IERC20 } from "../../../interfaces/token/IERC20.sol";
import { DSMath } from "../../../_vendor/DS/DSMath.sol";
import { MainnetCurveUsdAddresses } from "./MainnetCurveUsdAddresses.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";
import { IBytesTransientStorage } from "../../../interfaces/utils/IBytesTransientStorage.sol";

contract CurveUsdHelper is MainnetCurveUsdAddresses, DSMath {
    using TokenUtils for address;

    /// Reverts if the controller is invalid
    error CurveUsdInvalidController();

    /// Amount to supply or borrow cannot be 0
    error ZeroAmountError();

    IBytesTransientStorage constant transientStorage = IBytesTransientStorage(BYTES_TRANSIENT_STORAGE);
    bytes4 constant CURVE_SWAPPER_ID = bytes4(keccak256("CurveUsdSwapper"));
    bytes4 constant CURVE_TRANSIENT_SWAPPER_ID = bytes4(keccak256("CurveUsdSwapperTransient"));

    function getCollateralRatio(address _user, address _controllerAddr)
        public
        view
        returns (uint256 collRatio, bool isInSoftLiquidation)
    {
        // fetch users debt
        uint256 debt = ICrvUsdController(_controllerAddr).debt(_user);
        // no position can exist without debt
        if (debt == 0) return (0, false);
        (uint256 crvUsdCollAmount, uint256 collAmount) = getCollAmountsFromAMM(_controllerAddr, _user);
        // if user has crvusd as coll he is currently underwater
        if (crvUsdCollAmount > 0) isInSoftLiquidation = true;

        // fetch collToken oracle price
        address amm = ICrvUsdController(_controllerAddr).amm();
        uint256 oraclePrice = ILLAMMA(amm).price_oracle();
        // calculate collAmount as WAD (18 decimals)
        address collToken = ICrvUsdController(_controllerAddr).collateral_token();
        uint256 assetDec = IERC20(collToken).decimals();
        uint256 collAmountWAD =
            assetDec > 18 ? (collAmount / 10 ** (assetDec - 18)) : (collAmount * 10 ** (18 - assetDec));

        collRatio = wdiv(wmul(collAmountWAD, oraclePrice) + crvUsdCollAmount, debt);
    }

    function isControllerValid(address _controllerAddr) public view returns (bool) {
        return ICrvUsdControllerFactory(CRVUSD_CONTROLLER_FACTORY_ADDR).debt_ceiling(_controllerAddr) != 0;
    }

    function userMaxWithdraw(address _controllerAddress, address _user) public view returns (uint256 maxWithdraw) {
        uint256[4] memory userState = ICrvUsdController(_controllerAddress).user_state(_user);
        return userState[0] - ICrvUsdController(_controllerAddress).min_collateral(userState[2], userState[3]);
    }

    function getCollAmountsFromAMM(address _controllerAddress, address _user)
        public
        view
        returns (uint256 crvUsdAmount, uint256 collAmount)
    {
        address llammaAddress = ICrvUsdController(_controllerAddress).amm();
        uint256[2] memory xy = ILLAMMA(llammaAddress).get_sum_xy(_user);
        crvUsdAmount = xy[0];
        collAmount = xy[1];
    }

    function _sendLeftoverFunds(address _controllerAddress, address _to) internal {
        address collToken = ICrvUsdController(_controllerAddress).collateral_token();

        CRVUSD_TOKEN_ADDR.withdrawTokens(_to, type(uint256).max);
        collToken.withdrawTokens(_to, type(uint256).max);
    }

    function _sendLeftoverFundsWithSnapshot(
        address _collToken,
        address _debtToken,
        uint256 _collStartingBalance,
        uint256 _debtStartingBalance,
        address _to
    ) internal returns (uint256 collTokenReceived, uint256 debtTokenReceived) {
        collTokenReceived = _collToken.getBalance(address(this)) - _collStartingBalance;
        debtTokenReceived = _debtToken.getBalance(address(this)) - _debtStartingBalance;
        _collToken.withdrawTokens(_to, collTokenReceived);
        _debtToken.withdrawTokens(_to, debtTokenReceived);
    }

    /// @dev Helper method for advanced actions to setup the curve path and write to transient storage in CurveUsdSwapper
    function _setupCurvePath(
        address _curveUsdSwapper,
        bytes memory _additionalData,
        uint256 _swapAmount,
        uint256 _minSwapAmount,
        uint32 _gasUsed,
        uint24 _dfsFeeDivider
    ) internal returns (uint256[] memory swapData) {
        (address[11] memory _route, uint256[5][5] memory _swap_params, address[5] memory _pools) =
            abi.decode(_additionalData, (address[11], uint256[5][5], address[5]));

        swapData = new uint256[](5);
        swapData[0] = _swapAmount;
        swapData[1] = _minSwapAmount;
        swapData[2] = ICurveUsdSwapper(_curveUsdSwapper).encodeSwapParams(_swap_params, _gasUsed, _dfsFeeDivider);
        swapData[3] = uint256(uint160(_route[1]));
        swapData[4] = uint256(uint160(_route[2]));

        address[8] memory _path =
            [_route[3], _route[4], _route[5], _route[6], _route[7], _route[8], _route[9], _route[10]];

        ICurveUsdSwapper(_curveUsdSwapper).setAdditionalRoutes(_path, _pools);
    }
}
