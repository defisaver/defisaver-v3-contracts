// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../contracts/interfaces/liquityV2/IAddressesRegistry.sol";
import { ITroveNFT } from "../../../contracts/interfaces/liquityV2/ITroveNFT.sol";
import { ITroveManager } from "../../../contracts/interfaces/liquityV2/ITroveManager.sol";
import { LiquityV2Open } from "../../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";
import { LiquityV2Close } from "../../../contracts/actions/liquityV2/trove/LiquityV2Close.sol";

import { LiquityV2ExecuteActions } from "../../utils/executeActions/LiquityV2ExecuteActions.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestLiquityV2Close is LiquityV2ExecuteActions {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2Close cut;

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
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2Close();
        viewContract = new LiquityV2View();
        openContract = new LiquityV2Open();

        markets = new IAddressesRegistry[](1);
        markets[0] = IAddressesRegistry(WETH_MARKET_ADDR);
        BOLD = markets[0].boldToken();
        WETH = markets[0].collToken();

        // After closing, at least one trove must remain, so create a test trove.
        SmartWallet testWallet = new SmartWallet(alice);
        for (uint256 i = 0; i < markets.length; ++i) {
            executeLiquityOpenTrove(
                markets[i],
                address(0),
                100000,
                i,
                10000,
                1e18 / 10,
                0,
                testWallet,
                openContract,
                viewContract
            );
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_close_regular_trove() public {
        bool isDirect = false;
        address interestBatchManager = address(0);
        _baseTest(isDirect, interestBatchManager);
    }

    function test_should_close_trove_direct() public {
        bool isDirect = true;
        address interestBatchManager = address(0);
        _baseTest(isDirect, interestBatchManager);
    }

    function test_should_close_trove_inside_batch() public {
        bool isDirect = false;
        address interestBatchManager = address(0xdeadbeef);
        _baseTest(isDirect, interestBatchManager);
    }

    function _baseTest(bool _isDirect, address _interestBatchManager) public {
        uint256 collAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;

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

            vm.warp(block.timestamp + 1 days);

            _close(markets[i], troveId, _isDirect);
        }
    }

    function _close(IAddressesRegistry _market, uint256 _troveId, bool _isDirect) internal {
        ITroveManager troveManager = ITroveManager(_market.troveManager());
        ITroveManager.LatestTroveData memory troveData = troveManager.getLatestTroveData(_troveId);
        address collToken = _market.collToken();
        uint256 entireDebt = troveData.entireDebt;
        uint256 entireColl = troveData.entireColl;

        give(BOLD, sender, entireDebt);
        approveAsSender(sender, BOLD, walletAddr, entireDebt);

        bytes memory executeActionCallData = executeActionCalldata(
            liquityV2CloseEncode(
                address(_market),
                sender,
                sender,
                _troveId
            ),
            _isDirect
        );

        {
            uint256 senderBoldBalanceBefore = balanceOf(BOLD, sender);
            uint256 senderCollBalanceBefore = balanceOf(collToken, sender);
            uint256 senderWethBalanceBefore = balanceOf(WETH, sender);

            wallet.execute(address(cut), executeActionCallData, 0);

            uint256 senderBoldBalanceAfter = balanceOf(BOLD, sender);
            uint256 senderCollBalanceAfter = balanceOf(collToken, sender);
            uint256 senderWethBalanceAfter = balanceOf(WETH, sender);

            if (collToken == WETH) {
                assertEq(senderWethBalanceAfter, senderWethBalanceBefore + entireColl + ETH_GAS_COMPENSATION);
            } else {
                assertEq(senderWethBalanceAfter, senderWethBalanceBefore + ETH_GAS_COMPENSATION);
                assertEq(senderCollBalanceAfter, senderCollBalanceBefore + entireColl);
            }
            assertEq(senderBoldBalanceAfter, senderBoldBalanceBefore - entireDebt);
        }

        LiquityV2View.TroveData memory closedTroveData = viewContract.getTroveInfo(address(_market), _troveId);
        assertEq(uint256(closedTroveData.status), uint256(ITroveManager.Status.closedByOwner));
    }
}