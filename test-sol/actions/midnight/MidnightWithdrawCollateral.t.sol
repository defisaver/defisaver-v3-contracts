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
        bytes32[] memory marketIds = _getMarketIds();
        for (uint256 i = 0; i < marketIds.length; ++i) {
            marketId = marketIds[i];
            _supplyCollateralToWallet(WALLET_COLLATERAL);
            _withdraw(address(0), WALLET_COLLATERAL / 2, WALLET_COLLATERAL / 2, true);
        }
    }

    function test_withdraw_recipe_wallet_max() public {
        bytes32[] memory marketIds = _getMarketIds();
        for (uint256 i = 0; i < marketIds.length; ++i) {
            marketId = marketIds[i];
            _supplyCollateralToWallet(WALLET_COLLATERAL);
            _withdraw(walletAddr, type(uint256).max, WALLET_COLLATERAL, false);
        }
    }

    function test_withdraw_recipe_wallet_partial() public {
        bytes32[] memory marketIds = _getMarketIds();
        for (uint256 i = 0; i < marketIds.length; ++i) {
            marketId = marketIds[i];
            _supplyCollateralToWallet(WALLET_COLLATERAL);
            _withdraw(walletAddr, WALLET_COLLATERAL / 2, WALLET_COLLATERAL / 2, false);
        }
    }

    function test_withdraw_recipe_eoa_max() public {
        _authorizeWalletFor(testUser);
        bytes32[] memory marketIds = _getMarketIds();
        for (uint256 i = 0; i < marketIds.length; ++i) {
            marketId = marketIds[i];
            _supplyCollateral(testUser, WALLET_COLLATERAL);
            _withdraw(testUser, type(uint256).max, WALLET_COLLATERAL, false);
        }
    }

    function test_withdraw_recipe_eoa_partial() public {
        _authorizeWalletFor(testUser);
        bytes32[] memory marketIds = _getMarketIds();
        for (uint256 i = 0; i < marketIds.length; ++i) {
            marketId = marketIds[i];
            _supplyCollateral(testUser, WALLET_COLLATERAL);
            _withdraw(testUser, WALLET_COLLATERAL / 2, WALLET_COLLATERAL / 2, false);
        }
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
        uint256 collateralBefore = MIDNIGHT.collateral(marketId, positionOwner, COLLATERAL_INDEX);

        MidnightWithdrawCollateral.Params memory params = MidnightWithdrawCollateral.Params({
            marketId: marketId,
            onBehalf: _onBehalf,
            to: sender,
            amount: _inputAmount,
            collateralIndex: COLLATERAL_INDEX
        });

        wallet.execute(address(cut), executeActionCalldata(abi.encode(params), _isDirect), 0);

        assertEq(
            MIDNIGHT.collateral(marketId, positionOwner, COLLATERAL_INDEX),
            collateralBefore - _expectedAmount
        );
        assertEq(balanceOf(collateralToken, sender), receiverBalanceBefore + _expectedAmount);
        _assertNoWalletResidue(collateralToken);
    }
}
