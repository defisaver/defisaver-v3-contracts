// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { FLActionTestBase } from "./FLActionTestBase.t.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

contract TestFLActionERC3156 is FLActionTestBase {
    function test_should_get_dai_maker_flashloan() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 amount = 1000e18;
        uint256 fee = _erc3156Fee(DSS_FLASH_ADDR, DAI_ADDR, amount);

        _giveFeeAndDust(Addresses.DAI_ADDR, fee);

        uint256 flActionBalanceBefore = IERC20(Addresses.DAI_ADDR).balanceOf(flActionAddr);
        uint256 walletBalanceBefore = IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr);

        StrategyModel.Recipe memory recipe =
            _singleTokenFLRecipe("MakerDaiFLRecipe", Addresses.DAI_ADDR, amount, FLSource.MAKER);

        _executeRecipe(recipe);

        _assertNoBalanceChange(Addresses.DAI_ADDR, flActionBalanceBefore);
        assertEq(IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr), walletBalanceBefore - fee);
    }

    function test_should_get_gho_flashloan() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 amount = 10_000e18;
        uint256 fee = _erc3156Fee(GHO_FLASH_MINTER_ADDR, GHO_ADDR, amount);

        _giveFeeAndDust(GHO_ADDR, fee);

        uint256 flActionBalanceBefore = IERC20(GHO_ADDR).balanceOf(flActionAddr);
        uint256 walletBalanceBefore = IERC20(GHO_ADDR).balanceOf(walletAddr);

        StrategyModel.Recipe memory recipe =
            _singleTokenFLRecipe("GhoFLRecipe", GHO_ADDR, amount, FLSource.GHO);

        _executeRecipe(recipe);

        _assertNoBalanceChange(GHO_ADDR, flActionBalanceBefore);
        assertEq(IERC20(GHO_ADDR).balanceOf(walletAddr), walletBalanceBefore - fee);
    }

    function test_should_get_curveusd_flashloan() public {
        if (isL2NetworkSelected()) vm.skip(true);

        uint256 amount = 10_000e18;
        uint256 fee = _erc3156Fee(CURVEUSD_FLASH_ADDR, CURVEUSD_ADDR, amount);

        _giveFeeAndDust(CURVEUSD_ADDR, fee);

        uint256 flActionBalanceBefore = IERC20(CURVEUSD_ADDR).balanceOf(flActionAddr);
        uint256 walletBalanceBefore = IERC20(CURVEUSD_ADDR).balanceOf(walletAddr);

        StrategyModel.Recipe memory recipe =
            _singleTokenFLRecipe("CurveUsdFLRecipe", CURVEUSD_ADDR, amount, FLSource.CURVEUSD);

        _executeRecipe(recipe);

        _assertNoBalanceChange(CURVEUSD_ADDR, flActionBalanceBefore);
        assertEq(IERC20(CURVEUSD_ADDR).balanceOf(walletAddr), walletBalanceBefore - fee);
    }
}
