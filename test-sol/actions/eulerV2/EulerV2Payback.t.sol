// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IEVault } from "../../../contracts/interfaces/eulerV2/IEVault.sol";
import { IEVC } from "../../../contracts/interfaces/eulerV2/IEVC.sol";
import { EulerV2Payback } from "../../../contracts/actions/eulerV2/EulerV2Payback.sol";
import { EulerV2TestHelper } from "./EulerV2TestHelper.t.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { console } from "forge-std/console.sol";

contract TestEulerV2Payback is EulerV2TestHelper {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2Payback cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address sender;
    address walletAddr;

    struct TestConfig {
        address vault;
        address account;
        uint256 paybackAmountInUsd;
        bool isDirect;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        initTestPairs("EulerV2");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new EulerV2Payback();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_payback_on_main_account() public {
        address account = walletAddr;
        bool isDirect = false;
        uint256 collateralAmountInUsd = 100000;
        uint256 borrowAmountInUsd = 50000;
        uint256 paybackAmountInUsd = 40000;

        _baseTest(
            account,
            collateralAmountInUsd,
            borrowAmountInUsd,
            paybackAmountInUsd,
            isDirect
        );
    }

    function test_should_payback_on_default_main_account() public {
        address account = address(0);
        bool isDirect = false;
        uint256 collateralAmountInUsd = 100000;
        uint256 borrowAmountInUsd = 50000;
        uint256 paybackAmountInUsd = 10;

        _baseTest(
            account,
            collateralAmountInUsd,
            borrowAmountInUsd,
            paybackAmountInUsd,
            isDirect
        );
    }

    function test_should_payback_with_action_direct() public {
        address account = walletAddr;
        bool isDirect = true;
        uint256 collateralAmountInUsd = 9000;
        uint256 borrowAmountInUsd = 5000;
        uint256 paybackAmountInUsd = 4999;

        _baseTest(
            account,
            collateralAmountInUsd,
            borrowAmountInUsd,
            paybackAmountInUsd,
            isDirect
        );
    }

    function test_should_payback_full_amount_on_sub_account_with_controller_removal() public {
        address account = getSubAccount(walletAddr, 0x01);
        bool isDirect = true;
        uint256 collateralAmountInUsd = 100000;
        uint256 borrowAmountInUsd = 50000;
        uint256 paybackAmountInUsd = type(uint256).max;

        _baseTest(
            account,
            collateralAmountInUsd,
            borrowAmountInUsd,
            paybackAmountInUsd,
            isDirect
        );
    }

    function test_should_payback_full_amount() public {
        address account = walletAddr;
        bool isDirect = false;
        uint256 collateralAmountInUsd = 100000;
        uint256 borrowAmountInUsd = 50000;
        uint256 paybackAmountInUsd = type(uint256).max;

        _baseTest(
            account,
            collateralAmountInUsd,
            borrowAmountInUsd,
            paybackAmountInUsd,
            isDirect
        );
    }

    function test_should_payback_full_amount_with_controller_removal() public {
        address account = walletAddr;
        bool isDirect = false;
        uint256 collateralAmountInUsd = 100000;
        uint256 borrowAmountInUsd = 50000;
        uint256 paybackAmountInUsd = type(uint256).max;

        _baseTest(
            account,
            collateralAmountInUsd,
            borrowAmountInUsd,
            paybackAmountInUsd,
            isDirect
        );
    }

    function _baseTest(
        address _account,
        uint256 _collateralAmountInUsd,
        uint256 _borrowAmountInUsd,
        uint256 _paybackAmountInUsd,
        bool _isDirect
    ) internal {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshot();

            TestPair memory testPair = testPairs[i];
            address supplyVault = testPair.supplyAsset;
            address borrowVault = testPair.borrowAsset;

            PositionParams memory positionParams = PositionParams({
                collAddr: supplyVault,
                collAmount: amountInUSDPrice(IEVault(supplyVault).asset(), _collateralAmountInUsd),
                debtAddr: testPairs[i].borrowAsset,
                debtAmount: amountInUSDPrice(IEVault(borrowVault).asset(), _borrowAmountInUsd)
            });

            createEulerV2Position(positionParams, wallet, _account);

            _paybackToVault(
                TestConfig(
                    borrowVault,
                    _account,
                    _paybackAmountInUsd,
                    _isDirect
                )
            );

            vm.revertTo(snapshotId);
        }
    }

    function _paybackToVault(
        TestConfig memory _config
    ) internal {
        address assetToken = IEVault(_config.vault).asset();

        bytes memory callData = executeActionCalldata(
            eulerV2PaybackEncode(
                _config.vault,
                _config.account,
                sender,
                _config.paybackAmountInUsd
            ),
            _config.isDirect
        );

        address account = _config.account == address(0) ? walletAddr: _config.account;

        bool isMaxPayback = _config.paybackAmountInUsd == type(uint256).max;

        uint256 accountVaultDebtBefore = IEVault(_config.vault).debtOf(account);

        uint256 paybackAmount = isMaxPayback ? accountVaultDebtBefore : _config.paybackAmountInUsd;
        give(assetToken, sender, paybackAmount);
        approveAsSender(sender, assetToken, walletAddr, paybackAmount);

        uint256 receiverAssetBalanceBefore = balanceOf(assetToken, sender);

        wallet.execute(address(cut), callData, 0);

        uint256 receiverAssetBalanceAfter = balanceOf(assetToken, sender);
        uint256 accountVaultDebtAfter = IEVault(_config.vault).debtOf(account);

        assertEq(receiverAssetBalanceAfter, receiverAssetBalanceBefore - paybackAmount);

        if (isMaxPayback) {
            assertEq(accountVaultDebtAfter, 0);
            assertEq(IEVC(EVC_ADDR).isControllerEnabled(account, _config.vault), false);
        } else {
            assertGt(accountVaultDebtAfter, 0);
            assertLt(accountVaultDebtAfter, accountVaultDebtBefore);
            assertEq(IEVC(EVC_ADDR).isControllerEnabled(account, _config.vault), true);
        }
    }
}
