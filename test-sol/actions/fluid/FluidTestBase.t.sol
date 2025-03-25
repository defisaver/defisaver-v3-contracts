// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultFactory } from "../../../contracts/interfaces/fluid/IFluidVaultFactory.sol";
import { IFluidVaultResolver } from "../../../contracts/interfaces/fluid/resolvers/IFluidVaultResolver.sol";
import { IFluidDexResolver } from "../../../contracts/interfaces/fluid/resolvers/IFluidDexResolver.sol";
import { IFluidVault } from "../../../contracts/interfaces/fluid/vaults/IFluidVault.sol";
import { IFluidVaultT1 } from "../../../contracts/interfaces/fluid/vaults/IFluidVaultT1.sol";
import { IFluidVaultT2 } from "../../../contracts/interfaces/fluid/vaults/IFluidVaultT2.sol";
import { IFluidVaultT3 } from "../../../contracts/interfaces/fluid/vaults/IFluidVaultT3.sol";
import { IFluidVaultT4 } from "../../../contracts/interfaces/fluid/vaults/IFluidVaultT4.sol";
import { FluidDexModel } from "../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { FluidView } from "../../../contracts/views/FluidView.sol";
import { FluidHelper } from "../../../contracts/actions/fluid/helpers/FluidHelper.sol";
import { TokenUtils } from "../../../contracts/utils/TokenUtils.sol";
import { ExecuteActionsBase } from "../../utils/executeActions/ExecuteActionsBase.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { Vm } from "forge-std/Vm.sol";

contract FluidTestBase is ExecuteActionsBase, FluidHelper {

    error NftNotFound();

    function getT1Vaults() internal pure returns (IFluidVaultT1[] memory vaults) {
        vaults = new IFluidVaultT1[](8);
        vaults[0] = IFluidVaultT1(0x1982CC7b1570C2503282d0A0B41F69b3B28fdcc3); // id:14 - wstETH/USDC
        vaults[1] = IFluidVaultT1(0xb4F3bf2d96139563777C0231899cE06EE95Cc946); // id:15 - wstETH/USDT
        vaults[2] = IFluidVaultT1(0x6F72895Cf6904489Bcd862c941c3D02a3eE4f03e); // id:21 - WBTC/USDC
        vaults[3] = IFluidVaultT1(0x6F72895Cf6904489Bcd862c941c3D02a3eE4f03e); // id:25 - wstETH/WBTC
        vaults[4] = IFluidVaultT1(0x025C1494b7d15aa931E011f6740E0b46b2136cb9); // id:25 - rsETH/wstETH
        vaults[5] = IFluidVaultT1(0x01c7c1c41dea58b043e700eFb23Dc077F12a125e); // id:29 - cbBTC/USDC
        vaults[6] = IFluidVaultT1(0x0C8C77B7FF4c2aF7F6CEBbe67350A490E3DD6cB3); // id:11 - ETH/USDC
        vaults[7] = IFluidVaultT1(0x82B27fA821419F5689381b565a8B0786aA2548De); // id:13 - wstETH/ETH
    }

    function getT2Vaults() internal pure returns (IFluidVaultT2[] memory vaults) {
        vaults = new IFluidVaultT2[](3);
        vaults[0] = IFluidVaultT2(0xf7FA55D14C71241e3c970E30C509Ff58b5f5D557); // id:52 - WBTC-cbBTC/USDT
        vaults[1] = IFluidVaultT2(0xb4a15526d427f4d20b0dAdaF3baB4177C85A699A); // id:74 - weETH-ETH/wstETH
        vaults[2] = IFluidVaultT2(0x7503b58Bb29937e7E2980f70D3FD021B7ebeA6d0); // id:92 - sUSDe-USDT/USDT
    }

    function fetchPositionByNftId(uint256 _nftId) internal view returns (IFluidVaultResolver.UserPosition memory position) {
        (position, ) = IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(_nftId);
    }

    function getNftIdFromLogs(Vm.Log[] memory _logs) internal pure returns (uint256) {
        for (uint256 i = 0; i < _logs.length; ++i) {
            if (_logs[i].topics[0] == IFluidVaultFactory.NewPositionMinted.selector) {
                return uint256(_logs[i].topics[3]);
            }
        }
        revert NftNotFound();
    }

    function estimateDepositShares(
        address _dexPool,
        uint256 _tokenAmount0,
        uint256 _tokenAmount1
    ) internal returns (uint256 shares) {
        shares = IFluidDexResolver(FLUID_DEX_RESOLVER).estimateDeposit(
            _dexPool,
            _tokenAmount0,
            _tokenAmount1,
            1 /* minCollShares */
        );
        // Slightly reduce shares (simulate slippage). This means we expect at least this amount of shares.
        shares = shares * 100 / 101;
    }

    function estimateWithdrawShares(
        address _dexPool,
        uint256 _tokenAmount0,
        uint256 _tokenAmount1
    ) internal returns (uint256 shares) {
        shares = IFluidDexResolver(FLUID_DEX_RESOLVER).estimateWithdraw(
            _dexPool,
            _tokenAmount0,
            _tokenAmount1,
            type(uint256).max /* maxCollShares */
        );
        // Slightly increase shares (simulate slippage). This means we allow this amount of shares to be burned.
        shares = shares * 101 / 100;
    }

    function supplyLimitReached(
        FluidView.DexSupplyData memory _dexSupplyData,
        uint256 _newShares
    ) internal pure returns (bool) {
        return _dexSupplyData.maxSupplyShares  < _dexSupplyData.totalSupplyShares + _newShares;
    }

    function logSupplyLimitReached(address _vault) internal {
        emit log_named_address("Skipping test, smart collateral vault supply limit reached", _vault);
    }

    function giveAndApproveToken(
        address _token,
        address _from,
        address _to,
        uint256 _amountInUSD
    ) internal returns (address token, uint256 amount) {
        token = _token == TokenUtils.ETH_ADDR ? TokenUtils.WETH_ADDR : _token;
        if (_amountInUSD > 0) {
            amount = amountInUSDPrice(token, _amountInUSD);
            give(token, _from, amount);
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
                ? amountInUSDPrice(isNativeBorrow ? TokenUtils.WETH_ADDR : constants.borrowToken, _borrowAmountInUSD)
                : 0;

        bytes memory executeActionCallData = executeActionCalldata(
            fluidVaultT1OpenEncode(
                _vault,
                collAmount,
                borrowAmount,
                _wallet.owner(),
                _wallet.owner(),
                false
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
        (,  uint256 collAmount0) = giveAndApproveToken(
            vaultData.supplyToken0, _wallet.owner(), _wallet.walletAddr(), _collAmount0InUSD
        );

        // Setup collateral token 1
        (, uint256 collAmount1) = giveAndApproveToken(
            vaultData.supplyToken1, _wallet.owner(), _wallet.walletAddr(), _collAmount1InUSD
        );

        // Setup borrow token 0
        uint256 borrowAmount = _borrowAmountInUSD != 0
            ? amountInUSDPrice(
                vaultData.borrowToken0 == TokenUtils.ETH_ADDR ? TokenUtils.WETH_ADDR : vaultData.borrowToken0,
                _borrowAmountInUSD
            )
            : 0;

        uint256 estimatedShares = estimateDepositShares(vaultData.dexSupplyData.dexPool, collAmount0, collAmount1);

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

}