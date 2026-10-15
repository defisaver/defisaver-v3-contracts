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
    function isControllerValid(address _controllerAddr) public view returns (bool) {
        return
            ICrvUsdControllerFactory(CRVUSD_CONTROLLER_FACTORY_ADDR).debt_ceiling(_controllerAddr)
                != 0;
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
        uint24 _dfsFeeDivider
    ) internal returns (uint256[] memory swapData) {
        (address[11] memory _route, uint256[5][5] memory _swap_params, address[5] memory _pools) =
            abi.decode(_additionalData, (address[11], uint256[5][5], address[5]));

        swapData = new uint256[](5);
        swapData[0] = _swapAmount;
        swapData[1] = _minSwapAmount;
        swapData[2] = ICurveUsdSwapper(_curveUsdSwapper)
            .encodeSwapParams(_swap_params, _gasUsed, _dfsFeeDivider);
        swapData[3] = uint256(uint160(_route[1]));
        swapData[4] = uint256(uint160(_route[2]));

        address[8] memory _path = [
            _route[3], _route[4], _route[5], _route[6], _route[7], _route[8], _route[9], _route[10]
        ];

        ICurveUsdSwapper(_curveUsdSwapper).setAdditionalRoutes(_path, _pools);
    }
}
