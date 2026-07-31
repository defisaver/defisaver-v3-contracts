// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    MidnightSupplyCollateral
} from "../../../contracts/actions/midnight/MidnightSupplyCollateral.sol";
import { MidnightTestBase } from "./MidnightTestBase.t.sol";

contract TestMidnightSupplyCollateral is MidnightTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    MidnightSupplyCollateral internal cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    uint256 internal constant SUPPLY_AMOUNT = 10_000;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        super.setUp();
        cut = new MidnightSupplyCollateral();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_supply_direct() public {
        _supply(address(0), true);
    }

    function test_supply_recipe_wallet() public {
        _supply(walletAddr, false);
    }

    function test_supply_recipe_eoa() public {
        _authorizeWalletFor(sender);
        _supply(sender, false);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _supply(address _onBehalf, bool _isDirect) internal {
        address collateralToken = _getCollateralToken();
        address positionOwner = _onBehalf == address(0) ? walletAddr : _onBehalf;

        _fundSenderAndApproveWallet(collateralToken, SUPPLY_AMOUNT);

        uint256 senderBalanceBefore = balanceOf(collateralToken, sender);
        uint256 collateralBefore = MIDNIGHT.collateral(MARKET_ID, positionOwner, COLLATERAL_INDEX);

        MidnightSupplyCollateral.Params memory params = MidnightSupplyCollateral.Params({
            marketId: MARKET_ID,
            onBehalf: _onBehalf,
            from: sender,
            amount: SUPPLY_AMOUNT,
            collateralIndex: COLLATERAL_INDEX
        });

        wallet.execute(address(cut), executeActionCalldata(abi.encode(params), _isDirect), 0);

        assertEq(balanceOf(collateralToken, sender), senderBalanceBefore - SUPPLY_AMOUNT);
        assertEq(
            MIDNIGHT.collateral(MARKET_ID, positionOwner, COLLATERAL_INDEX),
            collateralBefore + SUPPLY_AMOUNT
        );
        _assertNoWalletResidue(collateralToken);
    }
}
