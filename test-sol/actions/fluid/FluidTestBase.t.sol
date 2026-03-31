// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IFluidVaultFactory
} from "../../../contracts/interfaces/protocols/fluid/IFluidVaultFactory.sol";
import {
    IFluidVaultResolver
} from "../../../contracts/interfaces/protocols/fluid/resolvers/IFluidVaultResolver.sol";
import {
    IFluidDexResolver
} from "../../../contracts/interfaces/protocols/fluid/resolvers/IFluidDexResolver.sol";
import { IFluidVault } from "../../../contracts/interfaces/protocols/fluid/vaults/IFluidVault.sol";
import {
    IFluidVaultT1
} from "../../../contracts/interfaces/protocols/fluid/vaults/IFluidVaultT1.sol";
import { FluidDexModel } from "../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { FluidView } from "../../../contracts/views/FluidView.sol";
import { FluidHelper } from "../../../contracts/actions/fluid/helpers/FluidHelper.sol";
import { TokenUtils } from "../../../contracts/utils/token/TokenUtils.sol";
import { ExecuteActionsBase } from "../../utils/executeActions/ExecuteActionsBase.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { Vm } from "forge-std/Vm.sol";

contract FluidTestBase is ExecuteActionsBase, FluidHelper {
    error NftNotFound();

    struct TokensData {
        address supply0;
        address supply1;
        address borrow0;
        address borrow1;
    }

    function getT1Vaults() internal pure returns (address[] memory vaults) {
        vaults = new address[](8);
        vaults[0] = Addresses.FLUID_T1_VAULT_0;
        vaults[1] = Addresses.FLUID_T1_VAULT_1;
        vaults[2] = Addresses.FLUID_T1_VAULT_2;
        vaults[3] = Addresses.FLUID_T1_VAULT_3;
        vaults[4] = Addresses.FLUID_T1_VAULT_4;
        vaults[5] = Addresses.FLUID_T1_VAULT_5;
        vaults[6] = Addresses.FLUID_T1_VAULT_6;
        vaults[7] = Addresses.FLUID_T1_VAULT_7;
    }

    function getT2Vaults() internal pure returns (address[] memory vaults) {
        vaults = new address[](3);
        vaults[0] = Addresses.FLUID_T2_VAULT_0;
        vaults[1] = Addresses.FLUID_T2_VAULT_1;
        vaults[2] = Addresses.FLUID_T2_VAULT_2;
    }

    function getT3Vaults() internal pure returns (address[] memory vaults) {
        vaults = new address[](3);
        vaults[0] = Addresses.FLUID_T3_VAULT_0;
        vaults[1] = Addresses.FLUID_T3_VAULT_1;
        vaults[2] = Addresses.FLUID_T3_VAULT_2;
    }

    function getT4Vaults() internal pure returns (address[] memory vaults) {
        vaults = new address[](4);
        vaults[0] = Addresses.FLUID_T4_VAULT_0;
        vaults[1] = Addresses.FLUID_T4_VAULT_1;
        vaults[2] = Addresses.FLUID_T4_VAULT_2;
        vaults[3] = Addresses.FLUID_T4_VAULT_3;
    }

    function fetchPositionByNftId(uint256 _nftId)
        internal
        view
        returns (IFluidVaultResolver.UserPosition memory position)
    {
        (position,) = IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(_nftId);
    }

    function getNftIdFromLogs(Vm.Log[] memory _logs) internal pure returns (uint256) {
        for (uint256 i = 0; i < _logs.length; ++i) {
            if (_logs[i].topics[0] == IFluidVaultFactory.NewPositionMinted.selector) {
                return uint256(_logs[i].topics[3]);
            }
        }
        revert NftNotFound();
    }

    function getTokens(address _vault, bool _isT1Vault)
        internal
        view
        returns (TokensData memory tokens)
    {
        if (_isT1Vault) {
            IFluidVaultT1.ConstantViews memory constants = IFluidVaultT1(_vault).constantsView();
            tokens = TokensData({
                supply0: constants.supplyToken,
                supply1: address(0),
                borrow0: constants.borrowToken,
                borrow1: address(0)
            });
        } else {
            IFluidVault.ConstantViews memory constants = IFluidVault(_vault).constantsView();
            tokens = TokensData({
                supply0: constants.supplyToken.token0,
                supply1: constants.supplyToken.token1,
                borrow0: constants.borrowToken.token0,
                borrow1: constants.borrowToken.token1
            });
        }
    }

    function estimateDepositShares(address _dexPool, uint256 _tokenAmount0, uint256 _tokenAmount1)
        internal
        returns (uint256 shares)
    {
        try IFluidDexResolver(FLUID_DEX_RESOLVER)
            .estimateDeposit(
                _dexPool,
                _tokenAmount0,
                _tokenAmount1,
                1 /* minCollShares */
            ) returns (
            uint256 _shares
        ) {
            // Slightly reduce shares (simulate slippage). This means we expect at least this amount of shares.
            shares = _shares * 100 / 101;
        } catch {
            // Return 0 on error. This is likely because the deposit limit has been reached.
            shares = 0;
        }
    }

    function estimateWithdrawShares(address _dexPool, uint256 _tokenAmount0, uint256 _tokenAmount1)
        internal
        returns (uint256 shares)
    {
        shares = IFluidDexResolver(FLUID_DEX_RESOLVER)
            .estimateWithdraw(
                _dexPool,
                _tokenAmount0,
                _tokenAmount1,
                uint256(type(int256).max) /* maxCollShares */
            );
        // Slightly increase shares (simulate slippage). This means we allow this amount of shares to be burned.
        shares = shares * 101 / 100;
    }

    function estimateDexPositionCollateralInOneToken(
        uint256 _nftId,
        bool _inToken0,
        FluidView _fluidView
    ) internal returns (uint256 collateral) {
        uint256 minToken0AmountToAccept = _inToken0 ? 1 : 0;
        uint256 minToken1AmountToAccept = _inToken0 ? 0 : 1;

        collateral = _fluidView.estimateDexPositionCollateralInOneToken(
            _nftId, minToken0AmountToAccept, minToken1AmountToAccept
        );

        emit log_named_uint("estimated collateral", collateral);

        // On max withdrawal allow to withdraw slightly less than estimated.
        collateral = collateral * 100 / 110;
    }

    function estimateBorrowShares(address _dexPool, uint256 _tokenAmount0, uint256 _tokenAmount1)
        internal
        returns (uint256 shares)
    {
        if (_tokenAmount0 == 0 && _tokenAmount1 == 0) return shares;

        try IFluidDexResolver(FLUID_DEX_RESOLVER)
            .estimateBorrow(
                _dexPool,
                _tokenAmount0,
                _tokenAmount1,
                uint256(type(int256).max) /* maxDebtShares */
            ) returns (
            uint256 _shares
        ) {
            // Slightly increase shares (simulate slippage). This means we allow this amount of shares to be minted.
            shares = _shares * 101 / 100;
        } catch {
            // Return 0 on error. This is likely because the borrow limit has been reached.
            shares = 0;
        }
    }

    function estimatePaybackShares(address _dexPool, uint256 _tokenAmount0, uint256 _tokenAmount1)
        internal
        returns (uint256 shares)
    {
        shares = IFluidDexResolver(FLUID_DEX_RESOLVER)
            .estimatePayback(
                _dexPool,
                _tokenAmount0,
                _tokenAmount1,
                0 /* minSharesAmt_ */
            );
        // Slightly reduce shares (simulate slippage). This means we expect at least this amount of shares to be burned.
        shares = shares * 100 / 101;
    }

    function estimateDexPositionDebtInOneToken(uint256 _nftId, bool _inToken0, FluidView _fluidView)
        internal
        returns (uint256 debt)
    {
        uint256 maxToken0AmountToPayback = _inToken0 ? uint256(type(int256).max) : 0;
        uint256 maxToken1AmountToPayback = _inToken0 ? 0 : uint256(type(int256).max);

        debt = _fluidView.estimateDexPositionDebtInOneToken(
            _nftId, maxToken0AmountToPayback, maxToken1AmountToPayback
        );

        // Slightly increase debt to make sure there is enough for full payback.
        debt = debt * 105 / 100 + 10;
    }

    function supplyLimitReached(FluidView.DexSupplyData memory _dexSupplyData, uint256 _newShares)
        internal
        pure
        returns (bool)
    {
        return _dexSupplyData.maxSupplyShares < _dexSupplyData.totalSupplyShares + _newShares;
    }

    function borrowLimitReached(FluidView.DexBorrowData memory _dexBorrowData, uint256 _newShares)
        internal
        pure
        returns (bool)
    {
        return _dexBorrowData.maxBorrowShares < _dexBorrowData.totalBorrowShares + _newShares;
    }

    function logSupplyLimitReached(address _vault) internal {
        emit log_named_address("Skipping test, smart collateral vault supply limit reached", _vault);
    }

    function logBorrowLimitReached(address _vault) internal {
        emit log_named_address("Skipping test, smart debt vault borrow limit reached", _vault);
    }

    function logSkipTestBecauseOfOpen(address _vault) internal {
        emit log_named_address("Skipping test: Could't open fluid position for vault:", _vault);
    }

    function isMissingVault(address _vault) internal pure returns (bool) {
        return _vault == Addresses.FLUID_VAULT_NOT_FOUND;
    }

    function logVaultNotFound(address _vault) internal {
        emit log_named_address("Skipping test, vault not found on this chain", _vault);
    }

    function giveAndApproveToken(address _token, address _from, address _to, uint256 _amountInUSD)
        internal
        returns (address token, uint256 amount)
    {
        token = _token == TokenUtils.ETH_ADDR ? TokenUtils.WETH_ADDR : _token;
        if (_amountInUSD > 0) {
            amount = amountInUSDPrice(token, _amountInUSD);
            give(token, _from, amount);
            approveAsSender(_from, token, _to, 0); // remove any approval before
            approveAsSender(_from, token, _to, amount);
        }
    }

    function executeFluidVaultT1Open(
        address _vault,
        uint256 _collAmountInUSD,
        uint256 _borrowAmountInUSD,
        SmartWallet _wallet,
        address _openContract
    ) internal returns (uint256 nftId) {
        IFluidVaultT1.ConstantViews memory constants = IFluidVaultT1(_vault).constantsView();
        bool isNativeSupply = constants.supplyToken == TokenUtils.ETH_ADDR;
        bool isNativeBorrow = constants.borrowToken == TokenUtils.ETH_ADDR;

        constants.supplyToken = isNativeSupply ? TokenUtils.WETH_ADDR : constants.supplyToken;
        uint256 collAmount = amountInUSDPrice(constants.supplyToken, _collAmountInUSD);
        give(constants.supplyToken, _wallet.owner(), collAmount);
        _wallet.ownerApprove(constants.supplyToken, collAmount);

        uint256 borrowAmount = _borrowAmountInUSD != 0
            ? amountInUSDPrice(
                isNativeBorrow ? TokenUtils.WETH_ADDR : constants.borrowToken, _borrowAmountInUSD
            )
            : 0;

        bytes memory executeActionCallData = executeActionCalldata(
            fluidVaultT1OpenEncode(
                _vault, collAmount, borrowAmount, _wallet.owner(), _wallet.owner(), false
            ),
            true
        );

        vm.recordLogs();
        _wallet.execute(_openContract, executeActionCallData, 0);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        nftId = getNftIdFromLogs(logs);
    }

    function executeFluidVaultT2Open(
        address _vault,
        uint256 _collAmount0InUSD,
        uint256 _collAmount1InUSD,
        uint256 _borrowAmountInUSD,
        SmartWallet _wallet,
        address _openContract
    ) internal returns (uint256 nftId) {
        FluidView fluidView = new FluidView();
        FluidView.VaultData memory vaultData = fluidView.getVaultData(address(_vault));

        // Setup collateral token 0
        (, uint256 collAmount0) = giveAndApproveToken(
            vaultData.supplyToken0, _wallet.owner(), _wallet.walletAddr(), _collAmount0InUSD
        );

        // Setup collateral token 1
        (, uint256 collAmount1) = giveAndApproveToken(
            vaultData.supplyToken1, _wallet.owner(), _wallet.walletAddr(), _collAmount1InUSD
        );

        // Setup borrow token 0
        uint256 borrowAmount = _borrowAmountInUSD != 0
            ? amountInUSDPrice(
                vaultData.borrowToken0 == TokenUtils.ETH_ADDR
                    ? TokenUtils.WETH_ADDR
                    : vaultData.borrowToken0,
                _borrowAmountInUSD
            )
            : 0;

        uint256 estimatedShares =
            estimateDepositShares(vaultData.dexSupplyData.dexPool, collAmount0, collAmount1);

        if (supplyLimitReached(vaultData.dexSupplyData, estimatedShares)) {
            return 0;
        }

        // Encode call
        bytes memory executeActionCallData = executeActionCalldata(
            fluidDexOpenEncode(
                _vault,
                _wallet.owner(),
                _wallet.owner(),
                0, /* supplyAmount */
                FluidDexModel.SupplyVariableData(collAmount0, collAmount1, estimatedShares),
                borrowAmount,
                FluidDexModel.BorrowVariableData(0, 0, 0), /* only used for T3 and T4 vaults */
                true /* wrapBorrowedEth */
            ),
            true /* isDirect */
        );

        vm.recordLogs();
        _wallet.execute(_openContract, executeActionCallData, 0);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        nftId = getNftIdFromLogs(logs);
    }

    function executeFluidVaultT3Open(
        address _vault,
        uint256 _collAmountInUSD,
        uint256 _borrowAmount0InUSD,
        uint256 _borrowAmount1InUSD,
        SmartWallet _wallet,
        address _openContract
    ) internal returns (uint256 nftId) {
        FluidView fluidView = new FluidView();
        FluidView.VaultData memory vaultData = fluidView.getVaultData(address(_vault));

        uint256 collAmount;
        {
            bool isNativeSupply = vaultData.supplyToken0 == TokenUtils.ETH_ADDR;
            vaultData.supplyToken0 = isNativeSupply ? TokenUtils.WETH_ADDR : vaultData.supplyToken0;
            collAmount = amountInUSDPrice(vaultData.supplyToken0, _collAmountInUSD);
            give(vaultData.supplyToken0, _wallet.owner(), collAmount);
            _wallet.ownerApprove(vaultData.supplyToken0, collAmount);
        }

        uint256 borrowAmount0;
        {
            bool isNativeBorrow0 = vaultData.borrowToken0 == TokenUtils.ETH_ADDR;
            borrowAmount0 = _borrowAmount0InUSD != 0
                ? amountInUSDPrice(
                    isNativeBorrow0 ? TokenUtils.WETH_ADDR : vaultData.borrowToken0,
                    _borrowAmount0InUSD
                )
                : 0;
        }

        uint256 borrowAmount1;
        {
            bool isNativeBorrow1 = vaultData.borrowToken1 == TokenUtils.ETH_ADDR;
            borrowAmount1 = _borrowAmount1InUSD != 0
                ? amountInUSDPrice(
                    isNativeBorrow1 ? TokenUtils.WETH_ADDR : vaultData.borrowToken1,
                    _borrowAmount1InUSD
                )
                : 0;
        }

        uint256 estimatedDebtShares =
            estimateBorrowShares(vaultData.dexBorrowData.dexPool, borrowAmount0, borrowAmount1);

        if (borrowLimitReached(vaultData.dexBorrowData, estimatedDebtShares)) {
            return 0;
        }

        bytes memory executeActionCallData = executeActionCalldata(
            fluidDexOpenEncode(
                _vault,
                _wallet.owner(),
                _wallet.owner(),
                collAmount,
                FluidDexModel.SupplyVariableData(0, 0, 0), /* only used for T2 and T4  vaults */
                0, /* borrowAmount */
                FluidDexModel.BorrowVariableData(borrowAmount0, borrowAmount1, estimatedDebtShares),
                true /* wrapBorrowedEth */
            ),
            true
        );

        vm.recordLogs();
        _wallet.execute(_openContract, executeActionCallData, 0);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        nftId = getNftIdFromLogs(logs);
    }

    struct FluidVaultT4OpenLocalVars {
        uint256 collAmount0;
        uint256 collAmount1;
        uint256 borrowAmount0;
        uint256 borrowAmount1;
        uint256 estimatedCollShares;
        uint256 estimatedDebtShares;
        bytes executeActionCallData;
    }

    function executeFluidVaultT4Open(
        address _vault,
        uint256 _collAmount0InUSD,
        uint256 _collAmount1InUSD,
        uint256 _borrowAmount0InUSD,
        uint256 _borrowAmount1InUSD,
        SmartWallet _wallet,
        address _openContract
    ) internal returns (uint256 nftId) {
        FluidView fluidView = new FluidView();
        FluidView.VaultData memory vaultData = fluidView.getVaultData(address(_vault));
        FluidVaultT4OpenLocalVars memory vars;

        // Handle collateral 0
        {
            bool isNativeSupply0 = vaultData.supplyToken0 == TokenUtils.ETH_ADDR;
            vaultData.supplyToken0 = isNativeSupply0 ? TokenUtils.WETH_ADDR : vaultData.supplyToken0;
            vars.collAmount0 = amountInUSDPrice(vaultData.supplyToken0, _collAmount0InUSD);
            give(vaultData.supplyToken0, _wallet.owner(), vars.collAmount0);
            _wallet.ownerApprove(vaultData.supplyToken0, vars.collAmount0);
        }

        // Handle collateral 1
        {
            bool isNativeSupply1 = vaultData.supplyToken1 == TokenUtils.ETH_ADDR;
            vaultData.supplyToken1 = isNativeSupply1 ? TokenUtils.WETH_ADDR : vaultData.supplyToken1;
            vars.collAmount1 = amountInUSDPrice(vaultData.supplyToken1, _collAmount1InUSD);
            give(vaultData.supplyToken1, _wallet.owner(), vars.collAmount1);
            _wallet.ownerApprove(vaultData.supplyToken1, vars.collAmount1);
        }

        // Estimate collateral shares
        vars.estimatedCollShares = estimateDepositShares(
            vaultData.dexSupplyData.dexPool, vars.collAmount0, vars.collAmount1
        );

        if (supplyLimitReached(vaultData.dexSupplyData, vars.estimatedCollShares)) {
            return 0;
        }

        // Handle borrow token 0
        {
            bool isNativeBorrow0 = vaultData.borrowToken0 == TokenUtils.ETH_ADDR;
            vars.borrowAmount0 = _borrowAmount0InUSD != 0
                ? amountInUSDPrice(
                    isNativeBorrow0 ? TokenUtils.WETH_ADDR : vaultData.borrowToken0,
                    _borrowAmount0InUSD
                )
                : 0;
        }

        // Handle borrow token 1
        {
            bool isNativeBorrow1 = vaultData.borrowToken1 == TokenUtils.ETH_ADDR;
            vars.borrowAmount1 = _borrowAmount1InUSD != 0
                ? amountInUSDPrice(
                    isNativeBorrow1 ? TokenUtils.WETH_ADDR : vaultData.borrowToken1,
                    _borrowAmount1InUSD
                )
                : 0;
        }

        // Estimate debt shares
        vars.estimatedDebtShares = estimateBorrowShares(
            vaultData.dexBorrowData.dexPool, vars.borrowAmount0, vars.borrowAmount1
        );

        if (borrowLimitReached(vaultData.dexBorrowData, vars.estimatedDebtShares)) {
            return 0;
        }

        vars.executeActionCallData = executeActionCalldata(
            fluidDexOpenEncode(
                _vault,
                _wallet.owner(),
                _wallet.owner(),
                0, /* supplyAmount - Only used for T3 vaults */
                FluidDexModel.SupplyVariableData(
                    vars.collAmount0, vars.collAmount1, vars.estimatedCollShares
                ),
                0, /* borrowAmount - Only used for T1 and T2 vaults */
                FluidDexModel.BorrowVariableData(
                    vars.borrowAmount0, vars.borrowAmount1, vars.estimatedDebtShares
                ),
                true /* wrapBorrowedEth */
            ),
            true
        );

        vm.recordLogs();
        _wallet.execute(_openContract, vars.executeActionCallData, 0);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        nftId = getNftIdFromLogs(logs);
    }
}
