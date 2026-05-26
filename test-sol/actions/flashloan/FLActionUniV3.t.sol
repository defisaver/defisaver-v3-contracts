// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { FLActionTestBase } from "./FLActionTestBase.t.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

contract TestFLActionUniV3 is FLActionTestBase {
    function test_should_get_wbtc_and_weth_uni_v3_flashloan() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 wbtcAmount = 1e8 / 10;
        uint256 wethAmount = 1 ether;
        uint256 poolFee = 500;

        uint256 wbtcFee = _uniV3Fee(wbtcAmount, poolFee);
        uint256 wethFee = _uniV3Fee(wethAmount, poolFee);

        _giveFeeAndDust(Addresses.WBTC_ADDR, wbtcFee);
        _giveFeeAndDust(Addresses.WETH_ADDR, wethFee);

        uint256 flActionWbtcBalanceBefore = IERC20(Addresses.WBTC_ADDR).balanceOf(flActionAddr);
        uint256 flActionWethBalanceBefore = IERC20(Addresses.WETH_ADDR).balanceOf(flActionAddr);
        uint256 walletWbtcBalanceBefore = IERC20(Addresses.WBTC_ADDR).balanceOf(walletAddr);
        uint256 walletWethBalanceBefore = IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr);

        StrategyModel.Recipe memory recipe = _uniV3FLRecipe(
            Addresses.WBTC_ADDR, Addresses.WETH_ADDR, WBTC_WETH_UNI_V3_POOL, wbtcAmount, wethAmount
        );

        _executeRecipe(recipe);

        _assertNoBalanceChange(Addresses.WBTC_ADDR, flActionWbtcBalanceBefore);
        _assertNoBalanceChange(Addresses.WETH_ADDR, flActionWethBalanceBefore);
        assertEq(
            IERC20(Addresses.WBTC_ADDR).balanceOf(walletAddr), walletWbtcBalanceBefore - wbtcFee
        );
        assertEq(
            IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), walletWethBalanceBefore - wethFee
        );
    }

    function test_should_get_only_token0_uni_v3_flashloan() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 wbtcAmount = 1e8 / 10;
        uint256 poolFee = 500;
        uint256 wbtcFee = _uniV3Fee(wbtcAmount, poolFee);

        _giveFeeAndDust(Addresses.WBTC_ADDR, wbtcFee);

        uint256 flActionBalanceBefore = IERC20(Addresses.WBTC_ADDR).balanceOf(flActionAddr);
        uint256 walletBalanceBefore = IERC20(Addresses.WBTC_ADDR).balanceOf(walletAddr);

        StrategyModel.Recipe memory recipe = _uniV3FLRecipe(
            Addresses.WBTC_ADDR, Addresses.WETH_ADDR, WBTC_WETH_UNI_V3_POOL, wbtcAmount, 0
        );

        _executeRecipe(recipe);

        _assertNoBalanceChange(Addresses.WBTC_ADDR, flActionBalanceBefore);
        assertEq(IERC20(Addresses.WBTC_ADDR).balanceOf(walletAddr), walletBalanceBefore - wbtcFee);
    }

    function test_should_get_only_token1_uni_v3_flashloan() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 wethAmount = 1 ether;
        uint256 poolFee = 500;
        uint256 wethFee = _uniV3Fee(wethAmount, poolFee);

        _giveFeeAndDust(Addresses.WETH_ADDR, wethFee);

        uint256 flActionBalanceBefore = IERC20(Addresses.WETH_ADDR).balanceOf(flActionAddr);
        uint256 walletBalanceBefore = IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr);

        StrategyModel.Recipe memory recipe = _uniV3FLRecipe(
            Addresses.WBTC_ADDR, Addresses.WETH_ADDR, WBTC_WETH_UNI_V3_POOL, 0, wethAmount
        );

        _executeRecipe(recipe);

        _assertNoBalanceChange(Addresses.WETH_ADDR, flActionBalanceBefore);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), walletBalanceBefore - wethFee);
    }
}
