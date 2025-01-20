// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT1 } from "../../../interfaces/fluid/IFluidVaultT1.sol";
import { IFluidVaultResolver } from "../../../interfaces/fluid/IFluidVaultResolver.sol";
import { FluidHelper } from "../helpers/FluidHelper.sol";

import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Payback debt to Fluid Vault T1 (1_col:1_debt)
contract FluidVaultT1Payback is ActionBase, FluidHelper {
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

        (uint256 amount, bytes memory logData) = _payback(params);
        emit ActionEvent("FluidVaultT1Payback", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _payback(params);
        logger.logActionDirectEvent("FluidVaultT1Payback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _payback(Params memory _params) internal returns (uint256, bytes memory) {
        IFluidVaultT1.ConstantViews memory constants = IFluidVaultT1(_params.vault).constantsView();
        address borrowToken = constants.borrowToken;

        (IFluidVaultResolver.UserPosition memory userPosition, ) = 
            IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(_params.nftId);

        bool maxPayback;
        if (_params.amount >= userPosition.borrow) {
            _params.amount = userPosition.borrow;
            maxPayback = true;
        }

        // As there is no direct way of knowing what is the 'exact' full payback amount
        // We are ok with pulling slightly more, take a snapshot and refund the dust amount.
        uint256 borrowTokenBalanceBefore = borrowToken.getBalance(address(this));

        borrowToken.pullTokensIfNeeded(_params.from, _params.amount);
        borrowToken.approveToken(_params.vault, _params.amount);

        int256 paybackAmount =  maxPayback ? type(int256).max : -int256(_params.amount);

        ( , , int256 exactPaybackAmount) = IFluidVaultT1(_params.vault).operate(
            _params.nftId,
            0,
            paybackAmount,
            address(0)
        );

        uint256 borrowTokenBalanceAfter = borrowToken.getBalance(address(this));

        // Sanity check. There should never be the case that we end up with less borrow token than before.
        require(borrowTokenBalanceAfter >= borrowTokenBalanceBefore);

        // We pulled slightly more than needed, so refund dust amount to 'from' address.
        if (borrowTokenBalanceAfter > borrowTokenBalanceBefore) {
            uint256 dustAmount = borrowTokenBalanceAfter - borrowTokenBalanceBefore;
            borrowToken.withdrawTokens(_params.from, dustAmount);
            borrowToken.approveToken(_params.vault, 0);
        }

        return (uint256(-exactPaybackAmount), abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
