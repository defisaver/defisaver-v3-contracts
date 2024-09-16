// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IEVault } from "../../../contracts/interfaces/eulerV2/IEVault.sol";
import { IEVC } from "../../../contracts/interfaces/eulerV2/IEVC.sol";
import { EulerV2Supply } from "../../../contracts/actions/eulerV2/EulerV2Supply.sol";
import { EulerV2TestHelper } from "./EulerV2TestHelper.t.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestEulerV2Supply is EulerV2TestHelper {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2Supply cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address sender;
    address walletAddr;

    struct TestConfig {
        address vault;
        address account;
        bool enableAsColl;
        bool isDirect;
        bool isEscrowed;
        bool takeMaxUint256;
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

        cut = new EulerV2Supply();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_supply_on_main_account_and_enable_as_collateral() public {
        address account = walletAddr;
        bool enableAsColl = true;
        bool isDirect = false;
        bool takeMaxUint256 = false;

        _baseTest(account, enableAsColl, isDirect, takeMaxUint256);
    }

    function test_should_supply_on_main_account_without_enabling_collateral() public {
        address account = walletAddr;
        bool enableAsColl = false;
        bool isDirect = false;
        bool takeMaxUint256 = false;

        _baseTest(account, enableAsColl, isDirect, takeMaxUint256);
    }

    function test_should_supply_on_default_main_account() public {
        address account = address(0);
        bool enableAsColl = false;
        bool isDirect = false;
        bool takeMaxUint256 = false;

        _baseTest(account, enableAsColl, isDirect, takeMaxUint256);
    }

    function test_should_supply_with_action_direct() public {
        address account = walletAddr;
        bool enableAsColl = true;
        bool isDirect = true;
        bool takeMaxUint256 = false;

        _baseTest(account, enableAsColl, isDirect, takeMaxUint256);
    }

    function test_should_supply_with_maxUint256() public {
        address account = walletAddr;
        bool enableAsColl = true;
        bool isDirect = true;
        bool takeMaxUint256 = true;

        _baseTest(account, enableAsColl, isDirect, takeMaxUint256);
    }

    function test_should_supply_with_sub_account() public {
        address account = getSubAccount(walletAddr, 0x01);
        bool enableAsColl = true;
        bool isDirect = true;
        bool takeMaxUint256 = false;

        _baseTest(account, enableAsColl, isDirect, takeMaxUint256);
    }

    function test_should_supply_with_main_and_two_sub_accounts() public {
        address[] memory accounts = new address[](3);
        accounts[0] = walletAddr;
        accounts[1] = getSubAccount(walletAddr, 0x01);
        accounts[2] = getSubAccount(walletAddr, 0x02);

        bool enableAsColl = true;
        bool isDirect = true;
        bool takeMaxUint256 = false;
        bool isEscrowed = false;

        for (uint256 i = 0; i < accounts.length; ++i) {
            _supplyToVault(
                TestConfig(
                    E_WSTETH_2_GOVERNED,
                    accounts[i],
                    enableAsColl,
                    isDirect,
                    isEscrowed,
                    takeMaxUint256
                )
            );
        }
    }

    function test_should_supply_to_escrowed_vault() public {
        uint256 snapshotId = vm.snapshot();

        address vault = E_WSTETH_1_ESCROWED;
        address account = walletAddr;
        bool enableAsColl = true;
        bool isDirect = false;
        bool isEscrowed = true;
        bool takeMaxUint256 = false;

        _supplyToVault(
            TestConfig(
                vault,
                account,
                enableAsColl,
                isDirect,
                isEscrowed,
                takeMaxUint256
            )
        );

        vm.revertTo(snapshotId);
    }

    function _baseTest(
        address _account,
        bool _enableAsColl,
        bool _isDirect,
        bool _takeMaxUint256
    ) internal {
        bool isEscrowed = false;

        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshot();

            TestPair memory testPair = testPairs[i];
            address vault = testPair.supplyAsset;

            _supplyToVault(
                TestConfig({
                    vault: vault,
                    account: _account,
                    enableAsColl: _enableAsColl,
                    isDirect: _isDirect,
                    isEscrowed: isEscrowed,
                    takeMaxUint256: _takeMaxUint256
                })
            );

            vm.revertTo(snapshotId);
        }
    }

    function _supplyToVault(TestConfig memory _config) internal {
        address assetToken = IEVault(_config.vault).asset();
        uint256 supplyAmount = amountInUSDPrice(assetToken, 100000);

        give(assetToken, sender, supplyAmount);
        approveAsSender(sender, assetToken, walletAddr, supplyAmount);

        bytes memory executeActionCallData = executeActionCalldata(
            eulerV2SupplyEncode(
                _config.vault,
                _config.account,
                sender,
                _config.takeMaxUint256 ? type(uint256).max : supplyAmount,
                _config.enableAsColl
            ),
            _config.isDirect
        );

        address account = _config.account == address(0) ? walletAddr : _config.account;

        uint256 senderAssetBalanceBefore = balanceOf(assetToken, sender);
        uint256 accountVaultBalanceBefore = balanceOf(_config.vault, account);
        assertEq(accountVaultBalanceBefore, 0);

        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 senderAssetBalanceAfter = balanceOf(assetToken, sender);
        uint256 accountVaultBalanceAfter = balanceOf(_config.vault, account);

        assertEq(senderAssetBalanceBefore - supplyAmount, senderAssetBalanceAfter);

        if (_config.isEscrowed) {
            // escrowed vaults earn no interest, meaning 1 share = 1 underlying asset
            assertEq(accountVaultBalanceAfter, supplyAmount);
        } else {
            // if market is stable (no big bad debt socialization), 1 share <= 1 underlying asset
            assertGe(accountVaultBalanceAfter, 0);
            assertLe(accountVaultBalanceAfter, supplyAmount);
        }

        assertEq(IEVC(EVC_ADDR).isCollateralEnabled(account, _config.vault), _config.enableAsColl);
    }
}
