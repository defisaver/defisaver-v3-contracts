// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../interfaces/protocols/fluid/vaults/IFluidVault.sol";
import { FluidHelper } from "../helpers/FluidHelper.sol";
import { FluidDexModel } from "../helpers/FluidDexModel.sol";
import { FluidLiquidityModel } from "../helpers/FluidLiquidityModel.sol";
import { FluidWithdrawLiquidityLogic } from "../logic/liquidity/FluidWithdrawLiquidityLogic.sol";
import { FluidWithdrawDexLogic } from "../logic/dex/FluidWithdrawDexLogic.sol";
import { FluidVaultTypes } from "../helpers/FluidVaultTypes.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Withdraw tokens from Fluid DEX vault (T2, T3, T4)
contract FluidDexWithdraw is ActionBase, FluidHelper {
    using TokenUtils for address;
    using FluidVaultTypes for uint256;

    /// @param vault The address of the Fluid DEX vault.
    /// @param to Address to send the withdrawn assets to.
    /// @param nftId The NFT ID of the position.
    /// @param withdrawAmount Amount of collateral to withdraw. Used if vault is T3.
    /// @param withdrawVariableData Variable data for withdraw action. Used if vault is T2 or T4.
    /// @param wrapWithdrawnEth Whether to wrap the withdrawn ETH into WETH if one of the withdrawn assets is ETH.
    struct Params {
        address vault;
        address to;
        uint256 nftId;
        uint256 withdrawAmount;
        FluidDexModel.WithdrawVariableData withdrawVariableData;
        bool wrapWithdrawnEth;
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
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.nftId = _parseParamUint(params.nftId, _paramMapping[2], _subData, _returnValues);

        params.withdrawAmount = _parseParamUint(params.withdrawAmount, _paramMapping[3], _subData, _returnValues);
        params.withdrawVariableData.collAmount0 =
            _parseParamUint(params.withdrawVariableData.collAmount0, _paramMapping[4], _subData, _returnValues);
        params.withdrawVariableData.collAmount1 =
            _parseParamUint(params.withdrawVariableData.collAmount1, _paramMapping[5], _subData, _returnValues);
        params.withdrawVariableData.maxCollShares =
            _parseParamUint(params.withdrawVariableData.maxCollShares, _paramMapping[6], _subData, _returnValues);
        params.withdrawVariableData.minCollToWithdraw =
            _parseParamUint(params.withdrawVariableData.minCollToWithdraw, _paramMapping[7], _subData, _returnValues);
        params.wrapWithdrawnEth =
            _parseParamUint(params.wrapWithdrawnEth ? 1 : 0, _paramMapping[8], _subData, _returnValues) == 1;

        (uint256 sharesBurnedOrTokenWithdrawn, bytes memory logData) = _withdraw(params);
        emit ActionEvent("FluidDexWithdraw", logData);
        return bytes32(sharesBurnedOrTokenWithdrawn);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(params);
        logger.logActionDirectEvent("FluidDexWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _withdraw(Params memory _params) internal returns (uint256, bytes memory) {
        IFluidVault.ConstantViews memory constants = IFluidVault(_params.vault).constantsView();
        constants.vaultType.requireDexVault();

        if (constants.vaultType.isT3Vault()) {
            uint256 withdrawAmount = FluidWithdrawLiquidityLogic.withdraw(
                FluidLiquidityModel.WithdrawData({
                    vault: _params.vault,
                    vaultType: constants.vaultType,
                    nftId: _params.nftId,
                    supplyToken: constants.supplyToken.token0,
                    amount: _params.withdrawAmount,
                    to: _params.to,
                    wrapWithdrawnEth: _params.wrapWithdrawnEth
                })
            );
            return (withdrawAmount, abi.encode(_params));
        }

        uint256 sharesBurnedOrTokenWithdrawn = FluidWithdrawDexLogic.withdrawVariable(
            FluidDexModel.WithdrawDexData({
                vault: _params.vault,
                vaultType: constants.vaultType,
                nftId: _params.nftId,
                to: _params.to,
                variableData: _params.withdrawVariableData,
                wrapWithdrawnEth: _params.wrapWithdrawnEth
            }),
            constants.supplyToken
        );

        return (sharesBurnedOrTokenWithdrawn, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
