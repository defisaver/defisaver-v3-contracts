// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { BaseTest } from "../../utils/BaseTest.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { LocalWallet } from "../../utils/LocalWallet.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { FtDnmmHelper } from "../../../contracts/actions/ftdnmm/helpers/FtDnmmHelper.sol";
import {
    IConfigRegistry
} from "../../../contracts/interfaces/protocols/ftdnmm/IConfigRegistry.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { FtDnmmEncode } from "../../utils/encode/FtDnmmEncode.sol";
import { DefisaverLogger } from "../../../contracts/utils/DefisaverLogger.sol";
import {
    TransientStorageCancun
} from "../../../contracts/utils/transient/TransientStorageCancun.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";
import { console2 } from "forge-std/console2.sol";

/// @notice Shared base for ftDNMM tests.
/// @dev Uses the real DeFiSaver SmartWallet on mainnet (where Safe infra is deployed) and a
///      minimal LocalWallet with identical delegatecall semantics on chains without it.
contract FtDnmmTestBase is BaseTest, ActionsUtils, FtDnmmHelper {
    /// @dev Mainnet constants for the two DeFiSaver infra contracts the ftDNMM actions/trigger
    ///      touch: the logger (direct actions) and transient storage (ratio trigger/check).
    ///      Neither exists on chains without the DeFiSaver core stack, so tests etch them there.
    address internal constant DFS_LOGGER_MAINNET = 0xcE7a977Cac4a481bc84AC06b2Da0df614e621cf3;
    address internal constant TRANSIENT_STORAGE_MAINNET =
        0x0304E27cccE28bAB4d78C6cb7AfD4cd01c87c1e4;

    SmartWallet wallet;
    LocalWallet localWallet;
    address sender;
    address walletAddr;

    function setUp() public virtual override {
        forkFromEnv("");
        string memory protocol = "FtDnmm";
        initTestPairs(protocol);
        string memory prefix = string.concat(".", protocol);
        string memory pairsPath = string.concat(
            prefix,
            vm.parseJsonBool(configData.json, string.concat(prefix, ".lightTesting"))
                ? ".lightPairs["
                : ".fullPairs["
        );
        bool usablePair;
        for (uint256 i = 0; i < testPairs.length; ++i) {
            // Read nested object fields by name: parseRaw tuple ordering differs
            // between Foundry versions and can silently reverse supply and borrow.
            string memory pairPath = string.concat(pairsPath, vm.toString(i), "]");
            testPairs[i] = TestPair({
                supplyAsset: getTokenAddressFromName(
                    vm.parseJsonString(configData.json, string.concat(pairPath, ".supplyAsset"))
                ),
                borrowAsset: getTokenAddressFromName(
                    vm.parseJsonString(configData.json, string.concat(pairPath, ".borrowAsset"))
                )
            });
            if (isPairUsable(testPairs[i], true)) usablePair = true;
        }
        require(usablePair, "FtDnmm: no usable borrow pair configured");
        _initWallet();
    }

    function _initWallet() internal {
        sender = bob;

        if (isMainnetSelected()) {
            wallet = new SmartWallet(bob);
            walletAddr = wallet.walletAddr();
        } else {
            // DeFiSaver Safe/DSProxy infra is not deployed on this chain
            localWallet = new LocalWallet(bob);
            walletAddr = address(localWallet);

            // Same for the logger and transient storage the actions/trigger touch
            vm.etch(DFS_LOGGER_MAINNET, type(DefisaverLogger).runtimeCode);
            vm.etch(TRANSIENT_STORAGE_MAINNET, type(TransientStorageCancun).runtimeCode);
        }
    }

    function executeOnWallet(address _target, bytes memory _data) internal {
        if (isMainnetSelected()) {
            wallet.execute(_target, _data, 0);
        } else {
            vm.prank(sender);
            localWallet.execute(_target, _data);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                PAIR / AMOUNT HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice A pair is usable on this chain if both assets exist and the ftDNMM config
    ///         enables them for the tested operation.
    function isPairUsable(TestPair memory _pair, bool _needsBorrow) internal view returns (bool) {
        if (_pair.supplyAsset.code.length == 0 || _pair.borrowAsset.code.length == 0) {
            return false;
        }

        IConfigRegistry cfg = positionsManager.config();

        try cfg.getAssetCfg(_pair.supplyAsset) returns (IConfigRegistry.AssetCfg memory supplyCfg) {
            if (!supplyCfg.enabled || !supplyCfg.collateral) return false;
        } catch {
            return false;
        }

        if (_needsBorrow) {
            try cfg.getAssetCfg(_pair.borrowAsset) returns (
                IConfigRegistry.AssetCfg memory borrowCfg
            ) {
                if (!borrowCfg.enabled || !borrowCfg.borrowable) return false;
            } catch {
                return false;
            }
        }

        return true;
    }

    function logSkip(address _asset, string memory _reason) internal pure {
        console2.log("[FtDnmm] Skipping pair, %s: %s", _reason, _asset);
    }

    /// @notice Fixed whole-token supply amounts, deterministic on every chain
    function supplyAmountFor(address _asset) internal view returns (uint256) {
        uint256 dec = IERC20(_asset).decimals();
        if (_asset == Addresses.USDC_ADDR || _asset == Addresses.USDT_ADDR) {
            return 10_000 * 10 ** dec;
        }
        if (dec == 8) return 5e6; // 0.05 WBTC
        if (dec == 6) return 10_000e6; // 10k USDC/USDT
        return 2 ether; // 2 WETH/WSTETH/wS
    }

    /// @notice Fixed whole-token borrow amounts, deterministic on every chain
    function borrowAmountFor(address _asset) internal view returns (uint256) {
        uint256 dec = IERC20(_asset).decimals();
        if (_asset == Addresses.USDC_ADDR || _asset == Addresses.USDT_ADDR) {
            return 1000 * 10 ** dec;
        }
        if (dec == 8) return 1e5; // 0.001 WBTC
        if (dec == 6) return 1000e6; // 1k USDC/USDT
        return 0.25 ether; // 0.25 WETH
    }

    /*//////////////////////////////////////////////////////////////////////////
                                POSITION HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function collateralAvail(address _user, address _asset) internal view returns (uint256) {
        (uint256 avail,) = positionsManager.getBalance(_user, _asset);
        return avail;
    }

    function _supply(address _cut, address _asset, uint256 _amount, address _from) internal {
        bytes memory paramsCallData = FtDnmmEncode.supply(_asset, _amount, _from);
        bytes memory _calldata = executeActionCalldata(paramsCallData, false);
        executeOnWallet(_cut, _calldata);
    }

    function _borrow(address _cut, address _asset, uint256 _amount, address _to) internal {
        bytes memory paramsCallData = FtDnmmEncode.borrow(_asset, _amount, _to);
        bytes memory _calldata = executeActionCalldata(paramsCallData, false);
        executeOnWallet(_cut, _calldata);
    }
}
