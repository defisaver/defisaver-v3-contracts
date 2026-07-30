// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../../utils/BaseTest.sol";
import { AaveV3RatioHelper } from "../../../contracts/actions/aaveV3/helpers/AaveV3RatioHelper.sol";

contract TestAaveV3RatioHelper is BaseTest, AaveV3RatioHelper {
    uint256 internal constant RATIO_ROUNDING_TOLERANCE = 1e4;

    function setUp() public override {
        forkFromEnv("AaveV3RatioHelper");

        if (!isMainnetSelected()) {
            vm.skip(true, "Test only supported on Mainnet");
        }
    }

    function test_should_return_same_ratio_for_non_ltv_zero_positions() public view {
        address[4] memory users = [
            0x99926Ab8E1B589500aE87977632f13cF7f70F242,
            0xABdbBd00Fad79b257e7313B398A1Ea10d9EEf8D6,
            0x78CCa58CeEebF201555a3c0F3DAeB55D1F1ca564,
            0x36Aab712E7E6820608D5C974d6f9A615ecfD46DB
        ];

        for (uint256 i = 0; i < users.length; ++i) {
            (uint256 ratio, uint256 ratioWithFallback) = _getRatios(users[i]);

            assertApproxEqAbs(ratioWithFallback, ratio, RATIO_ROUNDING_TOLERANCE);
            assertGt(ratio, WAD);
        }
    }

    function test_should_return_fallback_ratio_for_only_ltv_zero_positions() public view {
        address[2] memory users = [
            0x925713C121423e7BbF7045FF163BdBC0A298207a, 0xA4A4435e1a4B4f424c2a33d5c8c9809B0F32d788
        ];

        for (uint256 i = 0; i < users.length; ++i) {
            (uint256 ratio, uint256 ratioWithFallback) = _getRatios(users[i]);

            assertEq(ratio, WAD);
            assertGt(ratioWithFallback, WAD);
        }
    }

    function test_should_return_higher_fallback_ratio_for_mixed_ltv_zero_positions() public view {
        address[4] memory users = [
            0xA223e4985BF908eD3f8caCFe964A3D7c8Fae4C3B,
            0x5830A35d34Fd3FE8f7Dfdf3105549b7791cF7688,
            0x95368A0462B6caaf86F0AFe41bdd48469B734a3f,
            0x9495D189896FCb04e3d2E5bB102Ad76C6782c41A
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
        ratio = getSafetyRatio(DEFAULT_AAVE_MARKET, _user);
        ratioWithFallback = getSafetyRatioWithLtvZeroFallback(DEFAULT_AAVE_MARKET, _user);
    }
}
