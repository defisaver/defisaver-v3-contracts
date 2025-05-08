// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../contracts/interfaces/liquityV2/IAddressesRegistry.sol";
import { IPriceFeed } from "../../../contracts/interfaces/liquityV2/IPriceFeed.sol";
import { IHintHelpers } from "../../../contracts/interfaces/liquityV2/IHintHelpers.sol";
import { ITroveManager } from "../../../contracts/interfaces/liquityV2/ITroveManager.sol";
import { ISortedTroves } from "../../../contracts/interfaces/liquityV2/ISortedTroves.sol";
import { LiquityV2Open } from "../../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";
import { LiquityV2AdjustZombieTrove } from "../../../contracts/actions/liquityV2/trove/LiquityV2AdjustZombieTrove.sol";

import { LiquityV2ExecuteActions } from "../../utils/executeActions/LiquityV2ExecuteActions.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestLiquityV2AdjustZombieTrove is LiquityV2ExecuteActions {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2AdjustZombieTrove cut;

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

    struct TestConfig {
        bool isDirect;
        address interestBatchManager;
        uint256 supplyAmountInUSD;
        uint256 withdrawAmountInUSD;
        uint256 borrowAmountInUSD;
        uint256 paybackAmountInUSD;
        uint256 openCollateralAmountInUSD;
        uint256 openBorrowAmountInUSD;
    }

    struct TestAdjustLocalVars {
        address collToken;
        uint256 collPriceWAD;
        uint256 supplyAmount;
        uint256 paybackAmount;
        uint256 withdrawAmount;
        uint256 borrowAmount;
        uint256 collAmount;
        uint256 debtAmount;
        uint256 maxUpfrontFee;
        uint256 upperHint;
        uint256 lowerHint;
        bytes executeActionCallData;
        uint256 senderCollBalanceBefore;
        uint256 senderCollBalanceAfter;
        uint256 senderBoldBalanceBefore;
        uint256 senderBoldBalanceAfter;
        LiquityV2AdjustZombieTrove.CollActionType collAction;
        LiquityV2AdjustZombieTrove.DebtActionType debtAction;
        LiquityV2View.TroveData troveDataBefore;
        LiquityV2View.TroveData troveDataAfter;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("LiquityV2AdjustZombieTrove");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2AdjustZombieTrove();
        viewContract = new LiquityV2View();
        openContract = new LiquityV2Open();

        markets = getMarkets();
        BOLD = markets[0].boldToken();
        WETH = markets[0].collToken();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_adjust_supply_borrow() public {
        _baseTest(
            TestConfig({
                isDirect: false,
                interestBatchManager: address(0),
                supplyAmountInUSD: 30000,
                withdrawAmountInUSD: 0,
                borrowAmountInUSD: 10000,
                paybackAmountInUSD: 0,
                openCollateralAmountInUSD: 40000,
                openBorrowAmountInUSD: 5000
            })
        );
    }

    function test_should_adjust_withdraw_payback() public {
        _baseTest(
            TestConfig({
                isDirect: true,
                interestBatchManager: address(0xdeadbeaf),
                supplyAmountInUSD: 0,
                withdrawAmountInUSD: 10000,
                borrowAmountInUSD: 0,
                paybackAmountInUSD: 10000,
                openCollateralAmountInUSD: 40000,
                openBorrowAmountInUSD: 15000
            })
        );
    }

    function test_should_adjust_supply_payback() public {
        _baseTest(
            TestConfig({
                isDirect: true,
                interestBatchManager: address(0xdeadbeaf),
                supplyAmountInUSD: 10000,
                withdrawAmountInUSD: 0,
                borrowAmountInUSD: 0,
                paybackAmountInUSD: 10000,
                openCollateralAmountInUSD: 40000,
                openBorrowAmountInUSD: 15000
            })
        );
    }

    function test_should_adjust_withdraw_borrow() public {
        _baseTest(
            TestConfig({
                isDirect: true,
                interestBatchManager: address(0xdeadbeaf),
                supplyAmountInUSD: 0,
                withdrawAmountInUSD: 5000,
                borrowAmountInUSD: 10000,
                paybackAmountInUSD: 0,
                openCollateralAmountInUSD: 50000,
                openBorrowAmountInUSD: 15000
            })
        );
    }

    function _baseTest(TestConfig memory _config) public {
        for (uint256 i = 0; i < markets.length; i++) {
            if (_config.interestBatchManager != address(0)) {
                vm.startPrank(_config.interestBatchManager);
                registerBatchManager(markets[i]);
                vm.stopPrank();
            }
            uint256 troveId = executeLiquityOpenTrove(
                markets[i],
                _config.interestBatchManager,
                _config.openCollateralAmountInUSD,
                i,
                _config.openBorrowAmountInUSD,
                1e18 / 10,
                0,
                wallet,
                openContract,
                viewContract
            );

            _makeTroveZombie(markets[i], troveId);

            _adjust(markets[i], troveId, _config, i);
        }
    }


    /// @dev Helper function that manipulates storage layout of trove
    /// This removes need for redemptions calls and allows us to test various trove states
    function _makeTroveZombie(IAddressesRegistry _market, uint256 _troveId) internal {

        // Make trove zombie
        {
            address troveManager = _market.troveManager();
            uint256 trovesMappingSlot = 11;
            uint256 troveStatusOffset = 3;
            bytes32 troveSlot = keccak256(abi.encode(_troveId, trovesMappingSlot));
            bytes32 troveStatusSlot = bytes32(uint256(troveSlot) + troveStatusOffset);

            vm.store(
                troveManager,
                troveStatusSlot,
                bytes32(uint256(ITroveManager.Status.zombie))
            );

            // verify trove is zombie
            assertEq(
                uint8(ITroveManager(_market.troveManager()).getTroveStatus(_troveId)),
                uint8(ITroveManager.Status.zombie)
            );
        }

        // Remove trove from list
        {   
            address sortedTroves = _market.sortedTroves();
            uint256 sizeSlot = 0;
            uint256 nodesSlot = 1;
            
            bytes32 nodeTroveIdSlot = keccak256(abi.encode(_troveId, nodesSlot));
            
            bytes32 nodeTroveIdNextIdSlot = nodeTroveIdSlot;
            bytes32 nodeTroveIdNextIdValue = vm.load(sortedTroves, nodeTroveIdNextIdSlot);

            bytes32 nodeTroveIdPrevIdSlot = bytes32(uint256(nodeTroveIdSlot) + 1);
            bytes32 nodeTroveIdPrevIdValue = vm.load(sortedTroves, nodeTroveIdPrevIdSlot);

            // --size;
            vm.store(sortedTroves, bytes32(sizeSlot), bytes32(ISortedTroves(sortedTroves).size() - 1));

            // nodes[nodes[_troveId].prevId].nextId = nodes[_troveId].nextId
            vm.store(
                sortedTroves,
                keccak256(abi.encode(nodeTroveIdPrevIdValue, nodesSlot)),
                nodeTroveIdNextIdValue
            );

            // nodes[nodes[_troveId].nextId].prevId = nodes[_troveId].prevId;
            vm.store(
                sortedTroves,
                bytes32(uint256(keccak256(abi.encode(nodeTroveIdNextIdValue, nodesSlot))) + 1),
                nodeTroveIdPrevIdValue
            );

            // delete nodes[_troveId];
            vm.store(sortedTroves, nodeTroveIdSlot, bytes32(0));
            vm.store(sortedTroves, bytes32(uint256(nodeTroveIdSlot) + 1), bytes32(0));
            vm.store(sortedTroves, bytes32(uint256(nodeTroveIdSlot) + 2), bytes32(0));
        }
    }

    function _adjust(
        IAddressesRegistry _market,
        uint256 _troveId,
        TestConfig memory _config,
        uint256 _collIndex
    ) internal {
        TestAdjustLocalVars memory vars;

        vars.troveDataBefore = viewContract.getTroveInfo(address(_market), _troveId);
        vars.collToken = _market.collToken();
        vars.collPriceWAD = IPriceFeed(_market.priceFeed()).lastGoodPrice();
        
        vars.supplyAmount = _config.supplyAmountInUSD > 0
            ? amountInUSDPriceMock(vars.collToken, _config.supplyAmountInUSD, vars.collPriceWAD / 1e10)
            : 0;
        
        vars.paybackAmount = _config.paybackAmountInUSD > 0
            ? amountInUSDPriceMock(BOLD, _config.paybackAmountInUSD, 1e18)
            : 0;
        
        vars.withdrawAmount = _config.withdrawAmountInUSD > 0
            ? amountInUSDPriceMock(vars.collToken, _config.withdrawAmountInUSD, vars.collPriceWAD / 1e10)
            : 0;
        
        vars.borrowAmount = _config.borrowAmountInUSD > 0
            ? amountInUSDPriceMock(BOLD, _config.borrowAmountInUSD, 1e18)
            : 0;
        
        vars.collAmount = vars.supplyAmount > 0 ? vars.supplyAmount : vars.withdrawAmount;
        vars.debtAmount = vars.borrowAmount > 0 ? vars.borrowAmount : vars.paybackAmount;
        
        vars.collAction = vars.supplyAmount > 0 
            ? LiquityV2AdjustZombieTrove.CollActionType.SUPPLY
            : LiquityV2AdjustZombieTrove.CollActionType.WITHDRAW;
        
        vars.debtAction = vars.borrowAmount > 0
            ? LiquityV2AdjustZombieTrove.DebtActionType.BORROW
            : LiquityV2AdjustZombieTrove.DebtActionType.PAYBACK;

        if (_config.supplyAmountInUSD > 0) {
            give(vars.collToken, sender, vars.supplyAmount);
            approveAsSender(sender, vars.collToken, walletAddr, vars.supplyAmount);
        }

        if (_config.paybackAmountInUSD > 0) {
            give(BOLD, sender, vars.paybackAmount);
            approveAsSender(sender, BOLD, walletAddr, vars.paybackAmount);
        }

        vars.maxUpfrontFee = vars.borrowAmount == 0
            ? 0
            : IHintHelpers(_market.hintHelpers()).predictAdjustTroveUpfrontFee(
                _collIndex,
                _troveId,
                vars.borrowAmount
            );

        (vars.upperHint, vars.lowerHint) = getInsertPosition(
            viewContract,
            _market,
            _collIndex,
            1e18 / 10
        );
            
        vars.executeActionCallData = executeActionCalldata(
            liquityV2AdjustZombieTroveEncode(
                address(_market),
                sender,
                sender,
                _troveId,
                vars.collAmount,
                vars.debtAmount,
                vars.upperHint,
                vars.lowerHint,
                vars.maxUpfrontFee,
                vars.collAction,
                vars.debtAction
            ),
            _config.isDirect
        );

        vars.senderCollBalanceBefore = balanceOf(vars.collToken, sender);
        vars.senderBoldBalanceBefore = balanceOf(BOLD, sender);

        wallet.execute(address(cut), vars.executeActionCallData, 0);
        
        vars.senderCollBalanceAfter = balanceOf(vars.collToken, sender);
        vars.senderBoldBalanceAfter = balanceOf(BOLD, sender);
        vars.troveDataAfter = viewContract.getTroveInfo(address(_market), _troveId);

        assertEq(uint8(vars.troveDataAfter.status), uint8(ITroveManager.Status.active));

        if (vars.collAction == LiquityV2AdjustZombieTrove.CollActionType.WITHDRAW) {
            assertEq(vars.senderCollBalanceAfter, vars.senderCollBalanceBefore + vars.withdrawAmount);
            assertEq(vars.troveDataAfter.collAmount, vars.troveDataBefore.collAmount - vars.withdrawAmount);
        } else {
            assertEq(vars.senderCollBalanceAfter, vars.senderCollBalanceBefore - vars.supplyAmount);
            assertEq(vars.troveDataAfter.collAmount, vars.troveDataBefore.collAmount + vars.supplyAmount);
        }

        if (vars.debtAction == LiquityV2AdjustZombieTrove.DebtActionType.PAYBACK) {
            assertEq(vars.senderBoldBalanceAfter, vars.senderBoldBalanceBefore - vars.paybackAmount);
            assertGe(vars.troveDataAfter.debtAmount, vars.troveDataBefore.debtAmount - vars.paybackAmount);
        } else {
            assertEq(vars.senderBoldBalanceAfter, vars.senderBoldBalanceBefore + vars.borrowAmount);
            assertGe(vars.troveDataAfter.debtAmount, vars.troveDataBefore.debtAmount + vars.borrowAmount);
        }
    }
}