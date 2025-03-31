// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../interfaces/fluid/vaults/IFluidVault.sol";
import { FluidHelper } from "../helpers/FluidHelper.sol";
import { FluidDexModel } from "../helpers/FluidDexModel.sol";
import { FluidLiquidityModel } from "../helpers/FluidLiquidityModel.sol";
import { FluidSupplyLiquidityLogic } from "../logic/liquidity/FluidSupplyLiquidityLogic.sol";
import { FluidSupplyDexLogic } from "../logic/dex/FluidSupplyDexLogic.sol";
import { FluidBorrowLiquidityLogic } from "../logic/liquidity/FluidBorrowLiquidityLogic.sol";
import { FluidBorrowDexLogic } from "../logic/dex/FluidBorrowDexLogic.sol";
import { FluidVaultTypes } from "../helpers/FluidVaultTypes.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Open position on Fluid DEX vault (T2, T3, T4)
contract FluidDexOpen is ActionBase, FluidHelper {
    using TokenUtils for address;
    using FluidVaultTypes for uint256;

    /// @param vault The address of the Fluid DEX vault.
    /// @param from Address to pull the collateral from.
    /// @param to Address to send the borrowed assets to.
    /// @param supplyAmount Amount of collateral to deposit. Used if vault is T3.
    /// @param supplyVariableData Variable data for supply action. Used if vault is T2 or T4.
    /// @param borrowAmount Amount of debt to borrow. Used if vault is T2.
    /// @param borrowVariableData Variable data for borrow action. Used if vault is T3 or T4.
    /// @param wrapBorrowedEth Whether to wrap the borrowed ETH into WETH if one of the borrowed assets is ETH.
    struct Params {
        address vault;
        address from;
        address to;
        uint256 supplyAmount;
        FluidDexModel.SupplyVariableData supplyVariableData;
        uint256 borrowAmount;
        FluidDexModel.BorrowVariableData borrowVariableData;
        bool wrapBorrowedEth;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.vault = _parseParamAddr(params.vault, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);

        // SUPPLY DATA piping
        params.supplyAmount = _parseParamUint(
            params.supplyAmount,
            _paramMapping[3],
            _subData,
            _returnValues
        );
        params.supplyVariableData.collAmount0 = _parseParamUint(
            params.supplyVariableData.collAmount0,
            _paramMapping[4],
            _subData,
            _returnValues
        );
        params.supplyVariableData.collAmount1 = _parseParamUint(
            params.supplyVariableData.collAmount1,
            _paramMapping[5],
            _subData,
            _returnValues
        );
        params.supplyVariableData.minCollShares = _parseParamUint(
            params.supplyVariableData.minCollShares,
            _paramMapping[6],
            _subData,
            _returnValues
        );

        // BORROW DATA piping
        params.borrowAmount = _parseParamUint(
            params.borrowAmount,
            _paramMapping[7],
            _subData,
            _returnValues
        );
        params.borrowVariableData.debtAmount0 = _parseParamUint(
            params.borrowVariableData.debtAmount0,
            _paramMapping[8],
            _subData,
            _returnValues
        );
        params.borrowVariableData.debtAmount1 = _parseParamUint(
            params.borrowVariableData.debtAmount1,
            _paramMapping[9],
            _subData,
            _returnValues
        );
        params.borrowVariableData.maxDebtShares = _parseParamUint(
            params.borrowVariableData.maxDebtShares,
            _paramMapping[10],
            _subData,
            _returnValues
        );
        params.wrapBorrowedEth = _parseParamUint(
            params.wrapBorrowedEth ? 1 : 0,
            _paramMapping[11],
            _subData,
            _returnValues
        ) == 1;

        (uint256 nftId, bytes memory logData) = _open(params);
        emit ActionEvent("FluidDexOpen", logData);
        return bytes32(nftId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _open(params);
        logger.logActionDirectEvent("FluidDexOpen", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _open(Params memory _params) internal returns (uint256, bytes memory) {
        IFluidVault.ConstantViews memory constants = IFluidVault(_params.vault).constantsView();
        constants.vaultType.requireDexVault();

        // We are deliberately performing open in two separate calls to the vault.  
        // This will incur more gas, but it will significantly simplify logic
        // and reduce the complexity of passing borrow data to the supply logic.
        uint256 nftId = _supply(_params, constants);

        _borrow(_params, constants, nftId);

        return (nftId, abi.encode(_params));
    }

    function _supply(
        Params memory _params,
        IFluidVault.ConstantViews memory _constants
    ) internal returns (uint256 nftId) {
        (nftId, ) = _constants.vaultType.isT3Vault()
            ? FluidSupplyLiquidityLogic.supply(
                FluidLiquidityModel.SupplyData({
                    vault: _params.vault,
                    vaultType: _constants.vaultType,
                    nftId: 0,
                    supplyToken: _constants.supplyToken.token0,
                    amount: _params.supplyAmount,
                    from: _params.from,
                    debtAmount: 0,
                    debtTo: address(0)
                })
            )
            : FluidSupplyDexLogic.supplyVariable(
                FluidDexModel.SupplyDexData({
                    vault: _params.vault,
                    vaultType: _constants.vaultType,
                    nftId: 0,
                    from: _params.from,
                    variableData: _params.supplyVariableData
                }),
                _constants.supplyToken
            );
    }

    function _borrow(
        Params memory _params,
        IFluidVault.ConstantViews memory _constants,
        uint256 _nftId
    ) internal {
        if (_constants.vaultType.isT2Vault() && _params.borrowAmount > 0) {
            FluidBorrowLiquidityLogic.borrow(
                FluidLiquidityModel.BorrowData({
                    vault: _params.vault,
                    vaultType: _constants.vaultType,
                    nftId: _nftId,
                    borrowToken: _constants.borrowToken.token0,
                    amount: _params.borrowAmount,
                    to: _params.to,
                    wrapBorrowedEth: _params.wrapBorrowedEth
                })
            );
        } else if (_params.borrowVariableData.debtAmount0 > 0 || _params.borrowVariableData.debtAmount1 > 0) {
            FluidBorrowDexLogic.borrowVariable(
                FluidDexModel.BorrowDexData({
                    vault: _params.vault,
                    vaultType: _constants.vaultType,
                    nftId: _nftId,
                    to: _params.to,
                    variableData: _params.borrowVariableData,
                    wrapBorrowedEth: _params.wrapBorrowedEth
                }),
                _constants.borrowToken
            );
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}