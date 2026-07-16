// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { UniswapClaim } from "../../../contracts/actions/uniswap/UniswapClaim.sol";
import {
    IUniswapMerkleDistributor
} from "../../../contracts/interfaces/protocols/uniswap/IUniswapMerkleDistributor.sol";
import { IDSProxy } from "../../../contracts/interfaces/DS/IDSProxy.sol";

import { BaseTest } from "../../utils/BaseTest.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";

contract TestUniswapClaim is BaseTest, ActionsUtils {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    UniswapClaim cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    address constant UNISWAP_MERKLE_DISTRIBUTOR = 0x090D4613473dEE047c3f2706764f49E0821D256e;
    address constant UNI_TOKEN = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;

    /// @dev Existing mainnet DSProxy with an unclaimed UNI airdrop allocation.
    address constant SMART_WALLET = 0x59FcC72B9400D02844228037d66481DB88344D89;
    address constant OWNER = 0x1866A81657f925B992441Ca626D01513f13b8791;
    uint256 constant CLAIM_INDEX = 89_047;
    uint256 constant CLAIM_AMOUNT = 400e18;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        cut = new UniswapClaim();

        vm.label(SMART_WALLET, "SmartWallet");
        vm.label(OWNER, "owner");
        vm.label(UNISWAP_MERKLE_DISTRIBUTOR, "UniswapMerkleDistributor");
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_uniswapClaim() public {
        _baseTest(false, OWNER);
    }

    function test_uniswapClaim_Direct() public {
        _baseTest(true, OWNER);
    }

    function test_uniswapClaim_toSmartWallet() public {
        _baseTest(false, SMART_WALLET);
    }

    function test_uniswapClaim_RevertWhen_AlreadyClaimed() public {
        _baseTest(false, OWNER);

        bytes memory executeActionCallData = executeActionCalldata(
            uniswapClaimEncode(CLAIM_INDEX, OWNER, CLAIM_AMOUNT, _merkleProof()), false
        );

        vm.prank(OWNER);
        vm.expectRevert();
        IDSProxy(SMART_WALLET).execute(address(cut), executeActionCallData);
    }

    function test_uniswapClaim_RevertWhen_AmountHigherThanAllocated() public {
        _invalidAmountRevertTest(CLAIM_AMOUNT + 1);
    }

    function test_uniswapClaim_RevertWhen_AmountLowerThanAllocated() public {
        _invalidAmountRevertTest(CLAIM_AMOUNT - 1);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _baseTest(bool _isDirect, address _to) internal {
        _skipIfAlreadyClaimed();

        uint256 walletBalanceBefore = balanceOf(UNI_TOKEN, SMART_WALLET);
        uint256 toBalanceBefore = balanceOf(UNI_TOKEN, _to);
        uint256 distributorBalanceBefore = balanceOf(UNI_TOKEN, UNISWAP_MERKLE_DISTRIBUTOR);

        bytes memory executeActionCallData = executeActionCalldata(
            uniswapClaimEncode(CLAIM_INDEX, _to, CLAIM_AMOUNT, _merkleProof()), _isDirect
        );

        vm.prank(OWNER);
        IDSProxy(SMART_WALLET).execute(address(cut), executeActionCallData);

        assertTrue(IUniswapMerkleDistributor(UNISWAP_MERKLE_DISTRIBUTOR).isClaimed(CLAIM_INDEX));
        assertEq(
            balanceOf(UNI_TOKEN, UNISWAP_MERKLE_DISTRIBUTOR),
            distributorBalanceBefore - CLAIM_AMOUNT
        );

        if (_to == SMART_WALLET) {
            assertEq(balanceOf(UNI_TOKEN, SMART_WALLET), walletBalanceBefore + CLAIM_AMOUNT);
        } else {
            assertEq(balanceOf(UNI_TOKEN, _to), toBalanceBefore + CLAIM_AMOUNT);
            assertEq(balanceOf(UNI_TOKEN, SMART_WALLET), walletBalanceBefore);
        }
    }

    function _invalidAmountRevertTest(uint256 _amount) internal {
        _skipIfAlreadyClaimed();

        bytes memory executeActionCallData = executeActionCalldata(
            uniswapClaimEncode(CLAIM_INDEX, OWNER, _amount, _merkleProof()), false
        );

        vm.prank(OWNER);
        vm.expectRevert();
        IDSProxy(SMART_WALLET).execute(address(cut), executeActionCallData);
    }

    function _skipIfAlreadyClaimed() internal {
        if (IUniswapMerkleDistributor(UNISWAP_MERKLE_DISTRIBUTOR).isClaimed(CLAIM_INDEX)) {
            vm.skip(true, "UNI airdrop already claimed for this smart wallet");
        }
    }

    function _merkleProof() internal pure returns (bytes32[] memory proof) {
        proof = new bytes32[](18);
        proof[0] = 0x42c229a70c1a9800ff1dfb98cc650728407c74ea1e619e40683b468980a979db;
        proof[1] = 0x342aa7371fd0a5ac2b0c2205df32f5737e5b55a3cc42d9f7412031e70ddb1618;
        proof[2] = 0x6cb9acc868aee4c401dd742cbc061ea07bc2884c353e6b40e406bf2893745478;
        proof[3] = 0xe3d06ddb917ba2ae0c0a83fa5db7fbccad038b190fce35beab3615db652b7c25;
        proof[4] = 0xc77365e30f5be1d5cbeeabaceb736765949d5126fc7923fb2eccdbe88e6db115;
        proof[5] = 0xf8df0e6263e5a874badf74af0f5fe0c8903f20e10b069add85cc70dec7577d47;
        proof[6] = 0xa1e48483eb1e1b832875ba529588b3a9cf447974a8f141220d7d96557ff86035;
        proof[7] = 0x9160bf87f8d6649a450bfbe223c9ea4cbea70f1c27852e801880ee4f87b307ec;
        proof[8] = 0x859621a4f4f5500ebb9a83251afc0ae06d537b872e241f3f74aa442a085c5786;
        proof[9] = 0x485301b1c4c48d88a08e5e014fb29212b680bedd9dd634ad667c8297978dcc91;
        proof[10] = 0xa4c9f92da9498ccf1c780a4ea9c2d518ac65a23a381e26484dcc51b13097bc12;
        proof[11] = 0x84b8cbda6b143503938dc4d952bf6a54ca41d9f285deb36ae038a93325d20805;
        proof[12] = 0x9953511e58036848125d4f2879e26a43747af2a7a52301d9b7fc1dd0b7658e40;
        proof[13] = 0xed836930ab33ab87a6bd2172511a303c7dc8db0663d73b9c931bb470cc53334b;
        proof[14] = 0x92bf1fe4e886fd754818da88ec88bedbcf3a44850c71d8bc2d4c7202d4bc9ed4;
        proof[15] = 0x335a4bbb9d0d484fedb3710c00155d55e011b2d28d4d03da9b1f3fc4a8d59f72;
        proof[16] = 0x4e08bb6b91a529a32255dbe645bfc0a7f4cd36a6c19565e7a436fd34d038432a;
        proof[17] = 0xdb2d94e778166bcbacf53ba7b9d34046fbf18943170ec79565b21c5d8499e490;
    }
}
