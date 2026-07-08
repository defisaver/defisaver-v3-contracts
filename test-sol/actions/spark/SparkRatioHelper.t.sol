// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../../utils/BaseTest.sol";
import { SparkRatioHelper } from "../../../contracts/actions/spark/helpers/SparkRatioHelper.sol";
import { console } from "forge-std/console.sol";

contract TestSparkRatioHelper is BaseTest, SparkRatioHelper {
    uint256 internal constant RATIO_ROUNDING_TOLERANCE = 1e4;

    function setUp() public override {
        forkFromEnv("SparkRatioHelper");

        if (!isMainnetSelected()) {
            vm.skip(true, "Test only supported on Mainnet");
        }
    }

    function test_should_return_same_ratio_for_non_ltv_zero_positions() public view {
        address[6] memory users = [
            0xFcf7A0Bc9309447b55f734Be6C86866279cc467A,
            0x5DE580bC902397BEbF51E55786F248E4EFC561c7,
            0x6325CBDa7D8768D77d9Cc875780935cc0aBdD0b3,
            0xe84bDDAc8a45b61A67b64b1BF8cA7aA65c8455Af,
            0x462a336dCac6eaF544106266914caa5a18b831d0,
            0x7eF216afdF22D1B336169a0C4bB7b5a531d1E528
        ];

        for (uint256 i = 0; i < users.length; ++i) {
            (uint256 ratio, uint256 ratioWithFallback) = _getRatios(users[i]);

            assertApproxEqAbs(ratioWithFallback, ratio, RATIO_ROUNDING_TOLERANCE);
            assertGt(ratio, WAD);
        }
    }

    function test_should_return_higher_fallback_ratio_for_mixed_ltv_zero_positions() public view {
        address[2] memory users = [
            0x563E033A5D48ece6177E1c85A133157C28714826, 0x7a8825a71D9B734407A74a9e7873F03B9560E44d
        ];

        for (uint256 i = 0; i < users.length; ++i) {
            (uint256 ratio, uint256 ratioWithFallback) = _getRatios(users[i]);

            assertGt(ratioWithFallback, ratio);
        }
    }

    function _getRatios(address _user)
        internal
        view
        returns (uint256 ratio, uint256 ratioWithFallback)
    {
        ratio = getSafetyRatio(DEFAULT_SPARK_MARKET, _user);
        ratioWithFallback = getSafetyRatioWithLtvZeroFallback(DEFAULT_SPARK_MARKET, _user);
        console.log("user", _user);
        console.log("ratio", ratio);
        console.log("ratioWithFallback", ratioWithFallback);
    }
}
