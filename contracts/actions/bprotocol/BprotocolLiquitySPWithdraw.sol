// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/bprotocol/IBAMM.sol";
import "../ActionBase.sol";
import "./helpers/BprotocolLiquitySPHelper.sol";
import "../../utils/TokenUtils.sol";


/// @title BprotocolLiquitySPWithdraw - Action that withdraws LUSD from Bprotocol
/// @dev LQTY rewards accrue over time and are paid out each time the user interacts with the protocol
/// @dev Idealy the WETH returned amount will be zero (shares paid out in LUSD in full) but depends on the protocol usage
/// @dev Withdraw amount can be set to zero, only LQTY reward will be claimed
contract BprotocolLiquitySPWithdraw is ActionBase, BprotocolLiquitySPHelper {
    using TokenUtils for address;

    /// @param shareAmount Amount of shares to burn
    /// @param to Address that will recieve the LUSD and WETH withdrawn
    /// @param lqtyTo Address that will recieve LQTY rewards
    struct Params {
        uint256 shareAmount;
        address to;
        address lqtyTo;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.shareAmount = _parseParamUint(params.shareAmount, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.lqtyTo = _parseParamAddr(params.lqtyTo, _paramMapping[2], _subData, _returnValues);

        (uint256 lusdWithdrawn, bytes memory logData) = _withdraw(params);
        emit ActionEvent("BprotocolLiquitySPWithdraw", logData);
        return bytes32(lusdWithdrawn);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _withdraw(params);
        logger.logActionDirectEvent("BprotocolLiquitySPWithdraw", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _withdraw(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.shareAmount == type(uint256).max)
            _params.shareAmount = BAMM_ADDRESS.getBalance(address(this));

        uint256 ethBefore = address(this).balance;
        uint256 lusdBefore = LUSD_TOKEN_ADDRESS.getBalance(address(this));
        uint256 lqtyBefore = LQTY_TOKEN_ADDRESS.getBalance(address(this));
        IBAMM(BAMM_ADDRESS).withdraw(_params.shareAmount);

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