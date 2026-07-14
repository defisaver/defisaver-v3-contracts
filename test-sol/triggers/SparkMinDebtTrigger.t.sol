// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { SparkMinDebtTrigger } from "../../contracts/triggers/SparkMinDebtTrigger.sol";
import { ISparkPool } from "../../contracts/interfaces/protocols/spark/ISparkPool.sol";
import {
    ISparkPoolAddressesProvider
} from "../../contracts/interfaces/protocols/spark/ISparkPoolAddressesProvider.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { console } from "forge-std/console.sol";

contract TestSparkMinDebtTrigger is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SparkMinDebtTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Mainnet Spark market (PoolAddressesProvider), hardcoded inside the trigger.
    address internal constant MARKET = 0x02C3eA4e34C0cBd694D2adFa2c690EECbC1793eE;

    /// @dev minDebt is denominated in whole USD (no decimals), so 5000 USD == 5000.
    uint256 internal constant MIN_DEBT = 5000;

    /// @dev totalDebtBase is reported in USD with 8 decimals; divide by 1e8 to get whole USD (the minDebt unit).
    uint256 internal constant PRECISION = 1e8;

    /// @dev Positions whose debt sits just below MIN_DEBT at the forked block.
    address[5] internal closelyBelowUsers = [
        0xd540381D0FE111F0C4E9AfD9AFc3E8027C9Fd037,
        0x2c4774e346cD7C4313aF9f536CEFd3385d35DA6a,
        0x449Ad665EBa0407C61E6461251c77545548368da,
        0x0298D28EFeD13158BB33dC0e7E0B9f7E8Fa9AD71,
        0xEC66036A20D0B7E155f9c62dc52C30196B706865
    ];

    /// @dev Positions whose debt sits just above MIN_DEBT at the forked block.
    address[5] internal slightlyAboveUsers = [
        0xf85D3AA80d5386B11A28C59C68D8b4896e82f2C1,
        0x97d4b038878549774F5E56317877Eec5A6d51113,
        0xd681c03fDAC97FC07e14167541da7c1b474f999a,
        0xDd22B300aAda99e117e505de1971Ab1b651fFab8,
        0xe586b0a7ABe605e466090B520ec7166429c096B4
    ];

    /// @dev Positions whose debt is clearly above MIN_DEBT at the forked block.
    address[3] internal clearlyAboveUsers = [
        0x9600A48ed0f931d0c422D574e3275a90D8b22745,
        0x3a0DC3fC4b84E2427ced214C9CE858eA218E97d9,
        0xF20b338752976878754518183873602902360704
    ];

    /// @dev Positions with no debt at the forked block.
    address[4] internal noDebtUsers = [
        0xd67E53C0B1cDc911Cd669Fa146E9730C5add3765,
        0x609076BbA6f0a303a5Cac58e900C8ac611cb15b5,
        0x459Ae4693B6442437941059247d264b952077c76,
        0x4B955C0A04a5dC459Cb4eFEEaD6e03840623a32d
    ];

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("SparkMinDebtTrigger");

        if (isL2NetworkSelected()) vm.skip(true, "SparkMinDebtTrigger test is mainnet only");

        cut = new SparkMinDebtTrigger();
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

    /// @dev "No debt" positions; one carries dust (< $1), which floors to 0 whole USD.
    function test_should_not_trigger_when_user_has_no_debt() public view {
        for (uint256 i = 0; i < noDebtUsers.length; ++i) {
            address user = noDebtUsers[i];
            uint256 debt = getUserDebt(user);

            assertLt(debt, 1, "noDebt user should have no debt at all or negligible debt");
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
        SparkMinDebtTrigger.CalldataParams memory expected =
            SparkMinDebtTrigger.CalldataParams({ user: clearlyAboveUsers[0], minDebt: MIN_DEBT });

        SparkMinDebtTrigger.CalldataParams memory decoded =
            cut.parseCallInputs(abi.encode(expected));

        assertEq(decoded.user, expected.user);
        assertEq(decoded.minDebt, expected.minDebt);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function isTriggered(address _user, uint256 _minDebt) internal view returns (bool) {
        SparkMinDebtTrigger.CalldataParams memory params =
            SparkMinDebtTrigger.CalldataParams({ user: _user, minDebt: _minDebt });

        return cut.isTriggered(abi.encode(params), bytes(""));
    }

    /// @dev Returns the user's total debt converted to the minDebt unit (whole USD).
    function getUserDebt(address _user) internal view returns (uint256 totalDebtUSD) {
        ISparkPool lendingPool = ISparkPool(ISparkPoolAddressesProvider(MARKET).getPool());
        (, uint256 totalDebtBase,,,,) = lendingPool.getUserAccountData(_user);
        totalDebtUSD = totalDebtBase / PRECISION;
    }
}
