// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { McdMinDebtTrigger } from "../../contracts/triggers/McdMinDebtTrigger.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { console } from "forge-std/console.sol";

contract TestMcdMinDebtTrigger is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    McdMinDebtTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev minDebt is denominated in whole USD (no decimals), so 5000 USD == 5000.
    uint256 internal constant MIN_DEBT = 5000;

    /// @dev CDPs whose debt sits just below MIN_DEBT at the forked block.
    uint256[3] internal closelyBelowCdps = [uint256(30_218), 6560, 30_136];

    /// @dev CDPs whose debt sits just above MIN_DEBT at the forked block.
    uint256[5] internal slightlyAboveCdps = [uint256(25_427), 29_357, 24_799, 30_538, 30_225];

    /// @dev CDPs whose debt is clearly above MIN_DEBT at the forked block.
    uint256[4] internal clearlyAboveCdps = [uint256(31_214), 28_104, 22_025, 30_009];

    /// @dev CDPs with no debt at the forked block.
    uint256[4] internal noDebtCdps = [uint256(25_019), 25_085, 7301, 8837];

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("McdMinDebtTrigger");

        if (isL2NetworkSelected()) vm.skip(true, "McdMinDebtTrigger test is mainnet only");

        cut = new McdMinDebtTrigger();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_not_trigger_when_debt_closely_below_min() public view {
        for (uint256 i = 0; i < closelyBelowCdps.length; ++i) {
            uint256 cdpId = closelyBelowCdps[i];
            uint256 debt = getCdpDebt(cdpId);
            console.log("closelyBelow cdp debt:", debt);

            assertLt(debt, MIN_DEBT, "debt should be below min for closelyBelow cdp");
            assertFalse(isTriggered(cdpId, MIN_DEBT), "should not trigger when debt below min");
        }
    }

    /// @dev The slightly-above cluster sits a touch over the 5000 USD threshold at the forked block.
    function test_should_trigger_when_debt_slightly_above_min() public view {
        for (uint256 i = 0; i < slightlyAboveCdps.length; ++i) {
            uint256 cdpId = slightlyAboveCdps[i];
            uint256 debt = getCdpDebt(cdpId);
            console.log("slightlyAbove cdp debt:", debt);

            assertGe(debt, MIN_DEBT, "debt should be >= min for slightlyAbove cdp");
            assertTrue(isTriggered(cdpId, MIN_DEBT), "should trigger when debt above min");
        }
    }

    function test_should_trigger_when_debt_clearly_above_min() public view {
        for (uint256 i = 0; i < clearlyAboveCdps.length; ++i) {
            uint256 cdpId = clearlyAboveCdps[i];
            uint256 debt = getCdpDebt(cdpId);
            console.log("clearlyAbove cdp debt:", debt);

            assertGe(debt, MIN_DEBT, "debt should be >= min for clearlyAbove cdp");
            assertTrue(isTriggered(cdpId, MIN_DEBT), "should trigger when debt clearly above min");
        }
    }

    function test_should_not_trigger_when_cdp_has_no_debt() public view {
        for (uint256 i = 0; i < noDebtCdps.length; ++i) {
            uint256 cdpId = noDebtCdps[i];
            uint256 debt = getCdpDebt(cdpId);

            assertEq(debt, 0, "noDebt cdp should have zero debt");
            assertFalse(isTriggered(cdpId, MIN_DEBT), "should not trigger when cdp has no debt");
        }
    }

    /// @dev With minDebt == 0 the check is `debt >= 0`, which holds for every cdp, even with no debt.
    function test_should_always_trigger_when_min_debt_is_zero() public view {
        assertTrue(isTriggered(noDebtCdps[0], 0), "zero min debt should always trigger");
        assertTrue(isTriggered(clearlyAboveCdps[0], 0), "zero min debt should always trigger");
    }

    /// @dev Exact boundary: trigger fires at debt == minDebt but not at debt == minDebt + 1.
    function test_should_respect_inclusive_boundary() public view {
        uint256 cdpId = clearlyAboveCdps[0];
        uint256 debt = getCdpDebt(cdpId);

        assertTrue(isTriggered(cdpId, debt), "should trigger when min equals exact debt");
        assertFalse(isTriggered(cdpId, debt + 1), "should not trigger when min exceeds debt by 1");
    }

    function test_parse_call_inputs_decodes_params() public view {
        McdMinDebtTrigger.CalldataParams memory expected =
            McdMinDebtTrigger.CalldataParams({ cdpId: clearlyAboveCdps[0], minDebt: MIN_DEBT });

        McdMinDebtTrigger.CalldataParams memory decoded = cut.parseCallInputs(abi.encode(expected));

        assertEq(decoded.cdpId, expected.cdpId);
        assertEq(decoded.minDebt, expected.minDebt);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function isTriggered(uint256 _cdpId, uint256 _minDebt) internal view returns (bool) {
        McdMinDebtTrigger.CalldataParams memory params =
            McdMinDebtTrigger.CalldataParams({ cdpId: _cdpId, minDebt: _minDebt });

        return cut.isTriggered(abi.encode(params), bytes(""));
    }

    /// @dev Returns the cdp's debt converted to the minDebt unit (whole USD/DAI), via the trigger's path.
    function getCdpDebt(uint256 _cdpId) internal view returns (uint256) {
        bytes32 ilk = cut.manager().ilks(_cdpId);
        (, uint256 debt) = cut.getCdpInfo(_cdpId, ilk);
        return debt / 1e18;
    }
}
