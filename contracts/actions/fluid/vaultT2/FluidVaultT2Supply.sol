// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT2 } from "../../../interfaces/fluid/IFluidVaultT2.sol";
import { FluidHelper } from "../helpers/FluidHelper.sol";
import { FluidSupplyDexCommon } from "./shared/FluidSupplyDexCommon.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Supply assets to Fluid Vault T2 (1_col:1_debt)
contract FluidVaultT2Supply is ActionBase, FluidHelper, FluidSupplyDexCommon {
    using TokenUtils for address;

    struct Params {
        address vault;
        uint256 nftId;
        address from;
        ShareType shareType;
        SupplyVariableData variableData;
        SupplyExactData exactData;
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
        params.nftId = _parseParamUint(params.nftId, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.shareType = ShareType(
            _parseParamUint(uint8(params.shareType), _paramMapping[3], _subData, _returnValues)
        );
        params.variableData.collAmount0 = _parseParamUint(
            params.variableData.collAmount0,
            _paramMapping[4],
            _subData,
            _returnValues
        );
        params.variableData.collAmount1 = _parseParamUint(
            params.variableData.collAmount1,
            _paramMapping[5],
            _subData,
            _returnValues
        );
        params.variableData.minCollShares = _parseParamUint(
            params.variableData.minCollShares,
            _paramMapping[6],
            _subData,
            _returnValues
        );
        params.exactData.perfectCollShares = _parseParamUint(
            params.exactData.perfectCollShares,
            _paramMapping[7],
            _subData,
            _returnValues
        );
        params.exactData.maxCollAmount0 = _parseParamUint(
            params.exactData.maxCollAmount0,
            _paramMapping[8],
            _subData,
            _returnValues
        );
        params.exactData.maxCollAmount1 = _parseParamUint(
            params.exactData.maxCollAmount1,
            _paramMapping[9],
            _subData,
            _returnValues
        );

        (uint256 shares, bytes memory logData) = _supply(params);
        emit ActionEvent("FluidVaultT2Supply", logData);
        return bytes32(shares);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params);
        logger.logActionDirectEvent("FluidVaultT2Supply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _supply(Params memory _params) internal returns (uint256, bytes memory) {
        IFluidVaultT2.ConstantViews memory constants = IFluidVaultT2(_params.vault).constantsView();

        SupplyDexParams memory dexData = SupplyDexParams({
            vault: _params.vault,
            shareType: _params.shareType,
            variableData: _params.variableData,
            exactData: _params.exactData,
            from: _params.from,
            debtAmount: 0,
            to: address(0)
        });
        
        (, uint256 shares) = _params.shareType == ShareType.VARIABLE
            ? _supplyDexVariable(dexData, constants.supplyToken)
            : _supplyDexExact(dexData, constants.supplyToken);

        return (shares, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
