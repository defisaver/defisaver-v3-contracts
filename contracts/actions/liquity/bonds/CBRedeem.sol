// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../helpers/LiquityHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";

/// @title Redeem LUSD for bLUSD
contract CBRedeem is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @param bLUSDAmount Amount of bLusd tokens to pull
    /// @param minLUSDFromSP Min. amount of LUSD to receive
    /// @param from Address from where to pull bLusd tokens
    /// @param to Address where to send LUSD tokens (possibly yTokens as well)
    struct Params {
        uint256 bLUSDAmount;
        uint256 minLUSDFromSP;
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

        params.bLUSDAmount = _parseParamUint(
            params.bLUSDAmount,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.minLUSDFromSP = _parseParamUint(
            params.minLUSDFromSP,
            _paramMapping[1],
            _subData,
            _returnValues
        );
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);

        (uint256 lusdAmount, bytes memory logData) = _cbRedeem(params);
        emit ActionEvent("CBRedeem", logData);
        return bytes32(lusdAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _cbRedeem(params);
        logger.logActionDirectEvent("CBRedeem", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _cbRedeem(Params memory _params) internal returns (uint256, bytes memory) {
        require(_params.to != address(0), "Don't send to 0x0");

        _params.bLUSDAmount = BLUSD_ADDRESS.pullTokensIfNeeded(_params.from, _params.bLUSDAmount);

        (uint256 lusdFromBAMMSPVault, uint256 yTokensFromCurveVault) = CBManager.redeem(
            _params.bLUSDAmount,
            _params.minLUSDFromSP
        );

        // Send LUSD to the redeemer
        if (lusdFromBAMMSPVault > 0) {
            LUSD_TOKEN_ADDRESS.withdrawTokens(_params.to, lusdFromBAMMSPVault);
        }

        // Send yTokens to the redeemer
        if (yTokensFromCurveVault > 0) {
            CBManager.yearnCurveVault().withdrawTokens(_params.to, yTokensFromCurveVault);
        }

        bytes memory logData = abi.encode(
            lusdFromBAMMSPVault,
            yTokensFromCurveVault,
            _params.bLUSDAmount,
            _params.minLUSDFromSP,
            _params.to
        );
        return (lusdFromBAMMSPVault, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
