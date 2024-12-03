// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IEVault } from "../../../contracts/interfaces/eulerV2/IEVault.sol";
import { IEVC } from "../../../contracts/interfaces/eulerV2/IEVC.sol";
import { EulerV2PaybackWithShares } from "../../../contracts/actions/eulerV2/EulerV2PaybackWithShares.sol";
import { EulerV2Supply } from "../../../contracts/actions/eulerV2/EulerV2Supply.sol";
import { EulerV2TestHelper } from "./EulerV2TestHelper.t.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestEulerV2PaybackWithShares is EulerV2TestHelper {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2PaybackWithShares cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2Supply eulerV2Supply;
    SmartWallet wallet;
    address sender;
    address walletAddr;

    struct TestConfig {
        address from;
        address account;
        bool isDirect;
        uint256 accountSupplyAmountInUsd;
        uint256 accountBorrowAmountInUsd;
        uint256 fromSupplyAmountInUsd;
        uint256 paybackAmountInUsd;
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

        cut = new EulerV2PaybackWithShares();
        eulerV2Supply = new EulerV2Supply();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_payback_with_shares_on_main_account() public {
        _baseTest(
            TestConfig({
                from: walletAddr,
                account: walletAddr,
                isDirect: false,
                accountSupplyAmountInUsd: 100000,
                accountBorrowAmountInUsd: 50000,
                fromSupplyAmountInUsd: 40000,
                paybackAmountInUsd: 20000
            })
        );
    }

    function test_should_payback_with_shares_on_default_main_account() public {
        _baseTest(
            TestConfig({
                from: address(0),
                account: address(0),
                isDirect: false,
                accountSupplyAmountInUsd: 100000,
                accountBorrowAmountInUsd: 50000,
                fromSupplyAmountInUsd: 49000,
                paybackAmountInUsd: 48999
            })
        );
    }

    function test_should_payback_with_shares_with_action_direct() public {
        _baseTest(
            TestConfig({
                from: walletAddr,
                account: walletAddr,
                isDirect: true,
                accountSupplyAmountInUsd: 100000,
                accountBorrowAmountInUsd: 60000,
                fromSupplyAmountInUsd: 299,
                paybackAmountInUsd: 100
            })
        );
    }

    function test_should_payback_with_shares_full_amount_from_sub_account_to_main_account() public {
        _baseTest(
            TestConfig({
                from: getSubAccount(walletAddr, 0x01),
                account: walletAddr,
                isDirect: false,
                accountSupplyAmountInUsd: 20000,
                accountBorrowAmountInUsd: 5000,
                fromSupplyAmountInUsd: 30000,
                paybackAmountInUsd: type(uint256).max
            })
        );
    }

    function test_should_payback_with_shares_from_one_sub_account_to_another_sub_account() public {
        _baseTest(
            TestConfig({
                from: getSubAccount(walletAddr, 0x05),
                account: getSubAccount(walletAddr, 0x09),
                isDirect: false,
                accountSupplyAmountInUsd: 20000,
                accountBorrowAmountInUsd: 5000,
                fromSupplyAmountInUsd: 30000,
                paybackAmountInUsd: 4500
            })
        );
    }

    function test_should_payback_with_shares_from_main_account_to_sub_account() public {
        _baseTest(
            TestConfig({
                from: walletAddr,
                account: getSubAccount(walletAddr, 0x01),
                isDirect: false,
                accountSupplyAmountInUsd: 20000,
                accountBorrowAmountInUsd: 11111,
                fromSupplyAmountInUsd: 11112,
                paybackAmountInUsd: type(uint256).max
            })
        );
    }

    function _baseTest(
        TestConfig memory _config
    ) internal {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshot();

            TestPair memory testPair = testPairs[i];
            address supplyVault = testPair.supplyAsset;
            address supplyAsset = IEVault(supplyVault).asset();
            address borrowVault = testPair.borrowAsset;
            address borrowAsset = IEVault(borrowVault).asset();

            PositionParams memory positionParams = PositionParams({
                collAddr: supplyVault,
                collAmount: amountInUSDPrice(supplyAsset, _config.accountSupplyAmountInUsd),
                debtAddr: testPairs[i].borrowAsset,
                debtAmount: amountInUSDPrice(borrowAsset, _config.accountBorrowAmountInUsd)
            });

            // 1. Create position with borrow vault for 'account'
            createEulerV2Position(positionParams, wallet, _config.account);

            // 2. Create shares in borrow vault for 'from' account
            executeEulerV2Supply(
                EulerV2Supply.Params({
                    vault: borrowVault,
                    account: _config.from,
                    from: sender,
                    amount: amountInUSDPrice(borrowAsset, _config.fromSupplyAmountInUsd),
                    enableAsColl: true
                }),
                wallet,
                false,
                address(eulerV2Supply)
            );

            // 3. Perform payback with shares action:
            // - Burn borrow vault eTokens for 'from'
            // - Burn borrow vault dTokens for 'account'
            _paybackWithShares(_config, borrowVault);

            vm.revertTo(snapshotId);
        }
    }

    function _paybackWithShares(
        TestConfig memory _config,
        address _vault
    ) internal {
        uint256 paybackAmount = _config.paybackAmountInUsd == type(uint256).max
            ? type(uint256).max
            : amountInUSDPrice(IEVault(_vault).asset(), _config.paybackAmountInUsd);

        bytes memory callData = executeActionCalldata(
            eulerV2PaybackWithSharesEncode(
                _vault,
                _config.from,
                _config.account,
                paybackAmount
            ),
            _config.isDirect
        );

        address account = _config.account == address(0) ? walletAddr : _config.account;
        address from = _config.from == address(0) ? walletAddr : _config.from;

        uint256 fromVaultSharesBefore = IEVault(_vault).balanceOf(from);
        uint256 fromUnderlyingBefore = IEVault(_vault).convertToAssets(fromVaultSharesBefore);
        uint256 accountDebtBefore = IEVault(_vault).debtOf(account);

        bool fromHasEnoughToCoverAccountFullDebt = fromUnderlyingBefore >= accountDebtBefore;

        wallet.execute(address(cut), callData, 0);

        uint256 fromVaultSharesAfter = IEVault(_vault).balanceOf(from);
        uint256 accountDebtAfter = IEVault(_vault).debtOf(account);

        assertLt(fromVaultSharesAfter, fromVaultSharesBefore);

        if (paybackAmount == type(uint256).max) {
            if (fromHasEnoughToCoverAccountFullDebt) {
                assertEq(accountDebtAfter, 0);
                assertEq(IEVC(EVC_ADDR).isControllerEnabled(account, _vault), false);
            } else {
                assertEq(accountDebtAfter, accountDebtBefore - fromUnderlyingBefore);
                assertEq(IEVC(EVC_ADDR).isControllerEnabled(account, _vault), true);
            }
        } else {
            assertEq(accountDebtAfter, accountDebtBefore - paybackAmount);
            assertEq(IEVC(EVC_ADDR).isControllerEnabled(account, _vault), true);
        }
    }
}
