// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { ICrvUsdController, ICrvUsdControllerFactory } from "../../interfaces/curveusd/ICurveUsd.sol";
import "./helpers/CurveUsdHelper.sol";
import "../../interfaces/curve/ISwaps.sol";
import "../../interfaces/curve/IAddressProvider.sol";
import "../../interfaces/IERC20.sol";
import "../../utils/SafeERC20.sol";

import "hardhat/console.sol";

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

    IAddressProvider addressProvider = IAddressProvider(CURVE_ADDRESS_PROVIDER);

    mapping (uint256 => SwapRoutes) internal swapRoutesMap;

    constructor() {
        address[9] memory routes;
        routes[0] = 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0;
        routes[1] = 0x447Ddd4960d9fdBF6af9a790560d0AF76795CB08;
        routes[2] = 0xae78736Cd615f374D3085123A210448E74Fc6393;
        routes[3] = 0x0f3159811670c117c372428D4E69AC32325e4D0F;
        routes[4] = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
        routes[5] = 0xD51a44d3FaE010294C616388b506AcdA1bfAAE46;
        routes[6] = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
        routes[7] = 0x390f3595bCa2Df7d23783dFd126427CCeb997BF4;
        routes[8] = 0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E;

      
        uint256[3][4] memory swapParams;
        swapParams[0] = [uint256(1), uint256(0), uint256(1)];
        swapParams[1] = [uint256(1), uint256(0), uint256(3)];
        swapParams[2] = [uint256(2), uint256(0), uint256(3)];
        swapParams[3] = [uint256(0), uint256(1), uint256(1)];

        swapRoutesMap[0] = SwapRoutes({
            route: routes,
            swap_params: swapParams
        });
    }

   
    // receives the fl amount and swaps for curve
    function callback_repay(
        address _user,
        uint256 _stableCollAmount,
        uint256 _ethCollAmount,
        uint256 _debt,
        uint256[] memory swapData
    ) external returns (CallbackData memory cb) {
        address controllerAddr = msg.sender; // this should be a callback from the controller

        // check if controller is valid
        if (ICrvUsdControllerFactory(CRVUSD_CONTROLLER_FACTORY_ADDR).debt_ceiling(controllerAddr) == 0) revert CurveUsdInvalidController();

        // we get _ethCollAmount in tokens from curve
        address collToken = ICrvUsdController(controllerAddr).collateral_token();

        // do the curve swap
        ISwaps exchangeContract = ISwaps(
                addressProvider.get_address(2)
        );

        uint256 swapAmount = swapData[0];
        uint256 swapRouteId = swapData[1];
        uint256 minAmountOut = swapData[2];

        IERC20(collToken).safeApprove(address(exchangeContract), swapAmount);

        SwapRoutes memory swapRoutes = swapRoutesMap[swapRouteId];

        console.log("Swap start: ", gasleft());
        console.log(swapAmount);
        uint256 amountOut = exchangeContract.exchange_multiple(
            swapRoutes.route,
            swapRoutes.swap_params,
            swapAmount,
            minAmountOut   // _minAmountOut
        );

        console.log("Swap done: ", gasleft());

        // how many crvUsd we got after the trade that will be the repay amount
        cb.stablecoins = amountOut;

        // how much collateral we have left
        cb.collateral = IERC20(collToken).balanceOf(address(this));

        // approve the controller to create new position
        IERC20(collToken).safeApprove(controllerAddr, cb.collateral);
        IERC20(CRVUSD_TOKEN_ADDR).safeApprove(controllerAddr, cb.stablecoins);

    }
}
