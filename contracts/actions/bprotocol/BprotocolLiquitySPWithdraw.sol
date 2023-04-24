// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/bprotocol/IBAMM.sol";
import "../ActionBase.sol";
import "./helpers/BprotocolLiquitySPHelper.sol";
import "../../utils/TokenUtils.sol";


contract BprotocolLiquitySPWithdraw is ActionBase, BprotocolLiquitySPHelper {
    using TokenUtils for address;

    struct Params {
        address to;
        address lqtyTo;
        uint256 amount;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.to = _parseParamAddr(params.to, _paramMapping[0], _subData, _returnValues);
        params.lqtyTo = _parseParamAddr(params.lqtyTo, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);

        (uint256 deposited, bytes memory logData) = _withdraw(params);
        emit ActionEvent('BprotocolLiquitySPWithdraw', logData);
        return bytes32(deposited);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _withdraw(params);
        logger.logActionDirectEvent('BprotocolLiquitySPWithdraw', logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _withdraw(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.amount == type(uint256).max)
            _params.amount = BAMM_ADDRESS.getBalance(address(this));

        uint256 ethBefore = address(this).balance;
        uint256 lusdBefore = LUSD_TOKEN_ADDRESS.getBalance(address(this));
        uint256 lqtyBefore = LQTY_TOKEN_ADDRESS.getBalance(address(this));
        IBAMM(BAMM_ADDRESS).withdraw(_params.amount);

        uint256 ethReturned = address(this).balance - ethBefore;
        uint256 lusdReturned = LUSD_TOKEN_ADDRESS.getBalance(address(this)) - lusdBefore;
        uint256 lqtyRewarded = LQTY_TOKEN_ADDRESS.getBalance(address(this)) - lqtyBefore;

        TokenUtils.depositWeth(ethReturned);
        TokenUtils.WETH_ADDR.withdrawTokens(_params.to, ethReturned);
        LUSD_TOKEN_ADDRESS.withdrawTokens(_params.to, lusdReturned);
        LQTY_TOKEN_ADDRESS.withdrawTokens(_params.lqtyTo, lqtyRewarded);

        return (
            lusdReturned,
            abi.encode(_params, lusdReturned, ethReturned, lqtyRewarded)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory _params) {
        _params = abi.decode(_callData, (Params));
    }
}