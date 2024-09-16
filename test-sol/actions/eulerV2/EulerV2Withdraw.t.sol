// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IEVault } from "../../../contracts/interfaces/eulerV2/IEVault.sol";
import { IEVC } from "../../../contracts/interfaces/eulerV2/IEVC.sol";
import { EulerV2Withdraw } from "../../../contracts/actions/eulerV2/EulerV2Withdraw.sol";
import { EulerV2Supply } from "../../../contracts/actions/eulerV2/EulerV2Supply.sol";
import { EulerV2TestHelper } from "./EulerV2TestHelper.t.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestEulerV2Withdraw is EulerV2TestHelper {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2Withdraw cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    EulerV2Supply eulerV2Supply;
    SmartWallet wallet;
    address sender;
    address walletAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        initTestPairs("EulerV2");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new EulerV2Withdraw();
        eulerV2Supply = new EulerV2Supply();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_supply_and_partial_withdraw_on_main_account() public {
        address account = walletAddr;
        uint256 supplyAmountInUsd = 100000;
        uint256 withdrawAmountInUsd = 50000;
        bool isDirect = false;
        bool takeMaxUint256 = false;

        _baseTest(account, supplyAmountInUsd, withdrawAmountInUsd, isDirect, takeMaxUint256);
    }

    function test_should_supply_and_fully_withdraw_on_main_account() public {
        address account = walletAddr;
        uint256 supplyAmountInUsd = 100000;
        uint256 withdrawAmountInUsd = 0;
        bool isDirect = false;
        bool takeMaxUint256 = true;

        _baseTest(account, supplyAmountInUsd, withdrawAmountInUsd, isDirect, takeMaxUint256);
    }

    function test_should_supply_and_fully_withdraw_on_sub_account() public {
        address account = getSubAccount(walletAddr, 0xff);
        uint256 supplyAmountInUsd = 100000;
        uint256 withdrawAmountInUsd = 0;
        bool isDirect = false;
        bool takeMaxUint256 = true;

        _baseTest(account, supplyAmountInUsd, withdrawAmountInUsd, isDirect, takeMaxUint256);
    }

    function test_should_supply_and_withdraw_on_default_main_account() public {
        address account = address(0);
        uint256 supplyAmountInUsd = 100000;
        uint256 withdrawAmountInUsd = 50000;
        bool isDirect = false;
        bool takeMaxUint256 = false;

        _baseTest(account, supplyAmountInUsd, withdrawAmountInUsd, isDirect, takeMaxUint256);
    }

    function test_should_supply_and_withdraw_direct() public {
        address account = walletAddr;
        uint256 supplyAmountInUsd = 100000;
        uint256 withdrawAmountInUsd = 99999;
        bool isDirect = true;
        bool takeMaxUint256 = false;

        _baseTest(account, supplyAmountInUsd, withdrawAmountInUsd, isDirect, takeMaxUint256);
    }

    function test_should_supply_and_withdraw_on_sub_account() public {
        address account = getSubAccount(walletAddr, 0x01);
        uint256 supplyAmountInUsd = 100000;
        uint256 withdrawAmountInUsd = 1;
        bool isDirect = false;
        bool takeMaxUint256 = false;

        _baseTest(account, supplyAmountInUsd, withdrawAmountInUsd, isDirect, takeMaxUint256);
    }

    function _baseTest(
        address _account,
        uint256 _supplyAmountInUsd,
        uint256 _withdrawAmountInUsd,
        bool _isDirect,
        bool _takeMaxUint256
    ) internal {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshot();

            TestPair memory testPair = testPairs[i];
            address vault = testPair.supplyAsset;

            _supplyToVault(
                vault,
                _account,
                _supplyAmountInUsd
            );

            _withdrawFromVault(
                vault,
                _account,
                _withdrawAmountInUsd,
                _isDirect,
                _takeMaxUint256
            );

            vm.revertTo(snapshotId);
        }
    }

    function _withdrawFromVault(
        address _vault,
        address _account,
        uint256 _withdrawAmountInUsd,
        bool _isDirect,
        bool _takeMaxUint256
    ) internal {
        address assetToken = IEVault(_vault).asset();

        uint256 withdrawAmount = _takeMaxUint256 ?
            type(uint256).max : amountInUSDPrice(assetToken, _withdrawAmountInUsd);

        bytes memory executeActionCallData = executeActionCalldata(
            eulerV2WithdrawEncode(
                _vault,
                _account,
                sender,
                withdrawAmount
            ),
            _isDirect
        );

        address account = _account == address(0) ? walletAddr : _account;

        uint256 receiverAssetBalanceBefore = balanceOf(assetToken, sender);
        uint256 maxAccountWithdraw = IEVault(_vault).maxWithdraw(account);

        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 accountVaultBalanceAfter = balanceOf(_vault, account);
        uint256 receiverAssetBalanceAfter = balanceOf(assetToken, sender);

        if (_takeMaxUint256) {
            assertEq(accountVaultBalanceAfter, 0);
            assertEq(receiverAssetBalanceAfter, receiverAssetBalanceBefore + maxAccountWithdraw);
        } else {
            assertGt(accountVaultBalanceAfter, 0);
            assertEq(receiverAssetBalanceAfter, receiverAssetBalanceBefore + withdrawAmount);
        }
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
