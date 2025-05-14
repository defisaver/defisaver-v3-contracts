// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../contracts/interfaces/liquityV2/IAddressesRegistry.sol";
import { IStabilityPool } from "../../../contracts/interfaces/liquityV2/IStabilityPool.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";
import { LiquityV2SPDeposit } from "../../../contracts/actions/liquityV2/stabilityPool/LiquityV2SPDeposit.sol";
import { LiquityV2SPWithdraw } from "../../../contracts/actions/liquityV2/stabilityPool/LiquityV2SPWithdraw.sol";

import { LiquityV2ExecuteActions } from "../../utils/executeActions/LiquityV2ExecuteActions.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestLiquityV2SPWithdraw is LiquityV2ExecuteActions {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2SPWithdraw cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IAddressesRegistry[] markets;
    address BOLD;
    address WETH;

    LiquityV2SPDeposit spDepositContract;
    LiquityV2View viewContract;

    struct TestSPWithdrawLocalParams {
        address collToken;
        address stabilityPool;
        uint256 simulatedCollGain;
        uint256 depositAmount;
        uint256 withdrawAmount;
        bytes executeActionCallData;
        uint256 compoundedBOLD;
        uint256 collGain;
        uint256 boldGain;
        uint256 compoundedBOLDAfter;
        uint256 collGainAfter;
        uint256 boldGainAfter;
        uint256 senderCollBalanceBefore;
        uint256 senderBoldBalanceBefore;
        uint256 senderCollBalanceAfter;
        uint256 senderBoldBalanceAfter;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkTenderly();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2SPWithdraw();
        viewContract = new LiquityV2View();
        spDepositContract = new LiquityV2SPDeposit();

        markets = getMarkets();
        BOLD = markets[0].boldToken();
        WETH = markets[0].collToken();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_withdraw_without_claim() public {
        bool isDirect = false;
        bool shouldClaim = false;
        bool isMaxUint256Withdraw = false;
        _baseTest(isDirect, shouldClaim, isMaxUint256Withdraw);
    }

    function test_should_withdraw_with_claim() public {
        bool isDirect = true;
        bool shouldClaim = true;
        bool isMaxUint256Withdraw = false;
        _baseTest(isDirect, shouldClaim, isMaxUint256Withdraw);
    }

    function test_should_withdraw_with_maxUint256() public {
        bool isDirect = true;
        bool shouldClaim = true;
        bool isMaxUint256Withdraw = true;
        _baseTest(isDirect, shouldClaim, isMaxUint256Withdraw);
    }

    function _baseTest(bool _isDirect, bool _shouldClaim, bool _isMaxUint256Withdraw) public {
        for (uint256 i = 0; i < markets.length; i++) {

            TestSPWithdrawLocalParams memory vars;

            // Max withdrawal has to leave at least MIN_BOLD_IN_SP in Stability Pool
            // So we create additional deposit for alice to make sure original sender can perform max withdrawal
            if (_isMaxUint256Withdraw) {
                _aliceDeposit(markets[i], vars);
            }

            _spDeposit(markets[i], vars);

            _spWithdraw(
                markets[i],
                _isDirect,
                _shouldClaim,
                _isMaxUint256Withdraw,
                vars
            );
        }
    }

    function _spDeposit(IAddressesRegistry _market, TestSPWithdrawLocalParams memory _vars) internal {
        _vars.collToken = _market.collToken();
        _vars.depositAmount = amountInUSDPriceMock(BOLD, 10000, 1e8);

        give(BOLD, sender, _vars.depositAmount);
        approveAsSender(sender, BOLD, walletAddr, _vars.depositAmount);

        bool isDirect = true;
        bool shouldClaim = false;

        _vars.executeActionCallData = executeActionCalldata(
            liquityV2SPDepositEncode(
                address(_market),
                sender,
                sender,
                sender,
                _vars.depositAmount,
                shouldClaim
            ),
            isDirect
        );

        wallet.execute(address(spDepositContract), _vars.executeActionCallData, 0);
    }

    function _aliceDeposit(IAddressesRegistry _market, TestSPWithdrawLocalParams memory _vars) internal {
        vm.warp(block.timestamp + 1);
        SmartWallet aliceWallet = new SmartWallet(alice);

        _vars.collToken = _market.collToken();
        _vars.depositAmount = amountInUSDPriceMock(BOLD, 10000, 1e8);

        give(BOLD, aliceWallet.owner(), _vars.depositAmount);
        approveAsSender(aliceWallet.owner(), BOLD, aliceWallet.walletAddr(), _vars.depositAmount);

        _vars.executeActionCallData = executeActionCalldata(
            liquityV2SPDepositEncode(
                address(_market),
                aliceWallet.owner(),
                aliceWallet.owner(),
                aliceWallet.owner(),
                _vars.depositAmount,
                false /* shouldClaim */
            ),
            true /* isDirect */
        );

        aliceWallet.execute(address(spDepositContract), _vars.executeActionCallData, 0);
    }
    
    function _spWithdraw(
        IAddressesRegistry _market,
        bool _isDirect,
        bool _shouldClaim,
        bool _isMaxUint256Withdraw,
        TestSPWithdrawLocalParams memory _vars
    ) internal {
        _vars.stabilityPool = _market.stabilityPool();

        _vars.simulatedCollGain = 10000;

        _simulateCollGain(_vars);

        _vars.senderCollBalanceBefore = balanceOf(_vars.collToken, sender);
        
        _vars.senderBoldBalanceBefore = balanceOf(BOLD, sender);

        (_vars.compoundedBOLD, _vars.collGain, _vars.boldGain) = viewContract
            .getDepositorInfo(address(_market), walletAddr);

        _vars.withdrawAmount = _isMaxUint256Withdraw ? _vars.compoundedBOLD : _vars.depositAmount / 2;

        _vars.executeActionCallData = executeActionCalldata(
            liquityV2SPWithdrawEncode(
                address(_market),
                sender,
                sender,
                _isMaxUint256Withdraw ? type(uint256).max : _vars.withdrawAmount,
                _shouldClaim
            ),
            _isDirect
        );

        wallet.execute(address(cut), _vars.executeActionCallData, 0);

        _vars.senderCollBalanceAfter = balanceOf(_vars.collToken, sender);
        
        _vars.senderBoldBalanceAfter = balanceOf(BOLD, sender);

        (_vars.compoundedBOLDAfter, _vars.collGainAfter, _vars.boldGainAfter) = viewContract
            .getDepositorInfo(address(_market), walletAddr);

        // ################### ASSERTIONS ###################

        assertGe(_vars.compoundedBOLDAfter, _vars.compoundedBOLD - _vars.withdrawAmount);

        if (!_shouldClaim) {
            assertGe(_vars.collGainAfter, 0);
            assertGe(_vars.boldGainAfter, 0);
            assertEq(_vars.senderCollBalanceAfter, _vars.senderCollBalanceBefore);
            assertEq(_vars.senderBoldBalanceAfter, _vars.senderBoldBalanceBefore + _vars.withdrawAmount);
        } 
        else {
            assertEq(_vars.senderCollBalanceAfter, _vars.senderCollBalanceBefore + _vars.collGain);
            assertEq(_vars.senderBoldBalanceAfter, _vars.senderBoldBalanceBefore + _vars.withdrawAmount + _vars.boldGain);
            assertEq(_vars.collGainAfter, 0);
            assertEq(_vars.boldGainAfter, 0);
        } 
    }

    function _simulateCollGain(TestSPWithdrawLocalParams memory _vars) internal {
        uint256 collBalanceStorageSlot = 3;
        uint256 stashedCollMappingSlot = 9;
        vm.store(_vars.stabilityPool, bytes32(collBalanceStorageSlot), bytes32(_vars.simulatedCollGain));
        vm.store(_vars.stabilityPool, keccak256(abi.encode(walletAddr, stashedCollMappingSlot)), bytes32(_vars.simulatedCollGain));
        give(_vars.collToken, _vars.stabilityPool, _vars.simulatedCollGain * 2);
    }
}