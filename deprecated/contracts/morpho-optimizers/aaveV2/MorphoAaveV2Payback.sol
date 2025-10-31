// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IMorphoAaveV2Lens } from "../../../interfaces/protocols/morpho/IMorphoAaveV2Lens.sol";
import { IMorpho } from "../../../interfaces/protocols/morpho/IMorpho.sol";
import { IAaveProtocolDataProviderV2 } from "../../../interfaces/protocols/aaveV2/IAaveProtocolDataProviderV2.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { MorphoAaveV2Helper } from "./helpers/MorphoAaveV2Helper.sol";

/// @title Payback a token to Morpho
contract MorphoAaveV2Payback is ActionBase, MorphoAaveV2Helper {
    using TokenUtils for address;

    /// @param tokenAddr The address of the token to be paid back
    /// @param amount Amount of tokens to be paid back
    /// @param from Where are we pulling the payback tokens amount from
    /// @param onBehalf For what user we are paying back the debt, defaults to user's wallet
    struct Params {
        address tokenAddr;
        uint256 amount;
        address from;
        address onBehalf;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.tokenAddr = _parseParamAddr(params.tokenAddr, _paramMapping[0], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[3], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _repay(params);
        emit ActionEvent("MorphoAaveV2Payback", logData);
        return bytes32(amount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _repay(params);
        logger.logActionDirectEvent("MorphoAaveV2Payback", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _repay(Params memory _params) internal returns (uint256, bytes memory) {
        // default to onBehalf of user's wallet
        if (_params.onBehalf == address(0)) {
            _params.onBehalf = address(this);
        }

        (address aTokenAddress,,) =
            IAaveProtocolDataProviderV2(DEFAULT_MARKET_DATA_PROVIDER).getReserveTokensAddresses(_params.tokenAddr);

        (uint256 borrowBalanceInP2P, uint256 borrowBalanceOnPool,) =
            IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getCurrentBorrowBalanceInOf(aTokenAddress, _params.onBehalf);

        uint256 totalDebt = borrowBalanceInP2P + borrowBalanceOnPool;
        if (_params.amount > totalDebt) _params.amount = totalDebt;

        _params.amount = _params.tokenAddr.pullTokensIfNeeded(_params.from, _params.amount);
        _params.tokenAddr.approveToken(MORPHO_AAVEV2_ADDR, _params.amount);

        IMorpho(MORPHO_AAVEV2_ADDR).repay(aTokenAddress, _params.onBehalf, _params.amount);

        bytes memory logData = abi.encode(_params);
        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
