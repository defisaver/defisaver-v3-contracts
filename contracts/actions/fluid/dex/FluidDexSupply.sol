// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../interfaces/protocols/fluid/vaults/IFluidVault.sol";
import { FluidHelper } from "../helpers/FluidHelper.sol";
import { FluidDexModel } from "../helpers/FluidDexModel.sol";
import { FluidLiquidityModel } from "../helpers/FluidLiquidityModel.sol";
import { FluidSupplyLiquidityLogic } from "../logic/liquidity/FluidSupplyLiquidityLogic.sol";
import { FluidSupplyDexLogic } from "../logic/dex/FluidSupplyDexLogic.sol";
import { FluidVaultTypes } from "../helpers/FluidVaultTypes.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";

/// @title Supply tokens to Fluid DEX vault (T2, T3, T4)
contract FluidDexSupply is ActionBase, FluidHelper {
    using TokenUtils for address;
    using FluidVaultTypes for uint256;

    /// @param vault The address of the Fluid DEX vault.
    /// @param from Address to pull the collateral from.
    /// @param nftId The NFT ID of the position.
    /// @param supplyAmount Amount of collateral to deposit. Used if vault is T3.
    /// @param supplyVariableData Variable data for supply action. Used if vault is T2 or T4.
    struct Params {
        address vault;
        address from;
        uint256 nftId;
        uint256 supplyAmount;
        FluidDexModel.SupplyVariableData supplyVariableData;
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

        params.supplyAmount =
            _parseParamUint(params.supplyAmount, _paramMapping[3], _subData, _returnValues);
        params.supplyVariableData.collAmount0 = _parseParamUint(
            params.supplyVariableData.collAmount0, _paramMapping[4], _subData, _returnValues
        );
        params.supplyVariableData.collAmount1 = _parseParamUint(
            params.supplyVariableData.collAmount1, _paramMapping[5], _subData, _returnValues
        );
        params.supplyVariableData.minCollShares = _parseParamUint(
            params.supplyVariableData.minCollShares, _paramMapping[6], _subData, _returnValues
        );

        (uint256 supplyAmountOrShares, bytes memory logData) = _supply(params);
        emit ActionEvent("FluidDexSupply", logData);
        return bytes32(supplyAmountOrShares);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params);
        logger.logActionDirectEvent("FluidDexSupply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _supply(Params memory _params) internal returns (uint256, bytes memory) {
        IFluidVault.ConstantViews memory constants = IFluidVault(_params.vault).constantsView();
        constants.vaultType.requireDexVault();

        if (constants.vaultType.isT3Vault()) {
            (, uint256 supplyAmount) = FluidSupplyLiquidityLogic.supply(
                FluidLiquidityModel.SupplyData({
                    vault: _params.vault,
                    vaultType: constants.vaultType,
                    nftId: _params.nftId,
                    supplyToken: constants.supplyToken.token0,
                    amount: _params.supplyAmount,
                    from: _params.from,
                    debtAmount: 0,
                    debtTo: address(0)
                })
            );
            return (supplyAmount, abi.encode(_params));
        }

        (, uint256 supplyShares) = FluidSupplyDexLogic.supplyVariable(
            FluidDexModel.SupplyDexData({
                vault: _params.vault,
                vaultType: constants.vaultType,
                nftId: _params.nftId,
                from: _params.from,
                variableData: _params.supplyVariableData
            }),
            constants.supplyToken
        );

        return (supplyShares, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
