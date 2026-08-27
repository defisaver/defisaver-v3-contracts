// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    MidnightPaybackDirect
} from "../../../contracts/actions/midnight/MidnightPaybackDirect.sol";
import { MidnightTestBase } from "./MidnightTestBase.t.sol";

contract TestMidnightPaybackDirect is MidnightTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    MidnightPaybackDirect internal cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    uint128 internal constant WALLET_DEBT = 1_000_000;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        super.setUp();
        cut = new MidnightPaybackDirect();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_payback_direct() public {
        _authorizeWalletFor(TEST_USER);

        uint256 debt = MIDNIGHT.debt(MARKET_ID, TEST_USER);
        assertGt(debt, 1);

        _payback(TEST_USER, debt / 2, debt / 2, true);
    }

    function test_payback_recipe_wallet_max() public {
        _seedWalletDebt(WALLET_DEBT);
        _payback(address(0), type(uint256).max, WALLET_DEBT, false);
    }

    function test_payback_recipe_wallet_partial() public {
        _seedWalletDebt(WALLET_DEBT);
        _payback(walletAddr, WALLET_DEBT / 2, WALLET_DEBT / 2, false);
    }

    function test_payback_recipe_eoa_max() public {
        _authorizeWalletFor(TEST_USER);

        uint256 debt = MIDNIGHT.debt(MARKET_ID, TEST_USER);
        assertGt(debt, 0);

        _payback(TEST_USER, type(uint256).max, debt, false);
    }

    function test_payback_recipe_eoa_partial() public {
        _authorizeWalletFor(TEST_USER);

        uint256 debt = MIDNIGHT.debt(MARKET_ID, TEST_USER);
        assertGt(debt, 1);

        _payback(TEST_USER, debt / 2, debt / 2, false);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _payback(
        address _onBehalf,
        uint256 _inputAmount,
        uint256 _expectedAmount,
        bool _isDirect
    ) internal {
        address loanToken = _getLoanToken();
        address positionOwner = _onBehalf == address(0) ? walletAddr : _onBehalf;

        _fundSenderAndApproveWallet(loanToken, _expectedAmount);

        uint256 senderBalanceBefore = balanceOf(loanToken, sender);
        uint256 debtBefore = MIDNIGHT.debt(MARKET_ID, positionOwner);

        MidnightPaybackDirect.Params memory params = MidnightPaybackDirect.Params({
            marketId: MARKET_ID, onBehalf: _onBehalf, from: sender, amount: _inputAmount
        });

        wallet.execute(address(cut), executeActionCalldata(abi.encode(params), _isDirect), 0);

        assertEq(MIDNIGHT.debt(MARKET_ID, positionOwner), debtBefore - _expectedAmount);
        assertEq(balanceOf(loanToken, sender), senderBalanceBefore - _expectedAmount);
        _assertNoWalletResidue(loanToken);
    }
}
