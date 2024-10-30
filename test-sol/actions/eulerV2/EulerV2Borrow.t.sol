// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IEVault } from "../../../contracts/interfaces/eulerV2/IEVault.sol";
import { IEVC } from "../../../contracts/interfaces/eulerV2/IEVC.sol";
import { EulerV2Supply } from "../../../contracts/actions/eulerV2/EulerV2Supply.sol";
import { EulerV2Borrow } from "../../../contracts/actions/eulerV2/EulerV2Borrow.sol";
import { EulerV2TestHelper } from "./EulerV2TestHelper.t.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { console } from "forge-std/console.sol";

contract TestEulerV2Borrow is EulerV2TestHelper {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2Borrow cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    EulerV2Supply eulerV2Supply;
    SmartWallet wallet;
    address sender;
    address walletAddr;

    struct TestConfig {
        address vault;
        address account;
        uint256 borrowAmountInUsd;
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

        cut = new EulerV2Borrow();
        eulerV2Supply = new EulerV2Supply();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_borrow_on_main_account() public {
        address account = walletAddr;
        uint256 supplyAmountInUsd = 100000;
        uint256 borrowAmountInUsd = 50000;
        bool isDirect = false;

        _baseTest(account, supplyAmountInUsd, borrowAmountInUsd, isDirect);
    }

    function test_should_borrow_on_default_main_account() public {
        address account = address(0);
        uint256 supplyAmountInUsd = 100000;
        uint256 borrowAmountInUsd = 10;
        bool isDirect = false;

        _baseTest(account, supplyAmountInUsd, borrowAmountInUsd, isDirect);
    }

    function test_should_borrow_with_action_direct() public {
        address account = walletAddr;
        uint256 supplyAmountInUsd = 157;
        uint256 borrowAmountInUsd = 47;
        bool isDirect = true;

        _baseTest(account, supplyAmountInUsd, borrowAmountInUsd, isDirect);
    }

    function test_should_borrow_with_already_enabled_controller() public {
        address account = walletAddr;
        address supplyVault = E_WETH_2_GOVERNED;
        address borrowVault = E_USDC_2_GOVERNED;

        uint256 supplyAmountInUsd = 100000;
        uint256 firstBorrowAmountInUsd = 40000;
        uint256 secondBorrowAmountInUsd = 5000;

        bool isDirect = true;

        uint256 snapshotId = vm.snapshot();

        _supplyToVault(
            supplyVault,
            account,
            supplyAmountInUsd
        );

        _borrowFromVault(
            TestConfig(
                borrowVault,
                account,
                firstBorrowAmountInUsd,
                isDirect
            )
        );

        _borrowFromVault(
            TestConfig(
                borrowVault,
                account,
                secondBorrowAmountInUsd,
                isDirect
            )
        );

        vm.revertTo(snapshotId);
    }

    function test_should_borrow_on_main_account_and_two_sub_accounts() public {
        address[] memory accounts = new address[](3);
        accounts[0] = walletAddr;
        accounts[1] = getSubAccount(walletAddr, 0x01);
        accounts[2] = getSubAccount(walletAddr, 0x02);

        address supplyVault = E_USDC_2_GOVERNED;
        address borrowVault = E_WETH_2_GOVERNED;
        uint256 supplyAmountInUsd = 40000;
        uint256 borrowAmountInUsd = 15000;
        bool isDirect = true;

        for (uint256 i = 0; i < accounts.length; ++i) {
            _supplyToVault(
                supplyVault,
                accounts[i],
                supplyAmountInUsd
            );
            _borrowFromVault(
                TestConfig(
                    borrowVault,
                    accounts[i],
                    borrowAmountInUsd,
                    isDirect
                )
            );
        }
    }

    function test_should_borrow_using_two_collateral_vaults() public {
        address account = walletAddr;
        bool isDirect = true;

        uint256 supplyAmountInUsdFirstCollVault = 50000;
        uint256 supplyAmountInUsdSecondCollVault = 50000;
        uint256 borrowAmountInUsdBorrowVault = 60000;

        address borrowVault = E_USDC_2_GOVERNED;

        uint256 snapshotId = vm.snapshot();

        address[] memory supportedVaultCollaterals = IEVault(borrowVault).LTVList();

        if (supportedVaultCollaterals.length < 2) {
            console.log("Skipping test: Vault does not support two collaterals");
            vm.revertTo(snapshotId);
            return;
        }

        _supplyToVault(
            supportedVaultCollaterals[0],
            account,
            supplyAmountInUsdFirstCollVault
        );

        _supplyToVault(
            supportedVaultCollaterals[1],
            account,
            supplyAmountInUsdSecondCollVault
        );

        _borrowFromVault(
            TestConfig({
                vault: borrowVault,
                account: account,
                borrowAmountInUsd: borrowAmountInUsdBorrowVault,
                isDirect: isDirect
            })
        );

        vm.revertTo(snapshotId);
    }

    function _baseTest(
        address _account,
        uint256 _supplyAmountInUsd,
        uint256 _borrowAmountInUsd,
        bool _isDirect
    ) internal {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshot();

            TestPair memory testPair = testPairs[i];
            address supplyVault = testPair.supplyAsset;
            address borrowVault = testPair.borrowAsset;

            _supplyToVault(
                supplyVault,
                _account,
                _supplyAmountInUsd
            );

            _borrowFromVault(
                TestConfig({
                    vault: borrowVault,
                    account: _account,
                    borrowAmountInUsd: _borrowAmountInUsd,
                    isDirect: _isDirect
                })
            );

            vm.revertTo(snapshotId);
        }
    }

    function _borrowFromVault(TestConfig memory _config) internal {
        address assetToken = IEVault(_config.vault).asset();
        uint256 borrowAmount = amountInUSDPrice(assetToken, _config.borrowAmountInUsd);

        bytes memory callData = executeActionCalldata(
            eulerV2BorrowEncode(
                _config.vault,
                _config.account,
                sender,
                borrowAmount
            ),
            _config.isDirect
        );

        address account = _config.account == address(0) ? walletAddr : _config.account;

        uint256 receiverAssetBalanceBefore = balanceOf(assetToken, sender);
        uint256 accountVaultDebtBefore = IEVault(_config.vault).debtOf(account);

        wallet.execute(address(cut), callData, 0);

        uint256 receiverAssetBalanceAfter = balanceOf(assetToken, sender);
        uint256 accountVaultDebtAfter = IEVault(_config.vault).debtOf(account);

        assertEq(receiverAssetBalanceAfter, receiverAssetBalanceBefore + borrowAmount);
        assertGe(accountVaultDebtAfter, accountVaultDebtBefore + borrowAmount);
        assertTrue(IEVC(EVC_ADDR).isControllerEnabled(account, _config.vault));
    }

    function _supplyToVault(
        address _vault,
        address _account,
        uint256 _supplyAmountInUsd
    ) internal {
        address assetToken = IEVault(_vault).asset();
        uint256 supplyAmount = amountInUSDPrice(assetToken, _supplyAmountInUsd);

        EulerV2Supply.Params memory supplyParams = EulerV2Supply.Params({
            vault: _vault,
            account: _account,
            from: sender,
            amount: supplyAmount,
            enableAsColl: true
        });

        executeEulerV2Supply(
            supplyParams,
            wallet,
            false,
            address(eulerV2Supply)
        );
    }
}
