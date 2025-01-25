// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT1 } from "../../../interfaces/fluid/IFluidVaultT1.sol";
import { FluidHelper } from "../helpers/FluidHelper.sol";

import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Supply assets to Fluid Vault T1 (1_col:1_debt)
contract FluidVaultT1Supply is ActionBase, FluidHelper {
    using TokenUtils for address;

    struct Params {
        address vault;
        uint256 nftId;
        uint256 amount;
        address from;
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
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _supply(params);
        emit ActionEvent("FluidVaultT1Supply", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params);
        logger.logActionDirectEvent("FluidVaultT1Supply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _supply(Params memory _params) internal returns (uint256, bytes memory) {
        IFluidVaultT1.ConstantViews memory constants = IFluidVaultT1(_params.vault).constantsView();
        address supplyToken = constants.supplyToken;

        if (supplyToken == TokenUtils.ETH_ADDR) {
            _params.amount = TokenUtils.WETH_ADDR.pullTokensIfNeeded(_params.from, _params.amount);
            TokenUtils.withdrawWeth(_params.amount);

            IFluidVaultT1(_params.vault).operate{value: _params.amount}(
                _params.nftId,
                int256(_params.amount),
                0,
                address(0)
            );
        } else {
            _params.amount = supplyToken.pullTokensIfNeeded(_params.from, _params.amount);
            supplyToken.approveToken(_params.vault, _params.amount);

            IFluidVaultT1(_params.vault).operate(
                _params.nftId,
                int256(_params.amount),
                0,
                address(0)
            );
        }

        return (_params.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
