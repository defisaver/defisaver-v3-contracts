// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../interfaces/mcd/IPot.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IDaiJoin.sol";
import "../../DS/DSMath.sol";
import "../../utils/TokenUtils.sol";
import "./helpers/McdHelper.sol";

contract McdDsrDeposit is DSMath, McdHelper, ActionBase {
    using TokenUtils for address;

    struct Params {
        uint256 amount; // amount of DAI to deposit into DSR
        address from; // address from which the DAI will be pulled
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);

        (uint256 deposited, bytes memory logData) = _deposit(params);
        emit ActionEvent("McdDsrDeposit", logData);
        return bytes32(deposited);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _deposit(params);
        logger.logActionDirectEvent("McdDsrDeposit", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /// @notice Deposits DAI into Maker DSR
    function _deposit(Params memory _params) internal returns (uint256 deposited, bytes memory logData) {
        IPot pot = IPot(POT_ADDR);

        _params.amount = DAI_ADDRESS.pullTokensIfNeeded(_params.from, _params.amount);
        DAI_ADDRESS.approveToken(DAI_JOIN_ADDR, _params.amount);

        uint256 chi = (block.timestamp > pot.rho()) ? pot.drip() : pot.chi();
        uint256 pie = _params.amount * RAY / chi;

        IDaiJoin(DAI_JOIN_ADDR).join(address(this), _params.amount);

        if (vat.can(address(this), POT_ADDR) == 0) {
            vat.hope(POT_ADDR);
        }

        pot.join(pie);

        logData = abi.encode(_params);
        deposited = _params.amount;
    }

    function parseInputs(bytes memory _callData)
        internal
        pure
        returns (Params memory inputData)
    {
        inputData = abi.decode(_callData, (Params));
    }
}
