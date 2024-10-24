// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IEVault } from "../../../contracts/interfaces/eulerV2/IEVault.sol";
import { IEVC } from "../../../contracts/interfaces/eulerV2/IEVC.sol";
import { EulerV2PullDebt } from "../../../contracts/actions/eulerV2/EulerV2PullDebt.sol";
import { EulerV2Supply } from "../../../contracts/actions/eulerV2/EulerV2Supply.sol";
import { EulerV2TestHelper } from "./EulerV2TestHelper.t.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { console } from "forge-std/console.sol";

contract TestEulerV2PullDebt is EulerV2TestHelper {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2PullDebt cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2Supply eulerV2Supply;

    // 1. Main account wallet that will be used to pull debt
    SmartWallet accountWallet;
    address accountSender;
    address accountWalletAddr;

    // 2. From account wallet from which debt will be pulled
    SmartWallet fromWallet;
    address fromSender;
    address fromWalletAddr;

    struct TestConfig {
        address from;
        address account;
        bool isDirect;
        uint256 fromSupplyAmountInUsd;
        uint256 fromBorrowAmountInUsd;
        uint256 accountSupplyAmountInUsd;
        uint256 pullDebtAmountInUsd;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        initTestPairs("EulerV2");

        accountWallet = new SmartWallet(bob);
        accountSender = accountWallet.owner();
        accountWalletAddr = accountWallet.walletAddr();

        fromWallet = new SmartWallet(alice);
        fromSender = fromWallet.owner();
        fromWalletAddr = fromWallet.walletAddr();

        cut = new EulerV2PullDebt();
        eulerV2Supply = new EulerV2Supply();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_pull_debt_on_main_account() public {
        _baseTest(
            TestConfig({
                from: fromWalletAddr,
                account: accountWalletAddr,
                isDirect: false,
                fromSupplyAmountInUsd: 10000,
                fromBorrowAmountInUsd: 4000,
                accountSupplyAmountInUsd: 9000,
                pullDebtAmountInUsd: 2000
            })
        );
    }

    function test_should_pull_debt_on_default_main_account() public {
        _baseTest(
            TestConfig({
                from: fromWalletAddr,
                account: address(0),
                isDirect: false,
                fromSupplyAmountInUsd: 100000,
                fromBorrowAmountInUsd: 60000,
                accountSupplyAmountInUsd: 97999,
                pullDebtAmountInUsd: 59995
            })
        );
    }

    function test_should_pull_debt_action_direct() public {
        _baseTest(
            TestConfig({
                from: fromWalletAddr,
                account: accountWalletAddr,
                isDirect: true,
                fromSupplyAmountInUsd: 15000,
                fromBorrowAmountInUsd: 5000,
                accountSupplyAmountInUsd: 100,
                pullDebtAmountInUsd: 10
            })
        );
    }

    function test_should_pull_full_debt() public {
        _baseTest(
            TestConfig({
                from: fromWalletAddr,
                account: accountWalletAddr,
                isDirect: true,
                fromSupplyAmountInUsd: 150000,
                fromBorrowAmountInUsd: 75000,
                accountSupplyAmountInUsd: 200000,
                pullDebtAmountInUsd: type(uint256).max
            })
        );
    }

    function test_should_pull_debt_on_virtual_account() public {
        _baseTest(
            TestConfig({
                from: fromWalletAddr,
                account: getSubAccount(accountWalletAddr, 0x01),
                isDirect: true,
                fromSupplyAmountInUsd: 150000,
                fromBorrowAmountInUsd: 75000,
                accountSupplyAmountInUsd: 200000,
                pullDebtAmountInUsd: type(uint256).max
            })
        );
    }

    function test_should_pull_debt_from_one_virtual_account_to_another() public {
        _baseTest(
            TestConfig({
                from: getSubAccount(fromWalletAddr, 0x02),
                account: getSubAccount(accountWalletAddr, 0x01),
                isDirect: true,
                fromSupplyAmountInUsd: 150000,
                fromBorrowAmountInUsd: 75000,
                accountSupplyAmountInUsd: 200000,
                pullDebtAmountInUsd: 65000
            })
        );
    }

    function test_should_pull_debt_on_main_account_for_already_enabled_controller() public {
        TestConfig memory config = TestConfig({
            from: fromWalletAddr,
            account: accountWalletAddr,
            isDirect: false,
            fromSupplyAmountInUsd: 10000,
            fromBorrowAmountInUsd: 4000,
            accountSupplyAmountInUsd: 9000,
            pullDebtAmountInUsd: 3000
        });

        // Make sure 'account' has debt before pulling more debt
        uint256 accountBorrowAmountInUsd = 1200;

        address supplyVault = E_WETH_2_GOVERNED;
        address supplyAsset = IEVault(supplyVault).asset();
        address borrowVault = E_USDC_2_GOVERNED;
        address borrowAsset = IEVault(borrowVault).asset();

        PositionParams memory fromPositionParams = PositionParams({
            collAddr: supplyVault,
            collAmount: amountInUSDPrice(supplyAsset, config.fromSupplyAmountInUsd),
            debtAddr: borrowVault,
            debtAmount: amountInUSDPrice(borrowAsset, config.fromBorrowAmountInUsd)
        });

        PositionParams memory accountPositionParams = PositionParams({
            collAddr: supplyVault,
            collAmount: amountInUSDPrice(supplyAsset, config.accountSupplyAmountInUsd),
            debtAddr: borrowVault,
            debtAmount: amountInUSDPrice(borrowAsset, accountBorrowAmountInUsd)
        });

        // 1. Create position for 'from' account. Debt will be pulled from this account
        createEulerV2Position(fromPositionParams, fromWallet, config.from);

        // 2. Create position for 'account'. Additional debt from 'from' account will be pulled to this account
        createEulerV2Position(accountPositionParams, accountWallet, config.account);

        // 3. Pull debt to 'account'
        _pullDebt(config, borrowVault);
    }

    function _baseTest(TestConfig memory _config) internal {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshot();

            TestPair memory testPair = testPairs[i];
            address supplyVault = testPair.supplyAsset;
            address supplyAsset = IEVault(supplyVault).asset();
            address borrowVault = testPair.borrowAsset;
            address borrowAsset = IEVault(borrowVault).asset();

            PositionParams memory positionParams = PositionParams({
                collAddr: supplyVault,
                collAmount: amountInUSDPrice(supplyAsset, _config.fromSupplyAmountInUsd),
                debtAddr: borrowVault,
                debtAmount: amountInUSDPrice(borrowAsset, _config.fromBorrowAmountInUsd)
            });

            // 1. Create position for 'from' account. Debt will be pulled from this account
            createEulerV2Position(positionParams, fromWallet, _config.from);

            // 2. Supply collateral for 'account'. This ensures that position is healthy after debt pull
            executeEulerV2Supply(
                EulerV2Supply.Params({
                    vault: supplyVault,
                    account: _config.account,
                    from: accountSender,
                    amount: amountInUSDPrice(supplyAsset, _config.accountSupplyAmountInUsd),
                    enableAsColl: true
                }),
                accountWallet,
                false,
                address(eulerV2Supply)
            );

            // 3. Pull debt to 'account'
            _pullDebt(_config, borrowVault);

            vm.revertTo(snapshotId);
        }
    }

    function _pullDebt(TestConfig memory _config, address _vault) internal {
        uint256 pullDebtAmount = _config.pullDebtAmountInUsd == type(uint256).max
            ? type(uint256).max
            : amountInUSDPrice(IEVault(_vault).asset(), _config.pullDebtAmountInUsd);

        bytes memory callData = executeActionCalldata(
            eulerV2PullDebtEncode(
                _vault,
                _config.account,
                _config.from,
                pullDebtAmount
            ),
            _config.isDirect
        );

        address account = _config.account == address(0) ? accountWalletAddr : _config.account;

        uint256 accountDebtBefore = IEVault(_vault).debtOf(account);
        uint256 fromDebtBefore = IEVault(_vault).debtOf(_config.from);

        accountWallet.execute(address(cut), callData, 0);

        uint256 accountDebtAfter = IEVault(_vault).debtOf(account);
        uint256 fromDebtAfter = IEVault(_vault).debtOf(_config.from);

        assertEq(IEVC(EVC_ADDR).isControllerEnabled(account, _vault), true);

        if (pullDebtAmount == type(uint256).max) {
            assertEq(fromDebtAfter, 0);
            assertGe(accountDebtAfter, accountDebtBefore + fromDebtBefore);
        } else {
            assertApproxEqRel(
                fromDebtAfter,
                fromDebtBefore - pullDebtAmount,
                1e16
            );
            assertApproxEqRel(
                accountDebtAfter,
                accountDebtBefore + pullDebtAmount,
                1e16
            );
        }
    }
}
