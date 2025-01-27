// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT1 } from "../../../interfaces/fluid/IFluidVaultT1.sol";
import { FluidHelper } from "../helpers/FluidHelper.sol";

import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Open position on Fluid Vault T1 (1_col:1_debt)
contract FluidVaultT1Open is ActionBase, FluidHelper {
    using TokenUtils for address;

    /// @param vault The address of the Fluid Vault T1
    /// @param collAmount Amount of collateral to deposit.
    /// @param debtAmount Amount of debt to borrow. Can be 0 if only depositing collateral.
    /// @param from Address to pull the collateral from.
    /// @param to Address to send the borrowed assets to.
    struct Params {
        address vault;
        uint256 collAmount;
        uint256 debtAmount;
        address from;
        address to;
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
        params.collAmount = _parseParamUint(params.collAmount, _paramMapping[1], _subData, _returnValues);
        params.debtAmount = _parseParamUint(params.debtAmount, _paramMapping[2], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[4], _subData, _returnValues);

        (uint256 nftId, bytes memory logData) = _open(params);
        emit ActionEvent("FluidVaultT1Open", logData);
        return bytes32(nftId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _open(params);
        logger.logActionDirectEvent("FluidVaultT1Open", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _open(Params memory _params) internal returns (uint256, bytes memory) {
        IFluidVaultT1.ConstantViews memory constants = IFluidVaultT1(_params.vault).constantsView();
        address supplyToken = constants.supplyToken;

        uint256 nftId;

        if (supplyToken == TokenUtils.ETH_ADDR) {
            _params.collAmount = TokenUtils.WETH_ADDR.pullTokensIfNeeded(_params.from, _params.collAmount);
            TokenUtils.withdrawWeth(_params.collAmount);

            (nftId , , ) = IFluidVaultT1(_params.vault).operate{value: _params.collAmount}(
                0,
                int256(_params.collAmount),
                int256(_params.debtAmount),
                _params.to
            );
        } else {
            _params.collAmount = supplyToken.pullTokensIfNeeded(_params.from, _params.collAmount);
            supplyToken.approveToken(_params.vault, _params.collAmount);
            
            (nftId , , ) = IFluidVaultT1(_params.vault).operate(
                0,
                int256(_params.collAmount),
                int256(_params.debtAmount),
                _params.to
            );
        }

        return (nftId, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
