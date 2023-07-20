// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import {ICrvUsdController, ILLAMMA, ICrvUsdControllerFactory, ICurveUsdSwapper} from "../../../interfaces/curveusd/ICurveUsd.sol";
import "../../../interfaces/curve/IAddressProvider.sol";

import "./MainnetCurveUsdAddresses.sol";
import "../../../utils/TokenUtils.sol";

contract CurveUsdHelper is MainnetCurveUsdAddresses {
    using TokenUtils for address;

    error CurveUsdInvalidController();

    IAddressProvider addressProvider = IAddressProvider(CURVE_ADDRESS_PROVIDER);

    bytes4 constant CURVE_SWAPPER_ID = bytes4(keccak256("CurveUsdSwapper"));

    function isControllerValid(address _controllerAddr) public view returns (bool) {
        return
            ICrvUsdControllerFactory(CRVUSD_CONTROLLER_FACTORY_ADDR).debt_ceiling(
                _controllerAddr
            ) != 0;
    }

    function userMaxWithdraw(
        address _controllerAddress,
        address _user
    ) public view returns (uint256 maxWithdraw) {
        uint256[4] memory userState = ICrvUsdController(_controllerAddress).user_state(_user);
        return
            userState[0] -
            ICrvUsdController(_controllerAddress).min_collateral(userState[2], userState[3]);
    }

    function userMaxBorrow(
        address _controllerAddress,
        address _user
    ) public view returns (uint256 maxBorrow) {
        uint256[4] memory userState = ICrvUsdController(_controllerAddress).user_state(_user);
        return
            ICrvUsdController(_controllerAddress).max_borrowable(userState[0], userState[3]) -
            userState[2];
    }

    function getCollAmountsFromAMM(
        address _controllerAddress,
        address _user
    ) public view returns (uint256 crvUsdAmount, uint256 collAmount) {
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

    /// @dev Helper method for advanced actions to setup the curve path and write to transient storage in CurveUsdSwapper
    function _setupCurvePath(
        address _curveUsdSwapper,
        bytes memory _additionalData,
        uint256 _swapAmount,
        uint256 _minSwapAmount,
        uint32 _gasUsed,
        uint32 _dfsFeeDivider,
        uint8 _useSteth
    ) internal returns (uint256[] memory swapData) {
        (address[9] memory _route, uint256[3][4] memory _swap_params) = abi.decode(
            _additionalData,
            (address[9], uint256[3][4])
        );

        swapData = new uint256[](5);
        swapData[0] = _swapAmount;
        swapData[1] = _minSwapAmount;
        swapData[2] = ICurveUsdSwapper(_curveUsdSwapper).encodeSwapParams(_swap_params, _gasUsed, _dfsFeeDivider, _useSteth);
        swapData[3] = uint256(uint160(_route[1]));
        swapData[4] = uint256(uint160(_route[2]));

        address[6] memory _path = [
            _route[3],
            _route[4],
            _route[5],
            _route[6],
            _route[7],
            _route[8]
        ];

        ICurveUsdSwapper(_curveUsdSwapper).setAdditionalRoutes(_path);
    }
}
