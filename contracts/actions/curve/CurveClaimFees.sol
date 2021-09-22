// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "./helpers/CurveHelper.sol";
import "../../utils/TokenUtils.sol";

contract CurveClaimFees is ActionBase, CurveHelper {
    using TokenUtils for address;

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (address claimFor, address receiver) = parseInputs(_callData);
        claimFor = _parseParamAddr(claimFor, _paramMapping[0], _subData, _returnValues);
        receiver = _parseParamAddr(receiver, _paramMapping[1], _subData, _returnValues);

        uint256 claimed = _curveClaimFees(claimFor, receiver);
        return bytes32(claimed);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        (address claimFor, address receiver) = parseInputs(_callData);

        _curveClaimFees(claimFor, receiver);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /// @notice Claims 3Crv rewards from Fee Distributor
    /// @param _claimFor Address for which to claim fees
    /// @param _receiver Address that will receive the tokens
    /// @dev if _claimFor != msg.sender: msg.sender needs to approve DSProxy to pull 3Crv token
    function _curveClaimFees(address _claimFor, address _receiver) internal returns (uint256) {
        uint256 claimed = FeeDistributor.claim(_claimFor);

        if (_claimFor != _receiver) {
            CRV_3CRV_TOKEN_ADDR.pullTokensIfNeeded(_claimFor, claimed);
            CRV_3CRV_TOKEN_ADDR.withdrawTokens(_receiver, claimed);
        }

        logger.Log(
            address(this),
            msg.sender,
            "CurveClaimFees",
            abi.encode(
                _claimFor,
                _receiver,
                claimed
            )
        );

        return claimed;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (address claimFor, address receiver) {
        claimFor = abi.decode(_callData[0], (address));
        receiver = abi.decode(_callData[1], (address));
    }
}