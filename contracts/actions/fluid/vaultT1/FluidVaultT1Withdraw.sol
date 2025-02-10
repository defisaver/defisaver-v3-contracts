// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT1 } from "../../../interfaces/fluid/IFluidVaultT1.sol";
import { FluidHelper } from "../helpers/FluidHelper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Withdraw assets from Fluid Vault T1 (1_col:1_debt)
contract FluidVaultT1Withdraw is ActionBase, FluidHelper {
    using TokenUtils for address;

    /// @param vault The address of the Fluid Vault T1
    /// @param nftId ID of the NFT representing the position
    /// @param amount Amount to withdraw. Pass type(uint256).max to withdraw all.
    /// @param to Address to send the withdrawn assets to
    /// @param wrapWithdrawnEth Whether to wrap the withdrawn ETH into WETH if the withdrawn asset is ETH.
    struct Params {
        address vault;
        uint256 nftId;
        uint256 amount;
        address to;
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
        params.nftId = _parseParamUint(params.nftId, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[3], _subData, _returnValues);
        params.wrapWithdrawnEth = _parseParamUint(
            params.wrapWithdrawnEth ? 1 : 0,
            _paramMapping[4],
            _subData,
            _returnValues
        ) == 1;

        (uint256 amount, bytes memory logData) = _withdraw(params);
        emit ActionEvent("FluidVaultT1Withdraw", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(params);
        logger.logActionDirectEvent("FluidVaultT1Withdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _withdraw(Params memory _params) internal returns (uint256, bytes memory) {
        IFluidVaultT1.ConstantViews memory constants = IFluidVaultT1(_params.vault).constantsView();

        bool shouldWrapWithdrawnEth = _params.wrapWithdrawnEth && constants.supplyToken == TokenUtils.ETH_ADDR;

        // type(int256).min will trigger max withdrawal inside the vault
        int256 withdrawAmount = _params.amount == type(uint256).max
            ? type(int256).min
            : -int256(_params.amount);

        (, withdrawAmount ,) = IFluidVaultT1(_params.vault).operate(
            _params.nftId,
            withdrawAmount,
            0,
            shouldWrapWithdrawnEth ? address(this) : _params.to
        );

        uint256 exactAmount = uint256(-withdrawAmount);

        if (shouldWrapWithdrawnEth) {
            TokenUtils.depositWeth(exactAmount);
            TokenUtils.WETH_ADDR.withdrawTokens(_params.to, exactAmount);
        }

        return (exactAmount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
