// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { AaveV4Withdraw } from "../../../contracts/actions/aaveV4/AaveV4Withdraw.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";
import { console2 } from "forge-std/console2.sol";

contract TestAaveV4Withdraw is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4Withdraw cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    struct TestConfig {
        bool isDirect;
        bool takeMaxUint256;
        bool isEoa;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkAaveV4DevNet();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV4Withdraw();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_withdraw_part_of_collateral() public {
        _baseTest(TestConfig({ isDirect: false, takeMaxUint256: false, isEoa: false }));
    }

    function test_withdraw_all_collateral() public {
        _baseTest(TestConfig({ isDirect: true, takeMaxUint256: true, isEoa: false }));
    }

    function test_withdraw_part_of_collateral_eoa() public {
        _baseTest(TestConfig({ isDirect: false, takeMaxUint256: false, isEoa: true }));
    }

    function test_withdraw_all_collateral_eoa() public {
        _baseTest(TestConfig({ isDirect: true, takeMaxUint256: true, isEoa: true }));
    }

    function _baseTest(TestConfig memory _testConfig) internal {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];

            uint256 supplyAmountUsd = 10;

            if (!_executeAaveV4Supply(testPair, supplyAmountUsd, wallet, _testConfig.isEoa)) {
                console2.log("Failed to supply assets. Check caps and reserve/spoke status.");
                continue;
            }

            _withdraw(testPair.spoke, testPair.collReserveId, _testConfig);

            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _withdraw(address _spoke, uint256 _reserveId, TestConfig memory _testConfig) internal {
        ISpoke spoke = ISpoke(_spoke);
        address underlying = spoke.getReserve(_reserveId).underlying;
        address onBehalf = _testConfig.isEoa ? sender : walletAddr;

        if (_testConfig.isEoa) {
            _enableEoaAllowancePositionManager(spoke, sender, walletAddr, _reserveId);
        }

        uint256 positionSuppliedAssets = spoke.getUserSuppliedAssets(_reserveId, onBehalf);
        uint256 withdrawAmount =
            _testConfig.takeMaxUint256 ? positionSuppliedAssets : positionSuppliedAssets / 2;

        bytes memory executeActionCallData = executeActionCalldata(
            aaveV4WithdrawEncode(
                _spoke,
                onBehalf,
                sender,
                _reserveId,
                _testConfig.takeMaxUint256 ? type(uint256).max : withdrawAmount
            ),
            _testConfig.isDirect
        );

        // Before.
        uint256 senderBalanceBefore = balanceOf(underlying, sender);

        // Execute.
        wallet.execute(address(cut), executeActionCallData, 0);

        // After.
        uint256 senderBalanceAfter = balanceOf(underlying, sender);
        uint256 positionSuppliedAssetsAfter = spoke.getUserSuppliedAssets(_reserveId, onBehalf);

        // Assert.
        assertEq(balanceOf(underlying, walletAddr), 0);
        assertApproxEqAbs(senderBalanceAfter, senderBalanceBefore + withdrawAmount, 1);

        if (_testConfig.takeMaxUint256) {
            assertEq(positionSuppliedAssetsAfter, 0);
        } else {
            assertApproxEqAbs(positionSuppliedAssetsAfter, withdrawAmount, 1);
        }
    }
}
