// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IAddressesRegistry
} from "../../../contracts/interfaces/protocols/liquityV2/IAddressesRegistry.sol";
import { IHintHelpers } from "../../../contracts/interfaces/protocols/liquityV2/IHintHelpers.sol";
import { LiquityV2Open } from "../../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";
import { LiquityV2Borrow } from "../../../contracts/actions/liquityV2/trove/LiquityV2Borrow.sol";

import { LiquityV2ExecuteActions } from "../../utils/executeActions/LiquityV2ExecuteActions.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestLiquityV2Borrow is LiquityV2ExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2Borrow cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IAddressesRegistry[] markets;
    address BOLD;
    address WETH;

    LiquityV2View viewContract;
    LiquityV2Open openContract;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("LiquityV2Borrow");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2Borrow();
        viewContract = new LiquityV2View();
        openContract = new LiquityV2Open();

        markets = getMarkets();
        BOLD = markets[0].boldToken();
        WETH = markets[0].collToken();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_borrow_from_regular_trove() public {
        bool isDirect = false;
        address interestBatchManager = address(0);
        _baseTest(isDirect, interestBatchManager);
    }

    function test_should_borrow_from_trove_inside_batch() public {
        bool isDirect = false;
        address interestBatchManager = address(0xdeadbeaf);
        _baseTest(isDirect, interestBatchManager);
    }

    function test_borrow_action_direct() public {
        bool isDirect = true;
        address interestBatchManager = address(0);
        _baseTest(isDirect, interestBatchManager);
    }

    function _baseTest(bool _isDirect, address _interestBatchManager) public {
        uint256 collAmountInUSD = 30_000;
        uint256 borrowAmountInUSD = 10_000;
        uint256 additionalBorrowAmountInUSD = 5000;

        for (uint256 i = 0; i < markets.length; i++) {
            if (_interestBatchManager != address(0)) {
                vm.startPrank(_interestBatchManager);
                registerBatchManager(markets[i]);
                vm.stopPrank();
            }

            uint256 troveId = executeLiquityOpenTrove(
                markets[i],
                _interestBatchManager,
                collAmountInUSD,
                i,
                borrowAmountInUSD,
                1e18 / 10,
                0,
                wallet,
                openContract,
                viewContract
            );

            _borrow(markets[i], troveId, _isDirect, additionalBorrowAmountInUSD, i);
        }
    }

    function _borrow(
        IAddressesRegistry _market,
        uint256 _troveId,
        bool _isDirect,
        uint256 _borrowAmountInUsd,
        uint256 _collIndex
    ) internal {
        uint256 borrowAmount = amountInUSDPriceMock(BOLD, _borrowAmountInUsd, 1e8);

        LiquityV2View.TroveData memory troveData =
            viewContract.getTroveInfo(address(_market), _troveId);
        uint256 entireDebt = troveData.debtAmount;

        uint256 maxUpfrontFee = IHintHelpers(_market.hintHelpers())
            .predictAdjustTroveUpfrontFee(_collIndex, _troveId, borrowAmount);

        bytes memory executeActionCallData = executeActionCalldata(
            liquityV2BorrowEncode(address(_market), sender, _troveId, borrowAmount, maxUpfrontFee),
            _isDirect
        );

        uint256 senderBoldBalanceBefore = balanceOf(BOLD, sender);
        wallet.execute(address(cut), executeActionCallData, 0);
        uint256 senderBoldBalanceAfter = balanceOf(BOLD, sender);

        assertEq(senderBoldBalanceAfter, senderBoldBalanceBefore + borrowAmount);
        troveData = viewContract.getTroveInfo(address(_market), _troveId);
        assertGe(troveData.debtAmount, entireDebt + borrowAmount);
    }
}
