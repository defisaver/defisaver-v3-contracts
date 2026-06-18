// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { AaveV4MinDebtTrigger } from "../../contracts/triggers/AaveV4MinDebtTrigger.sol";
import { ISpoke } from "../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { console } from "forge-std/console.sol";

contract TestAaveV4MinDebtTrigger is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4MinDebtTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev AaveV4 main spoke address used as the market.
    address internal constant MARKET = 0x94e7A5dCbE816e498b89aB752661904E2F56c485;

    /// @dev minDebt is denominated in whole USD (no decimals), so 5000 USD == 5000.
    uint256 internal constant MIN_DEBT = 5000;

    /// @dev Aave V4 expresses the position value with 26 decimals (1e26 == 1 USD), scaled by RAY (1e27).
    ///      Dividing totalDebtValueRay by 1e53 yields the debt in whole USD (the minDebt unit).
    uint256 internal constant DEBT_RAY_TO_MIN_DEBT = 1e53;

    /// @dev Positions whose debt is clearly above MIN_DEBT at the forked block.
    address[5] internal clearlyAboveUsers = [
        0x311853eB5310a4f61215Ba48A520f95BB35348c8,
        0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50,
        0xaB3908E19b383289EbBA0CE2E4d14520A378c3ce,
        0x372cAE7fA19b81A9786A9081704EA1e2DAD576b7,
        0xf4A423D9325039F7Eb804EdCfccc8A3714cE27db
    ];

    /// @dev Positions whose debt sits just above MIN_DEBT at the forked block.
    address[6] internal slightlyAboveUsers = [
        0x377296dcA10F8a0711FBB3d7C3a850d6d3c23928,
        0x717eE040Ed692167a0a64ef22AdEf54ED1e2607e,
        0xD725FFeF0b3e59550afF097A0bF115F831A84603,
        0x9736dEd01c51b413eE99D9F9aC5EECE62A7f5bFf,
        0x9593B3f7155D234869b30c038A7017d27a4fc999,
        0x0e2ac680f55EE9Bde7c778617C9C22Ed2257e726
    ];

    /// @dev Positions whose debt sits just below MIN_DEBT at the forked block.
    address[5] internal closelyBelowUsers = [
        0x6883855b67801c68371e37F11e0fD30E4D2ccD41,
        0x1107Cc8eE534ebd65c65861FEC385848E0F0Cc48,
        0x3bA872d2527646F1f7450CEB70B55a300F3c4e85,
        0xe0EE04a0E0f71c54879b53eDf91e4Fa7EEC3Bdcc,
        0x2F855A6F6678CBf7cB735a8dD4cF975E9b39e0ED
    ];

    /// @dev Positions with no debt at the forked block.
    address[5] internal noDebtUsers = [
        0x3C22eb730B64e0Cc084A00cECA7a5Fd991F85783,
        0xF0fefaCC6b975791170a5D34583B5617C5E06647,
        0x3C48FEA54C48785Eb59C42C0FA7B1BD4715126be,
        0xd8C48A356B19b2FE6046a570a8C1E906E3D6B0Ef,
        0xFf786bf4c5b38b2c02AdB7D910587d8D46515D3E
    ];

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("AaveV4MinDebtTrigger");

        if (isL2NetworkSelected()) vm.skip(true, "AaveV4MinDebtTrigger test is mainnet only");

        cut = new AaveV4MinDebtTrigger();
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
        AaveV4MinDebtTrigger.CalldataParams memory expected = AaveV4MinDebtTrigger.CalldataParams({
            user: clearlyAboveUsers[0], market: MARKET, minDebt: MIN_DEBT
        });

        AaveV4MinDebtTrigger.CalldataParams memory decoded =
            cut.parseCallInputs(abi.encode(expected));

        assertEq(decoded.user, expected.user);
        assertEq(decoded.market, expected.market);
        assertEq(decoded.minDebt, expected.minDebt);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function isTriggered(address _user, uint256 _minDebt) internal view returns (bool) {
        AaveV4MinDebtTrigger.CalldataParams memory params =
            AaveV4MinDebtTrigger.CalldataParams({ user: _user, market: MARKET, minDebt: _minDebt });

        return cut.isTriggered(abi.encode(params), bytes(""));
    }

    /// @dev Returns the user's total debt converted to the minDebt unit (whole USD).
    function getUserDebt(address _user) internal view returns (uint256 totalDebtUSD) {
        uint256 totalDebtValueRay = ISpoke(MARKET).getUserAccountData(_user).totalDebtValueRay;
        totalDebtUSD = totalDebtValueRay / DEBT_RAY_TO_MIN_DEBT;
    }
}
