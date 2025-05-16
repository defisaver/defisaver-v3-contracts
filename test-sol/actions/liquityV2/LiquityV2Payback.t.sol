// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../contracts/interfaces/liquityV2/IAddressesRegistry.sol";
import { LiquityV2Open } from "../../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";
import { LiquityV2Payback } from "../../../contracts/actions/liquityV2/trove/LiquityV2Payback.sol";

import { LiquityV2ExecuteActions } from "../../utils/executeActions/LiquityV2ExecuteActions.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestLiquityV2Payback is LiquityV2ExecuteActions {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2Payback cut;

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
        forkTenderly();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2Payback();
        viewContract = new LiquityV2View();
        openContract = new LiquityV2Open();

        markets = getMarkets();
        BOLD = markets[0].boldToken();
        WETH = markets[0].collToken();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_payback_to_regular_trove() public {
        bool isDirect = false;
        bool isMaxUint256Payback = false;
        address interestBatchManager = address(0);
        _baseTest(isDirect, isMaxUint256Payback, interestBatchManager);
    }

    function test_should_payback_to_trove_inside_batch() public {
        bool isDirect = false;
        bool isMaxUint256Payback = false;
        address interestBatchManager = address(0xdeadbeaf);
        _baseTest(isDirect, isMaxUint256Payback, interestBatchManager);
    }

    function test_should_payback_direct() public {
        bool isDirect = true;
        bool isMaxUint256Payback = false;
        address interestBatchManager = address(0);
        _baseTest(isDirect, isMaxUint256Payback, interestBatchManager);
    }

    function test_should_payback_maxUint256() public {
        bool isDirect = false;
        bool isMaxUint256Payback = true;
        address interestBatchManager = address(0);
        _baseTest(isDirect, isMaxUint256Payback, interestBatchManager);
    }

    function _baseTest(bool _isDirect, bool _isMaxUint256Payback, address _interestBatchManager) public {
        uint256 collAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;
        uint256 paybackAmountInUSD = 5000;

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

            _payback(
                markets[i],
                troveId,
                _isDirect,
                _isMaxUint256Payback,
                paybackAmountInUSD
            );
        }
    }

    function _payback(
        IAddressesRegistry _market,
        uint256 _troveId,
        bool _isDirect,
        bool _isMaxUint256Payback,
        uint256 _paybackAmountInUSD
    ) internal {
        LiquityV2View.TroveData memory troveData = viewContract.getTroveInfo(address(_market), _troveId);
        uint256 entireDebt = troveData.debtAmount;

        uint256 paybackAmount = _isMaxUint256Payback
            ? entireDebt > MIN_DEBT ? entireDebt - MIN_DEBT : 0
            : amountInUSDPriceMock(BOLD, _paybackAmountInUSD, 1e8);

        give(BOLD, sender, paybackAmount);
        approveAsSender(sender, BOLD, walletAddr, paybackAmount);

        bytes memory executeActionCallData = executeActionCalldata(
            liquityV2PaybackEncode(
                address(_market),
                sender,
                _troveId,
                _isMaxUint256Payback ? type(uint256).max : paybackAmount
            ),
            _isDirect
        );

        uint256 senderBoldBalanceBefore = balanceOf(BOLD, sender);
        wallet.execute(address(cut), executeActionCallData, 0);
        uint256 senderBoldBalanceAfter = balanceOf(BOLD, sender);

        assertEq(senderBoldBalanceAfter, senderBoldBalanceBefore - paybackAmount);
        troveData = viewContract.getTroveInfo(address(_market), _troveId);
        assertGe(troveData.debtAmount, entireDebt - paybackAmount);
    }
}