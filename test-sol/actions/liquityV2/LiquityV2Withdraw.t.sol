// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../contracts/interfaces/liquityV2/IAddressesRegistry.sol";
import { IPriceFeed } from "../../../contracts/interfaces/liquityV2/IPriceFeed.sol";
import { ITroveManager } from "../../../contracts/interfaces/liquityV2/ITroveManager.sol";
import { LiquityV2Open } from "../../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";
import { LiquityV2Withdraw } from "../../../contracts/actions/liquityV2/trove/LiquityV2Withdraw.sol";

import { LiquityV2ExecuteActions } from "../../utils/executeActions/LiquityV2ExecuteActions.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestLiquityV2Withdraw is LiquityV2ExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2Withdraw cut;

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
        forkMainnet("LiquityV2Withdraw");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2Withdraw();
        viewContract = new LiquityV2View();
        openContract = new LiquityV2Open();

        markets = getMarkets();
        BOLD = markets[0].boldToken();
        WETH = markets[0].collToken();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_withdraw_from_regular_trove() public {
        bool isDirect = false;
        address interestBatchManager = address(0);
        _baseTest(isDirect, interestBatchManager);
    }

    function test_should_withdraw_from_trove_inside_batch() public {
        bool isDirect = false;
        address interestBatchManager = address(0xdeadbeaf);
        _baseTest(isDirect, interestBatchManager);
    }

    function test_withdraw_action_direct() public {
        bool isDirect = true;
        address interestBatchManager = address(0);
        _baseTest(isDirect, interestBatchManager);
    }

    function _baseTest(bool _isDirect, address _interestBatchManager) public {
        uint256 collAmountInUSD = 30_000;
        uint256 borrowAmountInUSD = 10_000;
        uint256 withdrawAmountInUSD = 10_000;

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

            _withdraw(markets[i], troveId, _isDirect, withdrawAmountInUSD);
        }
    }

    function _withdraw(IAddressesRegistry _market, uint256 _troveId, bool _isDirect, uint256 _withdrawAmountInUSD)
        internal
    {
        uint256 collPriceWAD = IPriceFeed(_market.priceFeed()).lastGoodPrice();
        address collToken = _market.collToken();
        uint256 withdrawAmount = amountInUSDPriceMock(collToken, _withdrawAmountInUSD, collPriceWAD / 1e10);

        ITroveManager troveManager = ITroveManager(_market.troveManager());
        ITroveManager.LatestTroveData memory troveData = troveManager.getLatestTroveData(_troveId);
        uint256 entireColl = troveData.entireColl;

        bytes memory executeActionCallData = executeActionCalldata(
            liquityV2WithdrawEncode(address(_market), sender, _troveId, withdrawAmount), _isDirect
        );

        uint256 senderCollBalanceBefore = balanceOf(collToken, sender);
        wallet.execute(address(cut), executeActionCallData, 0);
        uint256 senderCollBalanceAfter = balanceOf(collToken, sender);

        assertEq(senderCollBalanceAfter, senderCollBalanceBefore + withdrawAmount);
        troveData = troveManager.getLatestTroveData(_troveId);
        assertEq(troveData.entireColl, entireColl - withdrawAmount);
    }
}
