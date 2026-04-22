// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { AaveV4Borrow } from "../../../contracts/actions/aaveV4/AaveV4Borrow.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";
import { console2 } from "forge-std/console2.sol";
import { AaveV4Encode } from "test-sol/utils/encode/AaveV4Encode.sol";

contract TestAaveV4Borrow is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4Borrow cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    struct TestConfig {
        bool isDirect;
        bool isEoa;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV4Borrow();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_borrow() public {
        _baseTest(TestConfig({ isDirect: false, isEoa: false }));
    }

    function test_borrow_direct() public {
        _baseTest(TestConfig({ isDirect: true, isEoa: false }));
    }

    function test_borrow_eoa() public {
        _baseTest(TestConfig({ isDirect: false, isEoa: true }));
    }

    function test_borrow_direct_eoa() public {
        _baseTest(TestConfig({ isDirect: true, isEoa: true }));
    }

    function _baseTest(TestConfig memory _testConfig) internal {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];

            uint256 supplyAmountUsd = 1000;

            if (!_executeAaveV4Supply(testPair, supplyAmountUsd, wallet, _testConfig.isEoa)) {
                console2.log("Failed to supply assets. Check caps and reserve/spoke status.");
                continue;
            }

            uint256 borrowAmountUsd = 100;
            _borrow(testPair.spoke, testPair.debtReserveId, borrowAmountUsd, _testConfig);

            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _borrow(
        address _spoke,
        uint256 _reserveId,
        uint256 _amountUsd,
        TestConfig memory _testConfig
    ) internal {
        ISpoke spoke = ISpoke(_spoke);
        ISpoke.Reserve memory reserve = spoke.getReserve(_reserveId);
        address underlying = reserve.underlying;
        uint256 borrowAmount = _amountInUSDPrice(_spoke, _reserveId, _amountUsd);

        if (!_isValidBorrow(_spoke, _reserveId, borrowAmount, reserve)) {
            console2.log("Invalid borrow. Check caps and reserve/spoke status.");
            return;
        }

        address onBehalf = _testConfig.isEoa ? sender : walletAddr;

        if (_testConfig.isEoa) {
            _enableEoaTakerPositionManager(spoke, sender, walletAddr, _reserveId);
        }

        bytes memory executeActionCallData = executeActionCalldata(
            AaveV4Encode.borrow(_spoke, onBehalf, sender, _reserveId, borrowAmount),
            _testConfig.isDirect
        );

        // Before.
        uint256 senderBalanceBefore = balanceOf(underlying, sender);
        uint256 positionDebtBefore = spoke.getUserTotalDebt(_reserveId, onBehalf);

        // Execute.
        wallet.execute(address(cut), executeActionCallData, 0);

        // After.
        uint256 senderBalanceAfter = balanceOf(underlying, sender);
        uint256 positionDebtAfter = spoke.getUserTotalDebt(_reserveId, onBehalf);

        // Assert.
        assertEq(balanceOf(underlying, walletAddr), 0);
        assertApproxEqAbs(senderBalanceAfter, senderBalanceBefore + borrowAmount, 1);
        assertApproxEqAbs(positionDebtAfter, positionDebtBefore + borrowAmount, 1);
    }
}

