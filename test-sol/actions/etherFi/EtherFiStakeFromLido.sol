// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { EtherFiStakeFromLido } from "../../../contracts/actions/etherfi/EtherFiStakeFromLido.sol";
import { EtherFiHelper } from "../../../contracts/actions/etherfi/helpers/EtherFiHelper.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";
import { EtherFiEncode } from "../../utils/encode/EtherFiEncode.sol";

contract TestEtherFiStakeFromLido is BaseTest, ActionsUtils, EtherFiHelper {
    EtherFiStakeFromLido cut;
    SmartWallet wallet;
    address sender;
    address walletAddr;

    function setUp() public override {
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();
        cut = new EtherFiStakeFromLido();
    }

    function test_should_stake_from_lido() public {
        _baseTest(false, false, 10 ether);
    }

    function test_should_stake_from_lido_max_uint256() public {
        _baseTest(false, true, 20 ether);
    }

    function test_should_stake_from_lido_action_direct() public {
        _baseTest(true, false, 1 ether);
    }

    function _baseTest(bool _isDirect, bool _isMaxUint256, uint256 _amount) internal {
        give(Addresses.WSTETH_ADDR, sender, _amount);
        approveAsSender(sender, Addresses.WSTETH_ADDR, walletAddr, _amount);

        bytes memory executeActionCallData = executeActionCalldata(
            EtherFiEncode.stakeFromLido(
                _isMaxUint256 ? type(uint256).max : _amount, 0, sender, sender
            ),
            _isDirect
        );

        uint256 senderWstEthBalanceBefore = balanceOf(Addresses.WSTETH_ADDR, sender);
        uint256 senderWeEthBalanceBefore = balanceOf(WEETH_ADDR, sender);

        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 senderWstEthBalanceAfter = balanceOf(Addresses.WSTETH_ADDR, sender);
        uint256 senderWeEthBalanceAfter = balanceOf(WEETH_ADDR, sender);

        if (_isMaxUint256) {
            assertEq(senderWstEthBalanceAfter, 0);
        } else {
            assertEq(senderWstEthBalanceAfter, senderWstEthBalanceBefore - _amount);
        }
        assertGt(senderWeEthBalanceAfter, senderWeEthBalanceBefore);
    }
}
