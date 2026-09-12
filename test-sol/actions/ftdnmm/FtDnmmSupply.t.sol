// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { FtDnmmSupply } from "../../../contracts/actions/ftdnmm/FtDnmmSupply.sol";
import { FtDnmmTestBase } from "./FtDnmmTestBase.sol";
import { FtDnmmEncode } from "../../utils/encode/FtDnmmEncode.sol";

contract TestFtDnmmSupply is FtDnmmTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FtDnmmSupply cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        super.setUp();
        cut = new FtDnmmSupply();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_supply() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();
            TestPair memory testPair = testPairs[i];

            if (!isPairUsable(testPair, false)) {
                logSkip(testPair.supplyAsset, "asset not usable on this chain");
                vm.revertToState(snapshotId);
                continue;
            }

            uint256 supplyAmount = supplyAmountFor(testPair.supplyAsset);

            give(testPair.supplyAsset, sender, supplyAmount);
            approveAsSender(sender, testPair.supplyAsset, walletAddr, supplyAmount);

            uint256 availBefore = collateralAvail(walletAddr, testPair.supplyAsset);

            _supply(address(cut), testPair.supplyAsset, supplyAmount, sender);

            assertEq(collateralAvail(walletAddr, testPair.supplyAsset), availBefore + supplyAmount);
            assertEq(balanceOf(testPair.supplyAsset, sender), 0);

            vm.revertToState(snapshotId);
        }
    }

    function test_should_supply_maxUint256() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();
            TestPair memory testPair = testPairs[i];

            if (!isPairUsable(testPair, false)) {
                logSkip(testPair.supplyAsset, "asset not usable on this chain");
                vm.revertToState(snapshotId);
                continue;
            }

            uint256 senderRealBalance = supplyAmountFor(testPair.supplyAsset);

            give(testPair.supplyAsset, sender, senderRealBalance);
            approveAsSender(sender, testPair.supplyAsset, walletAddr, senderRealBalance);

            uint256 availBefore = collateralAvail(walletAddr, testPair.supplyAsset);

            _supply(address(cut), testPair.supplyAsset, type(uint256).max, sender);

            assertEq(
                collateralAvail(walletAddr, testPair.supplyAsset), availBefore + senderRealBalance
            );

            vm.revertToState(snapshotId);
        }
    }

    function test_should_supply_direct() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();
            TestPair memory testPair = testPairs[i];

            if (!isPairUsable(testPair, false)) {
                logSkip(testPair.supplyAsset, "asset not usable on this chain");
                vm.revertToState(snapshotId);
                continue;
            }

            uint256 supplyAmount = supplyAmountFor(testPair.supplyAsset);

            give(testPair.supplyAsset, sender, supplyAmount);
            approveAsSender(sender, testPair.supplyAsset, walletAddr, supplyAmount);

            uint256 availBefore = collateralAvail(walletAddr, testPair.supplyAsset);

            bytes memory paramsCallData =
                FtDnmmEncode.supply(testPair.supplyAsset, supplyAmount, sender);
            bytes memory _calldata = executeActionCalldata(paramsCallData, true);
            executeOnWallet(address(cut), _calldata);

            assertEq(collateralAvail(walletAddr, testPair.supplyAsset), availBefore + supplyAmount);

            vm.revertToState(snapshotId);
        }
    }

    function testFuzz_encode_decode_inputs(uint256 _amount, address _from, address _asset)
        public
        view
    {
        FtDnmmSupply.Params memory params =
            FtDnmmSupply.Params({ asset: _asset, amount: _amount, from: _from });

        FtDnmmSupply.Params memory decodedParams = cut.parseInputs(abi.encode(params));

        assertEq(decodedParams.asset, params.asset);
        assertEq(decodedParams.amount, params.amount);
        assertEq(decodedParams.from, params.from);
    }

    function test_should_supply_max_from_zero_and_wallet() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            if (!isPairUsable(testPairs[i], false)) continue;
            uint256 snapshotId = vm.snapshotState();
            address asset = testPairs[i].supplyAsset;
            uint256 amount = supplyAmountFor(asset);
            give(asset, walletAddr, amount);
            _supply(address(cut), asset, type(uint256).max, address(0));
            assertEq(collateralAvail(walletAddr, asset), amount);
            assertEq(balanceOf(asset, walletAddr), 0);
            assertEq(collateralAvail(address(cut), asset), 0);

            give(asset, walletAddr, amount);
            _supply(address(cut), asset, type(uint256).max, walletAddr);
            assertEq(collateralAvail(walletAddr, asset), amount * 2);
            assertEq(balanceOf(asset, walletAddr), 0);
            vm.revertToState(snapshotId);
        }
    }

    function test_config_pairs_preserve_supply_and_borrow() public {
        string memory prefix = ".FtDnmm";
        for (uint256 i = 0; i < testPairs.length; ++i) {
            string memory pairPath = string.concat(prefix, ".fullPairs[", vm.toString(i), "]");
            assertEq(
                testPairs[i].supplyAsset,
                getTokenAddressFromName(
                    vm.parseJsonString(configData.json, string.concat(pairPath, ".supplyAsset"))
                )
            );
            assertEq(
                testPairs[i].borrowAsset,
                getTokenAddressFromName(
                    vm.parseJsonString(configData.json, string.concat(pairPath, ".borrowAsset"))
                )
            );
        }
    }
}
