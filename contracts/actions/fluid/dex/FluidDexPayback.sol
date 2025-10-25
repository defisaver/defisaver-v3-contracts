// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../interfaces/protocols/fluid/vaults/IFluidVault.sol";
import { IFluidVaultResolver } from "../../../interfaces/protocols/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidHelper } from "../helpers/FluidHelper.sol";
import { FluidDexModel } from "../helpers/FluidDexModel.sol";
import { FluidLiquidityModel } from "../helpers/FluidLiquidityModel.sol";
import { FluidPaybackLiquidityLogic } from "../logic/liquidity/FluidPaybackLiquidityLogic.sol";
import { FluidPaybackDexLogic } from "../logic/dex/FluidPaybackDexLogic.sol";
import { FluidVaultTypes } from "../helpers/FluidVaultTypes.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Payback debt on Fluid DEX vault (T2, T3, T4)
contract FluidDexPayback is ActionBase, FluidHelper {
    using TokenUtils for address;
    using FluidVaultTypes for uint256;

    /// @param vault The address of the Fluid DEX vault.
    /// @param from Address to pull the debt tokens from.
    /// @param nftId The NFT ID of the position.
    /// @param paybackAmount The amount of debt to payback. Used if vault is T2.
    /// @param paybackVariableData Variable data for payback action. Used if vault is T3 or T4.
    struct Params {
        address vault;
        address from;
        uint256 nftId;
        uint256 paybackAmount;
        FluidDexModel.PaybackVariableData paybackVariableData;
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
        params.nftId = _parseParamUint(params.nftId, _paramMapping[2], _subData, _returnValues);

        params.paybackAmount = _parseParamUint(params.paybackAmount, _paramMapping[3], _subData, _returnValues);
        params.paybackVariableData.debtAmount0 =
            _parseParamUint(params.paybackVariableData.debtAmount0, _paramMapping[4], _subData, _returnValues);
        params.paybackVariableData.debtAmount1 =
            _parseParamUint(params.paybackVariableData.debtAmount1, _paramMapping[5], _subData, _returnValues);
        params.paybackVariableData.minDebtShares =
            _parseParamUint(params.paybackVariableData.minDebtShares, _paramMapping[6], _subData, _returnValues);
        params.paybackVariableData.maxAmountToPull =
            _parseParamUint(params.paybackVariableData.maxAmountToPull, _paramMapping[7], _subData, _returnValues);

        (uint256 paybackAmountOrBurnedShares, bytes memory logData) = _payback(params);
        emit ActionEvent("FluidDexPayback", logData);
        return bytes32(paybackAmountOrBurnedShares);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _payback(params);
        logger.logActionDirectEvent("FluidDexPayback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _payback(Params memory _params) internal returns (uint256, bytes memory) {
        IFluidVault.ConstantViews memory constants = IFluidVault(_params.vault).constantsView();
        constants.vaultType.requireDexVault();

        (IFluidVaultResolver.UserPosition memory userPosition,) =
            IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(_params.nftId);

        if (constants.vaultType.isT2Vault()) {
            uint256 paybackAmount = FluidPaybackLiquidityLogic.payback(
                FluidLiquidityModel.PaybackData({
                    vault: _params.vault,
                    vaultType: constants.vaultType,
                    nftId: _params.nftId,
                    borrowToken: constants.borrowToken.token0,
                    amount: _params.paybackAmount,
                    from: _params.from,
                    position: userPosition
                })
            );
            return (paybackAmount, abi.encode(_params));
        }

        uint256 burnedShares = FluidPaybackDexLogic.paybackVariable(
            FluidDexModel.PaybackDexData({
                vault: _params.vault,
                vaultType: constants.vaultType,
                nftId: _params.nftId,
                from: _params.from,
                variableData: _params.paybackVariableData,
                position: userPosition
            }),
            constants.borrowToken
        );

        return (burnedShares, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
