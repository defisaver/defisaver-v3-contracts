// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/bprotocol/IBAMM.sol";
import "../ActionBase.sol";
import "./helpers/BprotocolLiquitySPHelper.sol";
import "../../utils/TokenUtils.sol";


/// @title BprotocolLiquitySPDeposit - Action that deposits LUSD into Bprotocol
/// @dev LQTY rewards accrue over time and are paid out each time the user interacts with the protocol
/// @dev Deposit amount must be greater than zero, for LQTY only claim use BprotocolLiquitySPWithdraw
contract BprotocolLiquitySPDeposit is ActionBase, BprotocolLiquitySPHelper {
    using TokenUtils for address;

    /// @param lusdAmount Amount of LUSD to deposit into Bprotocol
    /// @param from Address from where the LUSD is being pulled
    /// @param lqtyTo Address that will recieve LQTY rewards
    struct Params {
        uint256 lusdAmount;
        address from;
        address lqtyTo;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.lusdAmount = _parseParamUint(params.lusdAmount, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.lqtyTo = _parseParamAddr(params.lqtyTo, _paramMapping[2], _subData, _returnValues);

        (uint256 deposited, bytes memory logData) = _deposit(params);
        emit ActionEvent('BprotocolLiquitySPDeposit', logData);
        return bytes32(deposited);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _deposit(params);
        logger.logActionDirectEvent('BprotocolLiquitySPDeposit', logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _deposit(Params memory _params) internal returns (uint256, bytes memory) {
        _params.lusdAmount = LUSD_TOKEN_ADDRESS.pullTokensIfNeeded(_params.from, _params.lusdAmount);

        uint256 sharesBefore = BAMM_ADDRESS.getBalance(address(this));
        uint256 lqtyBefore = LQTY_TOKEN_ADDRESS.getBalance(address(this));

        LUSD_TOKEN_ADDRESS.approveToken(BAMM_ADDRESS, _params.lusdAmount);
        IBAMM(BAMM_ADDRESS).deposit(_params.lusdAmount);

        uint256 sharesMinted = BAMM_ADDRESS.getBalance(address(this)) - sharesBefore;
        uint256 lqtyRewarded = LQTY_TOKEN_ADDRESS.getBalance(address(this)) - lqtyBefore;

        LQTY_TOKEN_ADDRESS.withdrawTokens(_params.lqtyTo, lqtyRewarded);

        return (
            sharesMinted,
            abi.encode(_params, sharesMinted, lqtyRewarded)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory _params) {
        _params = abi.decode(_callData, (Params));
    }
}