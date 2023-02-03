// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/morpho/IMorphoAaveV2Lens.sol";
import "../../interfaces/morpho/IMorpho.sol";
import "../../interfaces/aaveV2/IAaveProtocolDataProviderV2.sol";
import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "./helpers/MorphoHelper.sol";

/// @title Payback a token to Morpho
contract MorphoAaveV2Payback is ActionBase, MorphoHelper {
    using TokenUtils for address;

    /// @param tokenAddr The address of the token to be payed back
    /// @param amount Amount of tokens to be payed back
    /// @param from Where are we pulling the payback tokens amount from
    /// @param onBehalf For what user we are paying back the debt, defaults to proxy
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
        // default to onBehalf of proxy
        if (_params.onBehalf == address(0)) {
            _params.onBehalf = address(this);
        }

        (address aTokenAddress,,) = IAaveProtocolDataProviderV2(
            DEFAULT_MARKET_DATA_PROVIDER
        ).getReserveTokensAddresses(_params.tokenAddr);

        (
            uint256 borrowBalanceInP2P,
            uint256 borrowBalanceOnPool,
        ) =  IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getCurrentBorrowBalanceInOf(aTokenAddress, _params.onBehalf);

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