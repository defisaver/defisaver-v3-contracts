// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { AaveV3MinDebtTrigger } from "../../contracts/triggers/AaveV3MinDebtTrigger.sol";
import { IPoolV3 } from "../../contracts/interfaces/protocols/aaveV3/IPoolV3.sol";
import {
    IPoolAddressesProvider
} from "../../contracts/interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { console } from "forge-std/console.sol";

contract TestAaveV3MinDebtTrigger is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3MinDebtTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Mainnet AaveV3 main market (PoolAddressesProvider).
    address internal constant MARKET = 0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e;

    /// @dev minDebt is denominated in whole USD (no decimals), so 5000 USD == 5000.
    uint256 internal constant MIN_DEBT = 5000;

    /// @dev totalDebtBase is reported in USD with 8 decimals; divide by 1e8 to get whole USD (the minDebt unit).
    uint256 internal constant PRECISION = 1e8;

    /// @dev Positions whose debt sits just below MIN_DEBT at the forked block.
    address[7] internal closelyBelowUsers = [
        0x4A0789F9De105BFDC729039D8d7ba781E9A3C3d8,
        0x8D2b0f5aA66d26249897b4C7E81367cd11f25Cd9,
        0x2239B4C93078d06250e37b78c603205BF46Fb6Aa,
        0xfc8ED9f0622A98847A829AAd5401A711d2A2B8eD,
        0x76887748856ecbcaC9043aD2CF4Aff7c0B7cd97D,
        0x039E4a6d9633fa330918b1E6dC8183085C9E9b1e,
        0xC094A30C8a82fA5Ea76F81DFD8055eDAd37d4fb9
    ];

    /// @dev Positions whose debt sits just above MIN_DEBT at the forked block.
    address[6] internal slightlyAboveUsers = [
        0x95B1070dD9A5fbB151b8AA69c209a742d6Fd4C31,
        0xECCAddc77268Db5091e9201A3a77A950c6Ea6Fb0,
        0x7a03b2e8ACe63164896717C1b22647aA450954A7,
        0x9e3729B89959724B1556e2b5b3d5d28E70334E2C,
        0x3d39d6f1af0875672df96c7f11037B8899bfaa54,
        0x9bafc93D0A8Cef41Eef7fE74b157DcE04E948363
    ];

    /// @dev Positions whose debt is clearly above MIN_DEBT at the forked block.
    address[3] internal clearlyAboveUsers = [
        0x9600A48ed0f931d0c422D574e3275a90D8b22745,
        0xf0bb20865277aBd641a307eCe5Ee04E79073416C,
        0xABdbBd00Fad79b257e7313B398A1Ea10d9EEf8D6
    ];

    /// @dev Positions with no debt at the forked block.
    address[3] internal noDebtUsers = [
        0x90E9A41a2F3E56951a80842B4193eA5344a2F6f0,
        0x4d1BF07b5E3897517659f0b4356d4914b446CdB0,
        0x06080E9B07619102894ACEC1Ae503681400B4042
    ];

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("AaveV3MinDebtTrigger");

        if (isL2NetworkSelected()) vm.skip(true, "AaveV3MinDebtTrigger test is mainnet only");

        cut = new AaveV3MinDebtTrigger();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_not_trigger_when_debt_closely_below_min() public view {
        for (uint256 i = 0; i < closelyBelowUsers.length; ++i) {
            address user = closelyBelowUsers[i];
            uint256 debt = getUserDebt(user);
            console.log("closelyBelow user debt:", debt);

            assertLt(debt, MIN_DEBT, "debt should be below min for closelyBelow user");
            assertFalse(isTriggered(user, MIN_DEBT), "should not trigger when debt below min");
        }
    }

    /// @dev The slightly-above cluster sits a touch over the 5000 USD threshold at the forked block.
    function test_should_trigger_when_debt_slightly_above_min() public view {
        for (uint256 i = 0; i < slightlyAboveUsers.length; ++i) {
            address user = slightlyAboveUsers[i];
            uint256 debt = getUserDebt(user);
            console.log("slightlyAbove user debt:", debt);

            assertGe(debt, MIN_DEBT, "debt should be >= min for slightlyAbove user");
            assertTrue(isTriggered(user, MIN_DEBT), "should trigger when debt above min");
        }
    }

    function test_should_trigger_when_debt_clearly_above_min() public view {
        for (uint256 i = 0; i < clearlyAboveUsers.length; ++i) {
            address user = clearlyAboveUsers[i];
            uint256 debt = getUserDebt(user);
            console.log("clearlyAbove user debt:", debt);

            assertGe(debt, MIN_DEBT, "debt should be >= min for clearlyAbove user");
            assertTrue(isTriggered(user, MIN_DEBT), "should trigger when debt clearly above min");
        }
    }

    function test_should_not_trigger_when_user_has_no_debt() public view {
        for (uint256 i = 0; i < noDebtUsers.length; ++i) {
            address user = noDebtUsers[i];
            uint256 debt = getUserDebt(user);

            assertEq(debt, 0, "noDebt user should have zero debt");
            assertFalse(isTriggered(user, MIN_DEBT), "should not trigger when user has no debt");
        }
    }

    /// @dev With minDebt == 0 the check is `debt >= 0`, which holds for every user, even with no debt.
    function test_should_always_trigger_when_min_debt_is_zero() public view {
        assertTrue(isTriggered(noDebtUsers[0], 0), "zero min debt should always trigger");
        assertTrue(isTriggered(clearlyAboveUsers[0], 0), "zero min debt should always trigger");
    }

    /// @dev Exact boundary: trigger fires at debt == minDebt but not at debt == minDebt + 1.
    function test_should_respect_inclusive_boundary() public view {
        address user = clearlyAboveUsers[0];
        uint256 debt = getUserDebt(user);

        assertTrue(isTriggered(user, debt), "should trigger when min equals exact debt");
        assertFalse(isTriggered(user, debt + 1), "should not trigger when min exceeds debt by 1");
    }

    function test_parse_call_inputs_decodes_params() public view {
        AaveV3MinDebtTrigger.CalldataParams memory expected = AaveV3MinDebtTrigger.CalldataParams({
            user: clearlyAboveUsers[0], market: MARKET, minDebt: MIN_DEBT
        });

        AaveV3MinDebtTrigger.CalldataParams memory decoded =
            cut.parseCallInputs(abi.encode(expected));

        assertEq(decoded.user, expected.user);
        assertEq(decoded.market, expected.market);
        assertEq(decoded.minDebt, expected.minDebt);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function isTriggered(address _user, uint256 _minDebt) internal view returns (bool) {
        AaveV3MinDebtTrigger.CalldataParams memory params =
            AaveV3MinDebtTrigger.CalldataParams({ user: _user, market: MARKET, minDebt: _minDebt });

        return cut.isTriggered(abi.encode(params), bytes(""));
    }

    /// @dev Returns the user's total debt converted to the minDebt unit (whole USD).
    function getUserDebt(address _user) internal view returns (uint256 totalDebtUSD) {
        IPoolV3 lendingPool = IPoolV3(IPoolAddressesProvider(MARKET).getPool());
        (, uint256 totalDebtBase,,,,) = lendingPool.getUserAccountData(_user);
        totalDebtUSD = totalDebtBase / PRECISION;
    }
}
