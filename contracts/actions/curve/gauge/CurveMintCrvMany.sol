// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../ActionBase.sol";
import "../helpers/CurveHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../../utils/SafeMath.sol";

contract CurveMintCrvMany is ActionBase, CurveHelper {
    using TokenUtils for address;
    using SafeMath for uint256;
    
    struct Params {
        address[8] gaugeAddrs;  // array of gauges determining Crv issuance
        address receiver;       // address that will receive the Crv issuance
    }

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.receiver = _parseParamAddr(params.receiver, _paramMapping[0], _subData, _returnValues);
        
        uint256 minted = _curveMintCrvMany(params);
        return bytes32(minted);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        _curveMintCrvMany(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /// @notice Mints Crv tokens based on up to 8 gauges
    function _curveMintCrvMany(Params memory _params) internal returns (uint256) {
        require(_params.receiver != address(0), "receiver cant be 0x0");

        uint256 balanceBefore = CRV_TOKEN_ADDR.getBalance(address(this));
        Minter.mint_many(_params.gaugeAddrs);
        uint256 minted = CRV_TOKEN_ADDR.getBalance(address(this)).sub(balanceBefore);

        CRV_TOKEN_ADDR.withdrawTokens(_params.receiver, minted);

        logger.Log(
            address(this),
            msg.sender,
            "CurveMintCrvMany",
            abi.encode(
                _params,
                minted
                )
        );

        return minted;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData[0], (Params));
    }
}