// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IPoolV3 } from "../../contracts/interfaces/protocols/aaveV3/IPoolV3.sol";
import {
    IPoolAddressesProvider
} from "../../contracts/interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import { IERC20 } from "../../contracts/interfaces/token/IERC20.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import {
    AaveV3BoostCollateralTrigger
} from "../../contracts/triggers-additional/AaveV3BoostCollateralTrigger.sol";
import { DataTypes } from "../../contracts/interfaces/protocols/aaveV3/DataTypes.sol";

contract TestAaveV3BoostCollateralTrigger is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3BoostCollateralTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/
    address constant USER = address(0x1234);
    address constant MARKET = address(0x2345);
    address constant POOL = address(0x3456);

    /*//////////////////////////////////////////////////////////////////////////
                                    SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");
        cut = new AaveV3BoostCollateralTrigger();
        vm.mockCall(MARKET, abi.encodeCall(IPoolAddressesProvider.getPool, ()), abi.encode(POOL));
        userConfig(2, 0);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_emptyOrDebtOnly() public {
        userConfig(0, 0);
        assertFalse(check());
        userConfig(1, 0);
        assertFalse(check());
    }

    function test_ltvZeroIsNotLiquidationThreshold() public {
        reserve(0, 0, 1e18);
        assertFalse(check());
    }

    function test_noBalance() public {
        reserve(0, 8000, 0);
        assertFalse(check());
    }

    function test_positiveCollateral() public {
        reserve(0, 8000, 1);
        assertTrue(check());
    }

    function test_highestReserveId() public {
        userConfig(uint256(1) << 255, 0);
        reserve(127, 8000, 1);
        assertTrue(check());
    }

    function testFuzz_collateralBitmap(uint8 id) public {
        id = uint8(bound(id, 0, 127));
        reserve(id, 8000, 1);
        userConfig(uint256(1) << (uint256(id) * 2), 0);
        assertFalse(check());
        userConfig(uint256(1) << (uint256(id) * 2 + 1), 0);
        assertTrue(check());
    }

    function test_notChangeable() public view {
        assertFalse(cut.isChangeable());
        assertEq(cut.changedSubData(""), bytes(""));
    }

    function test_mixedCollateral() public {
        userConfig(10, 0);
        reserve(0, 0, 1e18);
        reserve(1, 8000, 1);
        assertTrue(check());
    }

    function test_disabledCollateralNotCounted() public {
        userConfig(2, 0);
        reserve(0, 0, 1);
        reserve(1, 8000, 1);
        assertFalse(check());
    }

    function test_emodeOverridesReserveLtv() public {
        reserve(0, 0, 1);
        emodeConfig(1, 0, false);
        assertTrue(check());
    }

    function test_emodeZeroBitmap() public {
        reserve(0, 8000, 1);
        emodeConfig(1, 1, false);
        assertFalse(check());
    }

    function test_outsideIsolatedEmode() public {
        reserve(0, 8000, 1);
        emodeConfig(0, 0, true);
        assertFalse(check());
    }

    function test_outsideNonIsolatedEmode() public {
        reserve(0, 8000, 1);
        emodeConfig(0, 0, false);
        assertTrue(check());
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function userConfig(uint256 bitmap, uint8 emode) internal {
        vm.mockCall(
            POOL,
            abi.encodeCall(IPoolV3.getUserConfiguration, (USER)),
            abi.encode(DataTypes.UserConfigurationMap(bitmap))
        );
        vm.mockCall(POOL, abi.encodeCall(IPoolV3.getUserEMode, (USER)), abi.encode(uint256(emode)));
    }

    function reserve(uint16 id, uint256 ltv, uint256 balance) internal {
        address asset = address(uint160(0x10000 + id));
        address aToken = address(uint160(0x20000 + id));
        DataTypes.ReserveData memory data;
        data.id = id;
        data.aTokenAddress = aToken;
        data.configuration.data = ltv | (7500 << 16);
        vm.mockCall(POOL, abi.encodeCall(IPoolV3.getReserveAddressById, (id)), abi.encode(asset));
        vm.mockCall(POOL, abi.encodeCall(IPoolV3.getReserveData, (asset)), abi.encode(data));
        vm.mockCall(aToken, abi.encodeCall(IERC20.balanceOf, (USER)), abi.encode(balance));
    }

    function check() internal view returns (bool) {
        return cut.isTriggered(abi.encode(USER, MARKET), "");
    }

    function emodeConfig(uint128 bitmap, uint128 zeroBitmap, bool isolated) internal {
        userConfig(2, 1);
        DataTypes.CollateralConfig memory config;
        config.ltv = 9000;
        config.liquidationThreshold = 9500;
        vm.mockCall(
            POOL, abi.encodeCall(IPoolV3.getEModeCategoryCollateralConfig, (1)), abi.encode(config)
        );
        vm.mockCall(
            POOL, abi.encodeCall(IPoolV3.getEModeCategoryCollateralBitmap, (1)), abi.encode(bitmap)
        );
        vm.mockCall(
            POOL, abi.encodeCall(IPoolV3.getEModeCategoryLtvzeroBitmap, (1)), abi.encode(zeroBitmap)
        );
        vm.mockCall(
            POOL, abi.encodeCall(IPoolV3.getIsEModeCategoryIsolated, (1)), abi.encode(isolated)
        );
    }
}
