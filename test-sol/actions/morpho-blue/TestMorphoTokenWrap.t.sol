// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MorphoTokenWrap } from "../../../contracts/actions/morpho-blue/MorphoTokenWrap.sol";
import { MorphoBlueHelper } from "../../../contracts/actions/morpho-blue/helpers/MorphoBlueHelper.sol";
import { IMorphoTokenWrapper } from "../../../contracts/interfaces/morpho-blue/IMorphoTokenWrapper.sol";
import { ILegacyMorphoToken } from "../../../contracts/interfaces/morpho-blue/ILegacyMorphoToken.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";


contract TestMorphoTokenWrap is BaseTest, ActionsUtils, MorphoBlueHelper {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    MorphoTokenWrap cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address sender;
    address walletAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new MorphoTokenWrap();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_wrap_part_of_tokens() public {
        bool isDirect = false;
        bool isMaxUint256 = false;
        uint256 amount = 10 ether;
        _baseTest(isDirect, isMaxUint256, amount);
    }

    function test_should_wrap_full_balance() public {
        bool isDirect = false;
        bool isMaxUint256 = true;
        uint256 amount = 20 ether;
        _baseTest(isDirect, isMaxUint256, amount);
    }

    function test_should_wrap_action_direct() public {
        bool isDirect = true;
        bool isMaxUint256 = false;
        uint256 amount = 1 ether;
        _baseTest(isDirect, isMaxUint256, amount);
    }

    function _baseTest(
        bool _isDirect,
        bool _isMaxUint256,
        uint256 _amount
    ) internal {
        give(LEGACY_MORPHO_TOKEN, walletAddr, _amount);

        bytes memory executeActionCallData = executeActionCalldata(
            morphoTokenWrapEncode(sender, _amount),
            _isDirect
        );

        address newMorphoToken = IMorphoTokenWrapper(MORPHO_TOKEN_WRAPPER).NEW_MORPHO();

        uint256 legacyMorphoWalletBalanceBefore = balanceOf(LEGACY_MORPHO_TOKEN, walletAddr);
        uint256 newMorphoReceiverBalanceBefore = balanceOf(newMorphoToken, sender);

        _enable_morpho_transferability();

        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 legacyMorphoWalletBalanceAfter = balanceOf(LEGACY_MORPHO_TOKEN, walletAddr);
        uint256 newMorphoReceiverBalanceAfter = balanceOf(newMorphoToken, sender);

        if (_isMaxUint256) {
            assertEq(0, legacyMorphoWalletBalanceAfter);
        } else {
            assertEq(legacyMorphoWalletBalanceBefore - _amount, legacyMorphoWalletBalanceAfter);
        }

        assertEq(newMorphoReceiverBalanceBefore + _amount, newMorphoReceiverBalanceAfter);
    }

    function _enable_morpho_transferability() internal {
        address owner = ILegacyMorphoToken(LEGACY_MORPHO_TOKEN).owner();
        uint8 role = 1;
        vm.startPrank(owner);
        // give wrapper contract some role
        ILegacyMorphoToken(LEGACY_MORPHO_TOKEN).setUserRole(MORPHO_TOKEN_WRAPPER, role, true);
        // make sure that role can call 'transferFrom' on legacy morpho token
        ILegacyMorphoToken(LEGACY_MORPHO_TOKEN).setRoleCapability(
            role,
            bytes4(keccak256("transferFrom(address,address,uint256)")),
            true
        );
        vm.stopPrank();
    }
}