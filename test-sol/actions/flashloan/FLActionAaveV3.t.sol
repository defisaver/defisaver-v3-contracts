// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { FLActionTestBase } from "./FLActionTestBase.t.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

contract TestFLActionAaveV3 is FLActionTestBase {
    function test_should_get_usdt_aave_v3_flashloan() public {
        uint256 amount = 5000e6;
        uint256 fee = _aaveV3Fee(amount);

        _giveFeeAndDust(Addresses.USDT_ADDR, fee);

        uint256 flActionBalanceBefore = IERC20(Addresses.USDT_ADDR).balanceOf(flActionAddr);
        uint256 walletBalanceBefore = IERC20(Addresses.USDT_ADDR).balanceOf(walletAddr);

        StrategyModel.Recipe memory recipe = _singleTokenFLRecipe(
            "AaveV3UsdtFLRecipe", Addresses.USDT_ADDR, amount, FLSource.AAVEV3
        );

        _executeRecipe(recipe);

        _assertNoBalanceChange(Addresses.USDT_ADDR, flActionBalanceBefore);
        assertEq(IERC20(Addresses.USDT_ADDR).balanceOf(walletAddr), walletBalanceBefore - fee);
    }

    function test_should_get_dai_aave_v3_flashloan() public {
        // DAI is not deployed on Plasma.
        if (isPlasmaSelected()) vm.skip(true);

        uint256 amount = 5000e18;
        uint256 fee = _aaveV3Fee(amount);

        _giveFeeAndDust(Addresses.DAI_ADDR, fee);

        uint256 flActionBalanceBefore = IERC20(Addresses.DAI_ADDR).balanceOf(flActionAddr);
        uint256 walletBalanceBefore = IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr);

        StrategyModel.Recipe memory recipe =
            _singleTokenFLRecipe("AaveV3DaiFLRecipe", Addresses.DAI_ADDR, amount, FLSource.AAVEV3);

        _executeRecipe(recipe);

        _assertNoBalanceChange(Addresses.DAI_ADDR, flActionBalanceBefore);
        assertEq(IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr), walletBalanceBefore - fee);
    }
}
