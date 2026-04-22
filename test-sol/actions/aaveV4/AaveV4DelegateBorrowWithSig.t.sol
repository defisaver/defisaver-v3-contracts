// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    ITakerPositionManager
} from "../../../contracts/interfaces/protocols/aaveV4/ITakerPositionManager.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import {
    AaveV4DelegateBorrowWithSig
} from "../../../contracts/actions/aaveV4/AaveV4DelegateBorrowWithSig.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";

contract TestAaveV4DelegateBorrowWithSig is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4DelegateBorrowWithSig cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    ITakerPositionManager takerPM;

    string constant BORROW_PERMIT_TYPE =
        "BorrowPermit(address spoke,uint256 reserveId,address owner,address spender,uint256 amount,uint256 nonce,uint256 deadline)";

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        sender = vm.addr(SIGNER_PK);
        wallet = new SmartWallet(sender);
        walletAddr = wallet.walletAddr();

        cut = new AaveV4DelegateBorrowWithSig();
        takerPM = ITakerPositionManager(TAKER_POSITION_MANAGER);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_delegate_borrow_specific_amount() public {
        uint256 amount = 1000e6;
        assertEq(takerPM.borrowAllowance(CORE_SPOKE, CORE_RESERVE_ID_USDC, sender, walletAddr), 0);
        _executeDelegateBorrowWithSig(CORE_RESERVE_ID_USDC, amount);
        assertEq(
            takerPM.borrowAllowance(CORE_SPOKE, CORE_RESERVE_ID_USDC, sender, walletAddr), amount
        );
    }

    function test_delegate_borrow_max_amount() public {
        _executeDelegateBorrowWithSig(CORE_RESERVE_ID_WETH, type(uint256).max);
        assertEq(
            takerPM.borrowAllowance(CORE_SPOKE, CORE_RESERVE_ID_WETH, sender, walletAddr),
            type(uint256).max
        );
    }

    function test_delegate_borrow_updates_allowance() public {
        _executeDelegateBorrowWithSig(CORE_RESERVE_ID_USDC, 500e6);
        assertEq(
            takerPM.borrowAllowance(CORE_SPOKE, CORE_RESERVE_ID_USDC, sender, walletAddr), 500e6
        );
        _executeDelegateBorrowWithSig(CORE_RESERVE_ID_USDC, 1000e6);
        assertEq(
            takerPM.borrowAllowance(CORE_SPOKE, CORE_RESERVE_ID_USDC, sender, walletAddr), 1000e6
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _executeDelegateBorrowWithSig(uint256 _reserveId, uint256 _amount) internal {
        uint256 nonce = takerPM.nonces(sender, 0);
        uint256 deadline = block.timestamp + 1 hours;

        ITakerPositionManager.BorrowPermit memory permit = ITakerPositionManager.BorrowPermit({
            spoke: CORE_SPOKE,
            reserveId: _reserveId,
            owner: sender,
            spender: walletAddr,
            amount: _amount,
            nonce: nonce,
            deadline: deadline
        });

        bytes memory signature = _signBorrowPermit(permit);

        AaveV4DelegateBorrowWithSig.Params memory params =
            AaveV4DelegateBorrowWithSig.Params({ permit: permit, signature: signature });

        bytes memory callData =
            abi.encodeWithSelector(cut.executeActionDirect.selector, abi.encode(params));

        wallet.execute(address(cut), callData, 0);
    }

    function _signBorrowPermit(ITakerPositionManager.BorrowPermit memory _permit)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash = vm.eip712HashStruct(BORROW_PERMIT_TYPE, abi.encode(_permit));
        bytes32 digest =
            keccak256(abi.encodePacked("\x19\x01", takerPM.DOMAIN_SEPARATOR(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PK, digest);
        return abi.encodePacked(r, s, v);
    }
}
