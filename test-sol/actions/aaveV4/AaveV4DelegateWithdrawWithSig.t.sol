// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    ITakerPositionManager
} from "../../../contracts/interfaces/protocols/aaveV4/ITakerPositionManager.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import {
    AaveV4DelegateWithdrawWithSig
} from "../../../contracts/actions/aaveV4/AaveV4DelegateWithdrawWithSig.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";

contract TestAaveV4DelegateWithdrawWithSig is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4DelegateWithdrawWithSig cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    ITakerPositionManager takerPM;

    string constant WITHDRAW_PERMIT_TYPE =
        "WithdrawPermit(address spoke,uint256 reserveId,address owner,address spender,uint256 amount,uint256 nonce,uint256 deadline)";

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkAaveV4DevNet();

        sender = vm.addr(SIGNER_PK);
        wallet = new SmartWallet(sender);
        walletAddr = wallet.walletAddr();

        cut = new AaveV4DelegateWithdrawWithSig();
        takerPM = ITakerPositionManager(TAKER_POSITION_MANAGER);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_delegate_withdraw_specific_amount() public {
        uint256 amount = 1000e6;
        assertEq(takerPM.withdrawAllowance(CORE_SPOKE, CORE_RESERVE_ID_USDC, sender, walletAddr), 0);
        _executeDelegateWithdrawWithSig(CORE_RESERVE_ID_USDC, amount);
        assertEq(
            takerPM.withdrawAllowance(CORE_SPOKE, CORE_RESERVE_ID_USDC, sender, walletAddr), amount
        );
    }

    function test_delegate_withdraw_max_amount() public {
        _executeDelegateWithdrawWithSig(CORE_RESERVE_ID_WETH, type(uint256).max);
        assertEq(
            takerPM.withdrawAllowance(CORE_SPOKE, CORE_RESERVE_ID_WETH, sender, walletAddr),
            type(uint256).max
        );
    }

    function test_delegate_withdraw_updates_allowance() public {
        _executeDelegateWithdrawWithSig(CORE_RESERVE_ID_USDC, 0);
        assertEq(takerPM.withdrawAllowance(CORE_SPOKE, CORE_RESERVE_ID_USDC, sender, walletAddr), 0);
        _executeDelegateWithdrawWithSig(CORE_RESERVE_ID_USDC, 1000e6);
        assertEq(
            takerPM.withdrawAllowance(CORE_SPOKE, CORE_RESERVE_ID_USDC, sender, walletAddr), 1000e6
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _executeDelegateWithdrawWithSig(uint256 _reserveId, uint256 _amount) internal {
        uint256 nonce = takerPM.nonces(sender, 0);
        uint256 deadline = block.timestamp + 1 hours;

        ITakerPositionManager.WithdrawPermit memory permit = ITakerPositionManager.WithdrawPermit({
            spoke: CORE_SPOKE,
            reserveId: _reserveId,
            owner: sender,
            spender: walletAddr,
            amount: _amount,
            nonce: nonce,
            deadline: deadline
        });

        bytes memory signature = _signWithdrawPermit(permit);

        AaveV4DelegateWithdrawWithSig.Params memory params =
            AaveV4DelegateWithdrawWithSig.Params({ permit: permit, signature: signature });

        bytes memory callData =
            abi.encodeWithSelector(cut.executeActionDirect.selector, abi.encode(params));

        wallet.execute(address(cut), callData, 0);
    }

    function _signWithdrawPermit(ITakerPositionManager.WithdrawPermit memory _permit)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash = vm.eip712HashStruct(WITHDRAW_PERMIT_TYPE, abi.encode(_permit));
        bytes32 digest =
            keccak256(abi.encodePacked("\x19\x01", takerPM.DOMAIN_SEPARATOR(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PK, digest);
        return abi.encodePacked(r, s, v);
    }
}
