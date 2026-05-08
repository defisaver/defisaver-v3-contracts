// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { FluidVaultT1Open } from "../../../contracts/actions/fluid/vaultT1/FluidVaultT1Open.sol";
import {
    FluidVaultT1Supply
} from "../../../contracts/actions/fluid/vaultT1/FluidVaultT1Supply.sol";
import {
    FluidVaultT1Withdraw
} from "../../../contracts/actions/fluid/vaultT1/FluidVaultT1Withdraw.sol";
import {
    FluidVaultT1Borrow
} from "../../../contracts/actions/fluid/vaultT1/FluidVaultT1Borrow.sol";
import {
    FluidVaultT1Payback
} from "../../../contracts/actions/fluid/vaultT1/FluidVaultT1Payback.sol";
import {
    FluidVaultT1Adjust
} from "../../../contracts/actions/fluid/vaultT1/FluidVaultT1Adjust.sol";
import { FluidDexModel } from "../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { FluidDexOpen } from "../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexSupply } from "../../../contracts/actions/fluid/dex/FluidDexSupply.sol";
import { FluidDexBorrow } from "../../../contracts/actions/fluid/dex/FluidDexBorrow.sol";
import { FluidDexPayback } from "../../../contracts/actions/fluid/dex/FluidDexPayback.sol";
import { FluidDexWithdraw } from "../../../contracts/actions/fluid/dex/FluidDexWithdraw.sol";

library FluidEncode {
    function vaultT1Open(
        address _vault,
        uint256 _collAmount,
        uint256 _debtAmount,
        address _from,
        address _to,
        bool _wrapBorrowedEth
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            FluidVaultT1Open.Params({
                vault: _vault,
                collAmount: _collAmount,
                debtAmount: _debtAmount,
                from: _from,
                to: _to,
                wrapBorrowedEth: _wrapBorrowedEth
            })
        );
    }

    function vaultT1Supply(address _vault, uint256 _nftId, uint256 _amount, address _from)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            FluidVaultT1Supply.Params({
                vault: _vault, nftId: _nftId, amount: _amount, from: _from
            })
        );
    }

    function vaultT1Withdraw(
        address _vault,
        uint256 _nftId,
        uint256 _amount,
        address _to,
        bool _wrapWithdrawnEth
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            FluidVaultT1Withdraw.Params({
                vault: _vault,
                nftId: _nftId,
                amount: _amount,
                to: _to,
                wrapWithdrawnEth: _wrapWithdrawnEth
            })
        );
    }

    function vaultT1Borrow(
        address _vault,
        uint256 _nftId,
        uint256 _amount,
        address _to,
        bool _wrapBorrowedEth
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            FluidVaultT1Borrow.Params({
                vault: _vault,
                nftId: _nftId,
                amount: _amount,
                to: _to,
                wrapBorrowedEth: _wrapBorrowedEth
            })
        );
    }

    function vaultT1Payback(address _vault, uint256 _nftId, uint256 _amount, address _from)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            FluidVaultT1Payback.Params({
                vault: _vault, nftId: _nftId, amount: _amount, from: _from
            })
        );
    }

    function vaultT1Adjust(
        address _vault,
        uint256 _nftId,
        uint256 _collAmount,
        uint256 _debtAmount,
        address _from,
        address _to,
        bool _sendWrappedEth,
        uint8 _collAction,
        uint8 _debtAction
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            FluidVaultT1Adjust.Params({
                vault: _vault,
                nftId: _nftId,
                collAmount: _collAmount,
                debtAmount: _debtAmount,
                from: _from,
                to: _to,
                sendWrappedEth: _sendWrappedEth,
                collAction: FluidVaultT1Adjust.CollActionType(_collAction),
                debtAction: FluidVaultT1Adjust.DebtActionType(_debtAction)
            })
        );
    }

    function dexOpen(
        address _vault,
        address _from,
        address _to,
        uint256 _supplyAmount,
        FluidDexModel.SupplyVariableData memory _supplyVariableData,
        uint256 _borrowAmount,
        FluidDexModel.BorrowVariableData memory _borrowVariableData,
        bool _wrapBorrowedEth
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            FluidDexOpen.Params({
                vault: _vault,
                from: _from,
                to: _to,
                supplyAmount: _supplyAmount,
                supplyVariableData: _supplyVariableData,
                borrowAmount: _borrowAmount,
                borrowVariableData: _borrowVariableData,
                wrapBorrowedEth: _wrapBorrowedEth
            })
        );
    }

    function dexSupply(
        address _vault,
        address _from,
        uint256 _nftId,
        uint256 _supplyAmount,
        FluidDexModel.SupplyVariableData memory _supplyVariableData
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            FluidDexSupply.Params({
                vault: _vault,
                from: _from,
                nftId: _nftId,
                supplyAmount: _supplyAmount,
                supplyVariableData: _supplyVariableData
            })
        );
    }

    function dexBorrow(
        address _vault,
        address _to,
        uint256 _nftId,
        uint256 _borrowAmount,
        FluidDexModel.BorrowVariableData memory _borrowVariableData,
        bool _wrapBorrowedEth
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            FluidDexBorrow.Params({
                vault: _vault,
                to: _to,
                nftId: _nftId,
                borrowAmount: _borrowAmount,
                borrowVariableData: _borrowVariableData,
                wrapBorrowedEth: _wrapBorrowedEth
            })
        );
    }

    function dexPayback(
        address _vault,
        address _from,
        uint256 _nftId,
        uint256 _paybackAmount,
        FluidDexModel.PaybackVariableData memory _paybackVariableData
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            FluidDexPayback.Params({
                vault: _vault,
                from: _from,
                nftId: _nftId,
                paybackAmount: _paybackAmount,
                paybackVariableData: _paybackVariableData
            })
        );
    }

    function dexWithdraw(
        address _vault,
        address _to,
        uint256 _nftId,
        uint256 _withdrawAmount,
        FluidDexModel.WithdrawVariableData memory _withdrawVariableData,
        bool _wrapWithdrawnEth
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            FluidDexWithdraw.Params({
                vault: _vault,
                to: _to,
                nftId: _nftId,
                withdrawAmount: _withdrawAmount,
                withdrawVariableData: _withdrawVariableData,
                wrapWithdrawnEth: _wrapWithdrawnEth
            })
        );
    }
}
