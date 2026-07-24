// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    MidnightWithdrawCollateral
} from "../../../contracts/actions/midnight/MidnightWithdrawCollateral.sol";
import { MidnightTestBase } from "./MidnightTestBase.t.sol";

contract TestMidnightWithdrawCollateral is MidnightTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    MidnightWithdrawCollateral internal cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    uint256 internal constant WALLET_COLLATERAL = 10_000;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        super.setUp();
        cut = new MidnightWithdrawCollateral();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_withdraw_direct() public {
        _supplyCollateralToWallet(WALLET_COLLATERAL);
        _withdraw(address(0), WALLET_COLLATERAL / 2, WALLET_COLLATERAL / 2, true);
    }

    function test_withdraw_recipe_wallet_max() public {
        _supplyCollateralToWallet(WALLET_COLLATERAL);
        _withdraw(walletAddr, type(uint256).max, WALLET_COLLATERAL, false);
    }

    function test_withdraw_recipe_wallet_partial() public {
        _supplyCollateralToWallet(WALLET_COLLATERAL);
        _withdraw(walletAddr, WALLET_COLLATERAL / 2, WALLET_COLLATERAL / 2, false);
    }

    function test_withdraw_recipe_eoa_max() public {
        _clearDebt(TEST_USER);
        _authorizeWalletFor(TEST_USER);

        uint256 collateral = MIDNIGHT.collateral(MARKET_ID, TEST_USER, COLLATERAL_INDEX);
        assertGt(collateral, 0);

        _withdraw(TEST_USER, type(uint256).max, collateral, false);
    }

    function test_withdraw_recipe_eoa_partial() public {
        _clearDebt(TEST_USER);
        _authorizeWalletFor(TEST_USER);

        uint256 collateral = MIDNIGHT.collateral(MARKET_ID, TEST_USER, COLLATERAL_INDEX);
        assertGt(collateral, 1);

        _withdraw(TEST_USER, collateral / 2, collateral / 2, false);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _withdraw(
        address _onBehalf,
        uint256 _inputAmount,
        uint256 _expectedAmount,
        bool _isDirect
    ) internal {
        address collateralToken = _getCollateralToken();
        address positionOwner = _onBehalf == address(0) ? walletAddr : _onBehalf;

        uint256 receiverBalanceBefore = balanceOf(collateralToken, sender);
        uint256 collateralBefore = MIDNIGHT.collateral(MARKET_ID, positionOwner, COLLATERAL_INDEX);

        MidnightWithdrawCollateral.Params memory params = MidnightWithdrawCollateral.Params({
            marketId: MARKET_ID,
            onBehalf: _onBehalf,
            to: sender,
            amount: _inputAmount,
            collateralIndex: COLLATERAL_INDEX
        });

        wallet.execute(address(cut), executeActionCalldata(abi.encode(params), _isDirect), 0);

        assertEq(
            MIDNIGHT.collateral(MARKET_ID, positionOwner, COLLATERAL_INDEX),
            collateralBefore - _expectedAmount
        );
        assertEq(balanceOf(collateralToken, sender), receiverBalanceBefore + _expectedAmount);
        _assertNoWalletResidue(collateralToken);
    }
}
